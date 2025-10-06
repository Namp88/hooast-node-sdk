import { HoosatNode } from '../client/client';
import { HOOSAT_PARAMS } from '../constants/hoosat-params.conts';

/**
 * Fee priority levels
 */
export enum FeePriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Urgent = 'urgent',
}

/**
 * Fee estimation result
 */
export interface FeeEstimate {
  feeRate: number; // sompi per byte
  totalFee: string; // for given transaction size
  priority: FeePriority;
  percentile: number; // percentile in current mempool
  basedOnSamples: number; // number of mempool transactions analyzed
}

/**
 * Fee recommendations for all priority levels
 */
export interface FeeRecommendations {
  low: FeeEstimate;
  normal: FeeEstimate;
  high: FeeEstimate;
  urgent: FeeEstimate;
  mempoolSize: number;
  averageFeeRate: number;
  medianFeeRate: number;
  timestamp: number;
}

/**
 * Dynamic fee estimator based on current network conditions
 * Analyzes mempool to recommend optimal fee rates
 */
export class FeeEstimator {
  private _node: HoosatNode;
  private _cache: FeeRecommendations | null = null;
  private _cacheExpiry = 0;
  private _cacheDuration = 60000; // 1 minute cache

  constructor(node: HoosatNode) {
    this._node = node;
  }

  /**
   * Estimates recommended fee rate for a given priority level
   *
   * @param priority - Fee priority level
   * @param inputs - Number of transaction inputs
   * @param outputs - Number of transaction outputs
   * @param forceRefresh - Force mempool re-analysis (bypass cache)
   * @returns Fee estimate with recommended rate and total fee
   *
   * @example
   * const estimate = await feeEstimator.estimateFee('normal', 2, 2);
   * console.log(`Recommended fee rate: ${estimate.feeRate} sompi/byte`);
   * console.log(`Total fee: ${estimate.totalFee} sompi`);
   */
  async estimateFee(
    priority: FeePriority = FeePriority.Normal,
    inputs: number,
    outputs: number,
    forceRefresh = false
  ): Promise<FeeEstimate> {
    const recommendations = await this.getRecommendations(forceRefresh);

    const estimate = recommendations[priority];

    // Calculate total fee for this transaction size
    const txSize = 10 + inputs * 150 + outputs * 35;
    const calculatedFee = Math.max(txSize * estimate.feeRate, HOOSAT_PARAMS.MIN_FEE);

    return {
      ...estimate,
      totalFee: calculatedFee.toString(),
    };
  }

  /**
   * Gets fee recommendations for all priority levels
   * Results are cached for 1 minute to avoid excessive mempool queries
   *
   * @param forceRefresh - Force mempool re-analysis (bypass cache)
   * @returns Complete fee recommendations
   *
   * @example
   * const recommendations = await feeEstimator.getRecommendations();
   * console.log('Low priority:', recommendations.low.feeRate, 'sompi/byte');
   * console.log('Normal priority:', recommendations.normal.feeRate, 'sompi/byte');
   * console.log('High priority:', recommendations.high.feeRate, 'sompi/byte');
   */
  async getRecommendations(forceRefresh = false): Promise<FeeRecommendations> {
    const now = Date.now();

    // Return cached result if still valid
    if (!forceRefresh && this._cache && now < this._cacheExpiry) {
      return this._cache;
    }

    // Fetch mempool entries
    const mempoolResult = await this._node.getMempoolEntries(true, false);

    if (!mempoolResult.ok || !mempoolResult.result) {
      // Fallback to static rates if mempool unavailable
      return this._getFallbackRecommendations();
    }

    const entries = mempoolResult.result.entries;

    if (entries.length === 0) {
      // Empty mempool - use low fees
      return this._getEmptyMempoolRecommendations();
    }

    // If mempool has very few transactions (< 10), use conservative defaults
    if (entries.length < 10) {
      return this._getSmallMempoolRecommendations(entries.length);
    }

    // Calculate fee rates for all transactions
    const feeRates: number[] = [];

    for (const entry of entries) {
      if (entry.isOrphan) continue; // Skip orphan transactions

      const fee = BigInt(entry.fee || '0');
      const mass = BigInt(entry.mass || '1'); // Avoid division by zero

      if (fee > 0n && mass > 0n) {
        // Mass in Kaspa/Hoosat correlates with computational cost
        // Typically: mass ≈ transaction_size_bytes * 10
        // So fee_per_byte ≈ fee / (mass / 10)
        const estimatedSizeBytes = Number(mass) / 10;
        const feeRate = Number(fee) / estimatedSizeBytes;

        // Only include reasonable fee rates (1-100 sompi/byte)
        // This filters out anomalies and errors
        if (feeRate >= 1 && feeRate <= 100) {
          feeRates.push(Math.ceil(feeRate));
        }
      }
    }

    // If no valid fee rates found, use fallback
    if (feeRates.length === 0) {
      return this._getFallbackRecommendations();
    }

    // Remove outliers using IQR method
    const filteredRates = this._removeOutliers(feeRates);

    // If filtering removed all values, use original
    const finalRates = filteredRates.length > 0 ? filteredRates : feeRates;

    // Sort fee rates for percentile calculation
    finalRates.sort((a, b) => a - b);

    // Calculate percentiles
    const getPercentile = (p: number): number => {
      const index = Math.ceil((finalRates.length * p) / 100) - 1;
      return Math.max(finalRates[Math.max(0, index)], 1);
    };

    const p25 = getPercentile(25); // Low priority (25th percentile)
    const p50 = getPercentile(50); // Normal priority (median)
    const p75 = getPercentile(75); // High priority (75th percentile)
    const p90 = getPercentile(90); // Urgent priority (90th percentile)

    // Calculate average fee rate
    const sum = finalRates.reduce((acc, rate) => acc + rate, 0);
    const avg = Math.ceil(sum / finalRates.length);

    // Ensure reasonable bounds (1-50 sompi/byte for safety)
    const ensureBounds = (rate: number) => Math.min(Math.max(rate, 1), 50);

    const recommendations: FeeRecommendations = {
      low: {
        feeRate: ensureBounds(p25),
        totalFee: '0', // Will be calculated per transaction
        priority: FeePriority.Low,
        percentile: 25,
        basedOnSamples: finalRates.length,
      },
      normal: {
        feeRate: ensureBounds(p50),
        totalFee: '0',
        priority: FeePriority.Normal,
        percentile: 50,
        basedOnSamples: finalRates.length,
      },
      high: {
        feeRate: ensureBounds(p75),
        totalFee: '0',
        priority: FeePriority.High,
        percentile: 75,
        basedOnSamples: finalRates.length,
      },
      urgent: {
        feeRate: ensureBounds(p90),
        totalFee: '0',
        priority: FeePriority.Urgent,
        percentile: 90,
        basedOnSamples: finalRates.length,
      },
      mempoolSize: entries.length,
      averageFeeRate: Math.min(avg, 50),
      medianFeeRate: ensureBounds(p50),
      timestamp: now,
    };

    // Cache results
    this._cache = recommendations;
    this._cacheExpiry = now + this._cacheDuration;

    return recommendations;
  }

