/**
 * Fee priority levels for transaction confirmation
 *
 * @example
 * ```typescript
 * const estimate = await feeEstimator.estimateFee(FeePriority.Normal, 2, 2);
 * ```
 */
export enum FeePriority {
  /** Low priority - cheapest, slower confirmation (25th percentile) */
  Low = 'low',

  /** Normal priority - balanced cost and speed (50th percentile / median) */
  Normal = 'normal',

  /** High priority - faster confirmation, higher cost (75th percentile) */
  High = 'high',

  /** Urgent priority - fastest confirmation, highest cost (90th percentile) */
  Urgent = 'urgent',
}

/**
 * Fee estimation result for a specific transaction
 *
 * @example
 * ```typescript
 * const estimate: FeeEstimate = await feeEstimator.estimateFee(
 *   FeePriority.Normal,
 *   2, // inputs
 *   2  // outputs
 * );
 *
 * console.log('Fee rate:', estimate.feeRate, 'sompi/byte');
 * console.log('Total fee:', estimate.totalFee, 'sompi');
 * console.log('Based on', estimate.basedOnSamples, 'mempool transactions');
 * ```
 */
export interface FeeEstimate {
  /** Fee rate in sompi per byte */
  feeRate: number;

  /** Total fee for the transaction in sompi */
  totalFee: string;

  /** Priority level used for this estimate */
  priority: FeePriority;

  /** Percentile in current mempool (0-100) */
  percentile: number;

  /** Number of mempool transactions analyzed */
  basedOnSamples: number;
}

/**
 * Complete fee recommendations for all priority levels
 *
 * Provides network-wide fee statistics and recommendations for each priority level.
 * Results are cached for 1 minute to avoid excessive mempool queries.
 *
 * @example
 * ```typescript
 * const recommendations: FeeRecommendations = await feeEstimator.getRecommendations();
 *
 * console.log('Network status:');
 * console.log('  Mempool size:', recommendations.mempoolSize, 'transactions');
 * console.log('  Average fee rate:', recommendations.averageFeeRate, 'sompi/byte');
 * console.log('  Median fee rate:', recommendations.medianFeeRate, 'sompi/byte');
 *
 * console.log('\nFee recommendations:');
 * console.log('  Low:', recommendations.low.feeRate, 'sompi/byte');
 * console.log('  Normal:', recommendations.normal.feeRate, 'sompi/byte');
 * console.log('  High:', recommendations.high.feeRate, 'sompi/byte');
 * console.log('  Urgent:', recommendations.urgent.feeRate, 'sompi/byte');
 * ```
 */
export interface FeeRecommendations {
  /** Low priority fee estimate */
  low: FeeEstimate;

  /** Normal priority fee estimate */
  normal: FeeEstimate;

  /** High priority fee estimate */
  high: FeeEstimate;

  /** Urgent priority fee estimate */
  urgent: FeeEstimate;

  /** Current number of transactions in mempool */
  mempoolSize: number;

  /** Average fee rate across all mempool transactions (sompi/byte) */
  averageFeeRate: number;

  /** Median fee rate in mempool (sompi/byte) */
  medianFeeRate: number;

  /** Timestamp when recommendations were generated (milliseconds) */
  timestamp: number;
}

/**
 * Configuration options for HoosatFeeEstimator
 *
 * @example
 * ```typescript
 * const config: FeeEstimatorConfig = {
 *   cacheDuration: 30000, // 30 seconds
 *   debug: true
 * };
 *
 * const estimator = new HoosatFeeEstimator(node, config);
 * ```
 */
export interface FeeEstimatorConfig {
  /** Cache duration in milliseconds (default: 60000 = 1 minute) */
  cacheDuration?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;
}
