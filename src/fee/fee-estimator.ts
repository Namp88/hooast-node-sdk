import { HoosatClient } from '@client/client';
import { HoosatCrypto } from '@crypto/crypto';
import { FeeEstimate, FeeEstimatorConfig, FeePriority, FeeRecommendations } from './fee-estimator.types';

/** Default cache duration (1 minute) */
const DEFAULT_CACHE_DURATION = 60000;

/** Fee rate bounds (sompi/gram) */
const FEE_BOUNDS = {
  MIN: 1,
  MAX: 50,
} as const;

/**
 * Dynamic fee estimator based on current network conditions
 *
 * HoosatFeeEstimator analyzes the mempool to provide intelligent fee rate recommendations
 * for different priority levels. It uses percentile-based analysis to suggest fees that
 * give transactions a high probability of confirmation at their priority level.
 *
 * **Important:** This class provides fee RATE recommendations (sompi/gram).
 * Actual fee calculation uses mass-based formula via `HoosatCrypto.calculateFee()`:
 * `fee = totalMass × feeRate`
 *
 * **Features:**
 * - Real-time mempool analysis with percentile-based recommendations
 * - Smart caching (1 minute default) to reduce node queries
 * - Outlier removal using IQR method for accurate estimates
 * - Fallback strategies for edge cases (empty mempool, unavailable node)
 * - Four priority levels: Low, Normal, High, Urgent
 *
 * @example
 * ```typescript
 * const estimator = new HoosatFeeEstimator(node, { debug: true });
 *
 * // Get recommendations for all priority levels
 * const recommendations = await estimator.getRecommendations();
 * console.log('Normal priority:', recommendations.normal.feeRate, 'sompi/gram');
 * console.log('Mempool size:', recommendations.mempoolSize, 'transactions');
 *
 * // Estimate fee for specific transaction
 * const estimate = await estimator.estimateFee(FeePriority.Normal, 2, 2);
 * console.log('Total fee:', estimate.totalFee, 'sompi');
 * ```
 */
export class HoosatFeeEstimator {
  private readonly _node: HoosatClient;
  private readonly _debug: boolean;

  private _cacheDuration: number;
  private _cache: FeeRecommendations | null = null;
  private _cacheExpiry = 0;

  constructor(node: HoosatClient, config: FeeEstimatorConfig = {}) {
    this._node = node;
    this._cacheDuration = config.cacheDuration ?? DEFAULT_CACHE_DURATION;
    this._debug = config.debug ?? false;
  }

  /**
   * Estimates fee for a transaction using mass-based calculation
   */
  async estimateFee(
    priority: FeePriority = FeePriority.Normal,
    inputs: number,
    outputs: number,
    forceRefresh = false
  ): Promise<FeeEstimate> {
    const recommendations = await this.getRecommendations(forceRefresh);
    const estimate = recommendations[priority];

    const totalFee = HoosatCrypto.calculateFee(inputs, outputs, estimate.feeRate);

    return {
      ...estimate,
      totalFee,
    };
  }