  /**
   * Clears the fee recommendations cache
   * Next call to getRecommendations() will fetch fresh data
   */
  clearCache(): void {
    this._cache = null;
    this._cacheExpiry = 0;
  }

  /**
   * Sets cache duration in milliseconds
   * @param duration - Cache duration in milliseconds (default: 60000)
   */
  setCacheDuration(duration: number): void {
    this._cacheDuration = duration;
  }

  /**
   * Returns fallback recommendations when mempool is unavailable
   * @private
   */
  private _getFallbackRecommendations(): FeeRecommendations {
    const now = Date.now();

    return {
      low: {
        feeRate: 1,
        totalFee: '0',
        priority: FeePriority.Low,
        percentile: 0,
        basedOnSamples: 0,
      },
      normal: {
        feeRate: 2,
        totalFee: '0',
        priority: FeePriority.Normal,
        percentile: 0,
        basedOnSamples: 0,
      },
      high: {
        feeRate: 5,
        totalFee: '0',
        priority: FeePriority.High,
        percentile: 0,
        basedOnSamples: 0,
      },
      urgent: {
        feeRate: 10,
        totalFee: '0',
        priority: FeePriority.Urgent,
        percentile: 0,
        basedOnSamples: 0,
      },
      mempoolSize: 0,
      averageFeeRate: 2,
      medianFeeRate: 2,
      timestamp: now,
    };
  }

  /**
   * Returns recommendations for empty mempool (low network activity)
   * @private
   */
  private _getEmptyMempoolRecommendations(): FeeRecommendations {
    const now = Date.now();

    return {
      low: {
        feeRate: 1,
        totalFee: '0',
        priority: FeePriority.Low,
        percentile: 0,
        basedOnSamples: 0,
      },
      normal: {
        feeRate: 1,
        totalFee: '0',
        priority: FeePriority.Normal,
        percentile: 0,
        basedOnSamples: 0,
      },
      high: {
        feeRate: 2,
        totalFee: '0',
        priority: FeePriority.High,
        percentile: 0,
        basedOnSamples: 0,
      },
      urgent: {
        feeRate: 3,
        totalFee: '0',
        priority: FeePriority.Urgent,
        percentile: 0,
        basedOnSamples: 0,
      },
      mempoolSize: 0,
      averageFeeRate: 1,
      medianFeeRate: 1,
      timestamp: now,
    };
  }

  /**
   * Returns conservative recommendations for small mempool (< 10 transactions)
   * @private
   */
  private _getSmallMempoolRecommendations(mempoolSize: number): FeeRecommendations {
    const now = Date.now();

    return {
      low: {
        feeRate: 1,
        totalFee: '0',
        priority: FeePriority.Low,
        percentile: 0,
        basedOnSamples: mempoolSize,
      },
      normal: {
        feeRate: 2,
        totalFee: '0',
        priority: FeePriority.Normal,
        percentile: 0,
        basedOnSamples: mempoolSize,
      },
      high: {
        feeRate: 5,
        totalFee: '0',
        priority: FeePriority.High,
        percentile: 0,
        basedOnSamples: mempoolSize,
      },
      urgent: {
        feeRate: 10,
        totalFee: '0',
        priority: FeePriority.Urgent,
        percentile: 0,
        basedOnSamples: mempoolSize,
      },
      mempoolSize: mempoolSize,
      averageFeeRate: 2,
      medianFeeRate: 2,
      timestamp: now,
    };
  }

  /**
   * Removes outliers from fee rates using IQR (Interquartile Range) method
   * @private
   */
  private _removeOutliers(values: number[]): number[] {
    if (values.length < 4) {
      return values; // Not enough data for outlier detection
    }

    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q3Index = Math.floor(sorted.length * 0.75);

    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return values.filter(v => v >= lowerBound && v <= upperBound);
  }
}