  /**
   * Gets fee recommendations for all priority levels
   *
   * Analyzes the mempool to provide fee rate recommendations for Low, Normal, High,
   * and Urgent priorities. Results are cached for 1 minute (configurable) to avoid
   * excessive mempool queries.
   *
   * **Algorithm:**
   * 1. Fetch mempool transactions from node
   * 2. Calculate fee rate for each transaction: feeRate = fee / mass
   * 3. Remove outliers using IQR method
   * 4. Calculate percentiles: 25th (Low), 50th (Normal), 75th (High), 90th (Urgent)
   * 5. Apply safety bounds (1-50 sompi/gram)
   */
  async getRecommendations(forceRefresh = false): Promise<FeeRecommendations> {
    const now = Date.now();

    // Return cached result if still valid
    if (!forceRefresh && this._cache && now < this._cacheExpiry) {
      this._log('Using cached fee recommendations');
      return this._cache;
    }

    this._log('Fetching fresh fee recommendations from mempool');

    // Fetch mempool entries
    const mempoolResult = await this._node.getMempoolEntries(true, false);

    if (!mempoolResult.ok || !mempoolResult.result) {
      this._log('Mempool unavailable, using fallback recommendations');
      return this._getFallbackRecommendations();
    }

    const entries = mempoolResult.result.entries;

    if (entries.length === 0) {
      this._log('Empty mempool, using low fee recommendations');
      return this._getEmptyMempoolRecommendations();
    }

    if (entries.length < 10) {
      this._log(`Small mempool (${entries.length} txs), using conservative recommendations`);
      return this._getSmallMempoolRecommendations(entries.length);
    }

    // Calculate fee rates for all transactions
    const feeRates: number[] = [];

    for (const entry of entries) {
      if (entry.isOrphan) continue;

      const fee = BigInt(entry.fee || '0');
      const mass = BigInt(entry.mass || '1');

      if (fee > 0n && mass > 0n) {
        // Fee rate = fee / mass (in sompi/gram)
        const feeRate = Number(fee) / Number(mass);

        // Filter reasonable fee rates (0.5-100 sompi/gram)
        if (feeRate >= 0.5 && feeRate <= 100) {
          feeRates.push(feeRate);
        }
      }
    }

    if (feeRates.length === 0) {
      this._log('No valid fee rates found, using fallback');
      return this._getFallbackRecommendations();
    }

    // Remove outliers using IQR method
    const filteredRates = this._removeOutliers(feeRates);
    const finalRates = filteredRates.length > 0 ? filteredRates : feeRates;

    // Sort for percentile calculation
    finalRates.sort((a, b) => a - b);

    this._log(`Analyzed ${entries.length} mempool txs, using ${finalRates.length} valid rates`);

    // Calculate percentiles
    const getPercentile = (p: number): number => {
      const index = Math.ceil((finalRates.length * p) / 100) - 1;
      return Math.max(finalRates[Math.max(0, index)], 1);
    };

    const p25 = getPercentile(25);
    const p50 = getPercentile(50);
    const p75 = getPercentile(75);
    const p90 = getPercentile(90);

    // Calculate statistics
    const sum = finalRates.reduce((acc, rate) => acc + rate, 0);
    const avg = sum / finalRates.length;

    // Apply safety bounds
    const ensureBounds = (rate: number) => Math.min(Math.max(Math.ceil(rate), FEE_BOUNDS.MIN), FEE_BOUNDS.MAX);

    const recommendations: FeeRecommendations = {
      low: {
        feeRate: ensureBounds(p25),
        totalFee: '0',
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
      averageFeeRate: Math.min(Math.ceil(avg), FEE_BOUNDS.MAX),
      medianFeeRate: ensureBounds(p50),
      timestamp: now,
    };

    this._log(
      `Recommendations: Low=${recommendations.low.feeRate}, Normal=${recommendations.normal.feeRate}, High=${recommendations.high.feeRate}, Urgent=${recommendations.urgent.feeRate}`
    );

    // Cache results
    this._cache = recommendations;
    this._cacheExpiry = now + this._cacheDuration;

    return recommendations;
  }

  /**
   * Clears the fee recommendations cache
   */
  clearCache(): void {
    this._cache = null;
    this._cacheExpiry = 0;
    this._log('Fee recommendations cache cleared');
  }

  /**
   * Sets the cache duration
   */
  setCacheDuration(duration: number): void {
    this._cacheDuration = duration;
    this._log(`Cache duration set to ${duration}ms`);
  }

  // ==================== PRIVATE METHODS ====================

  /** Returns fallback recommendations when mempool is unavailable */
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

  /** Returns recommendations for empty mempool (low network activity) */
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

  /** Returns conservative recommendations for small mempool (< 10 transactions) */
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

  /** Removes outliers from fee rates using IQR (Interquartile Range) method */
  private _removeOutliers(values: number[]): number[] {
    if (values.length < 4) {
      return values;
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

  /** Logs message if debug mode is enabled */
  private _log(message: string): void {
    if (this._debug) {
      console.log(`[HoosatFeeEstimator] ${message}`);
    }
  }
}
