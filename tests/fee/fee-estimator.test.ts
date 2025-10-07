import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HoosatFeeEstimator } from '@fee/fee-estimator';
import { FeePriority } from '@fee/fee-estimator.types';

// Mock HoosatNode with proper typing
const createMockNode = () => {
  const getMempoolEntries = vi.fn();
  const disconnect = vi.fn();

  return {
    getMempoolEntries,
    disconnect,
  };
};

// Helper to create mock mempool entries
const createMockMempoolEntry = (fee: string, mass: string) => ({
  transaction: {
    transactionId: 'a'.repeat(64),
    inputs: [],
    outputs: [],
    version: 0,
    lockTime: '0',
    subnetworkId: '0000000000000000000000000000000000000000',
  },
  fee,
  mass,
  isOrphan: false,
});

describe('HoosatFeeEstimator', () => {
  let mockNode: ReturnType<typeof createMockNode>;
  let estimator: HoosatFeeEstimator;

  beforeEach(() => {
    mockNode = createMockNode();
    estimator = new HoosatFeeEstimator(mockNode as any);
  });

  describe('Constructor', () => {
    it('should create instance with default config', () => {
      expect(estimator).toBeInstanceOf(HoosatFeeEstimator);
    });

    it('should accept custom cache duration', () => {
      const customEstimator = new HoosatFeeEstimator(mockNode as any, {
        cacheDuration: 30000,
      });
      expect(customEstimator).toBeInstanceOf(HoosatFeeEstimator);
    });

    it('should accept debug flag', () => {
      const debugEstimator = new HoosatFeeEstimator(mockNode as any, {
        debug: true,
      });
      expect(debugEstimator).toBeInstanceOf(HoosatFeeEstimator);
    });
  });

  describe('getRecommendations() - Empty Mempool', () => {
    beforeEach(() => {
      mockNode.getMempoolEntries.mockResolvedValue({
        ok: true,
        result: { entries: [] },
      });
    });

    it('should return recommendations for empty mempool', async () => {
      const recommendations = await estimator.getRecommendations();

      expect(recommendations).toHaveProperty('low');
      expect(recommendations).toHaveProperty('normal');
      expect(recommendations).toHaveProperty('high');
      expect(recommendations).toHaveProperty('urgent');
      expect(recommendations.mempoolSize).toBe(0);
    });

    it('should use conservative rates for empty mempool', async () => {
      const recommendations = await estimator.getRecommendations();

      expect(recommendations.low.feeRate).toBe(1);
      expect(recommendations.normal.feeRate).toBe(1);
      expect(recommendations.high.feeRate).toBe(2);
      expect(recommendations.urgent.feeRate).toBe(3);
    });

    it('should set basedOnSamples to 0 for empty mempool', async () => {
      const recommendations = await estimator.getRecommendations();

      expect(recommendations.low.basedOnSamples).toBe(0);
      expect(recommendations.normal.basedOnSamples).toBe(0);
    });

    it('should include timestamp', async () => {
      const before = Date.now();
      const recommendations = await estimator.getRecommendations();
      const after = Date.now();

      expect(recommendations.timestamp).toBeGreaterThanOrEqual(before);
      expect(recommendations.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('getRecommendations() - Small Mempool', () => {
    beforeEach(() => {
      // 5 transactions (< 10 = small mempool)
      const entries = Array(5)
        .fill(null)
        .map(() => createMockMempoolEntry('5000', '1000'));

      mockNode.getMempoolEntries.mockResolvedValue({
        ok: true,
        result: { entries },
      });
    });

    it('should return conservative rates for small mempool', async () => {
      const recommendations = await estimator.getRecommendations();

      expect(recommendations.mempoolSize).toBe(5);
      expect(recommendations.low.feeRate).toBe(1);
      expect(recommendations.normal.feeRate).toBe(2);
      expect(recommendations.high.feeRate).toBe(5);
      expect(recommendations.urgent.feeRate).toBe(10);
    });

    it('should set basedOnSamples correctly', async () => {
      const recommendations = await estimator.getRecommendations();

      expect(recommendations.low.basedOnSamples).toBe(5);
      expect(recommendations.normal.basedOnSamples).toBe(5);
    });
  });

  describe('getRecommendations() - Active Mempool', () => {
    beforeEach(() => {
      // 20 transactions with varying fee rates
      const entries = [
        // Low fee transactions (1 sompi/byte)
        ...Array(5)
          .fill(null)
          .map(() => createMockMempoolEntry('1000', '1000')),
        // Normal fee transactions (5 sompi/byte)
        ...Array(8)
          .fill(null)
          .map(() => createMockMempoolEntry('5000', '1000')),
        // High fee transactions (10 sompi/byte)
        ...Array(5)
          .fill(null)
          .map(() => createMockMempoolEntry('10000', '1000')),
        // Urgent fee transactions (20 sompi/byte)
        ...Array(2)
          .fill(null)
          .map(() => createMockMempoolEntry('20000', '1000')),
      ];

      mockNode.getMempoolEntries.mockResolvedValue({
        ok: true,
        result: { entries },
      });
    });

    it('should calculate percentile-based recommendations', async () => {
      const recommendations = await estimator.getRecommendations();

      expect(recommendations.mempoolSize).toBe(20);
      expect(recommendations.low.feeRate).toBeGreaterThan(0);
      expect(recommendations.normal.feeRate).toBeGreaterThanOrEqual(recommendations.low.feeRate);
      expect(recommendations.high.feeRate).toBeGreaterThanOrEqual(recommendations.normal.feeRate);
      expect(recommendations.urgent.feeRate).toBeGreaterThanOrEqual(recommendations.high.feeRate);
    });

    it('should set correct percentiles', async () => {
      const recommendations = await estimator.getRecommendations();

      expect(recommendations.low.percentile).toBe(25);
      expect(recommendations.normal.percentile).toBe(50);
      expect(recommendations.high.percentile).toBe(75);
      expect(recommendations.urgent.percentile).toBe(90);
    });

    it('should include priority levels', async () => {
      const recommendations = await estimator.getRecommendations();

      expect(recommendations.low.priority).toBe(FeePriority.Low);
      expect(recommendations.normal.priority).toBe(FeePriority.Normal);
      expect(recommendations.high.priority).toBe(FeePriority.High);
      expect(recommendations.urgent.priority).toBe(FeePriority.Urgent);
    });

    it('should calculate average and median fee rates', async () => {
      const recommendations = await estimator.getRecommendations();

      expect(recommendations.averageFeeRate).toBeGreaterThan(0);
      expect(recommendations.medianFeeRate).toBeGreaterThan(0);
    });

    it('should respect fee rate bounds (1-50 sompi/byte)', async () => {
      const recommendations = await estimator.getRecommendations();

      expect(recommendations.low.feeRate).toBeGreaterThanOrEqual(1);
      expect(recommendations.urgent.feeRate).toBeLessThanOrEqual(50);
    });
  });

  describe('getRecommendations() - Caching', () => {
    beforeEach(() => {
      mockNode.getMempoolEntries.mockResolvedValue({
        ok: true,
        result: { entries: [] },
      });
    });

    it('should use cache for subsequent calls', async () => {
      const first = await estimator.getRecommendations();
      const second = await estimator.getRecommendations();

      // Should return same cached result
      expect(first.timestamp).toBe(second.timestamp);
    });

    it('should force refresh when requested', async () => {
      await estimator.getRecommendations();
      const callCountBefore = mockNode.getMempoolEntries.mock.calls.length;

      await estimator.getRecommendations(true); // Force refresh

      const callCountAfter = mockNode.getMempoolEntries.mock.calls.length;
      expect(callCountAfter).toBeGreaterThan(callCountBefore);
    });

    it('should have different timestamps after force refresh', async () => {
      const first = await estimator.getRecommendations();

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const second = await estimator.getRecommendations(true);

      expect(first.timestamp).not.toBe(second.timestamp);
    });
  });

  describe('getRecommendations() - Fallback', () => {
    beforeEach(() => {
      mockNode.getMempoolEntries.mockResolvedValue({
        ok: false,
        error: { message: 'Node unavailable' },
      });
    });

    it('should return fallback recommendations on node error', async () => {
      const recommendations = await estimator.getRecommendations();

      expect(recommendations).toHaveProperty('low');
      expect(recommendations).toHaveProperty('normal');
      expect(recommendations.mempoolSize).toBe(0);
    });

    it('should use fallback fee rates', async () => {
      const recommendations = await estimator.getRecommendations();

      expect(recommendations.low.feeRate).toBe(1);
      expect(recommendations.normal.feeRate).toBe(2);
      expect(recommendations.high.feeRate).toBe(5);
      expect(recommendations.urgent.feeRate).toBe(10);
    });
  });

  describe('estimateFee()', () => {
    beforeEach(() => {
      // Mock mempool with known fee rates
      const entries = Array(20)
        .fill(null)
        .map(() => createMockMempoolEntry('5000', '1000'));

      mockNode.getMempoolEntries.mockResolvedValue({
        ok: true,
        result: { entries },
      });
    });

    it('should estimate fee for transaction', async () => {
      const estimate = await estimator.estimateFee(FeePriority.Normal, 2, 2);

      expect(estimate).toHaveProperty('feeRate');
      expect(estimate).toHaveProperty('totalFee');
      expect(estimate.feeRate).toBeGreaterThan(0);
      expect(parseInt(estimate.totalFee)).toBeGreaterThan(0);
    });

    it('should use correct priority', async () => {
      const estimate = await estimator.estimateFee(FeePriority.High, 1, 2);

      expect(estimate.priority).toBe(FeePriority.High);
    });

    it('should default to Normal priority', async () => {
      const estimate = await estimator.estimateFee(undefined as any, 1, 2);

      expect(estimate.priority).toBe(FeePriority.Normal);
    });

    it('should calculate higher fees for more inputs', async () => {
      const estimate1Input = await estimator.estimateFee(FeePriority.Normal, 1, 2);
      const estimate5Inputs = await estimator.estimateFee(FeePriority.Normal, 5, 2);

      expect(parseInt(estimate5Inputs.totalFee)).toBeGreaterThan(parseInt(estimate1Input.totalFee));
    });

    it('should calculate higher fees for more outputs', async () => {
      const estimate2Outputs = await estimator.estimateFee(FeePriority.Normal, 1, 2);
      const estimate5Outputs = await estimator.estimateFee(FeePriority.Normal, 1, 5);

      expect(parseInt(estimate5Outputs.totalFee)).toBeGreaterThan(parseInt(estimate2Outputs.totalFee));
    });

    it('should respect forceRefresh parameter', async () => {
      const callCountBefore = mockNode.getMempoolEntries.mock.calls.length;

      await estimator.estimateFee(FeePriority.Normal, 1, 2);
      await estimator.estimateFee(FeePriority.Normal, 1, 2, true); // Force refresh

      const callCountAfter = mockNode.getMempoolEntries.mock.calls.length;
      expect(callCountAfter).toBeGreaterThan(callCountBefore);
    });

    it('should return totalFee as string', async () => {
      const estimate = await estimator.estimateFee(FeePriority.Normal, 2, 2);

      expect(typeof estimate.totalFee).toBe('string');
      expect(/^\d+$/.test(estimate.totalFee)).toBe(true);
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      mockNode.getMempoolEntries.mockResolvedValue({
        ok: true,
        result: { entries: [] },
      });
    });

    it('should clear cache', async () => {
      const first = await estimator.getRecommendations();
      estimator.clearCache();

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));

      const second = await estimator.getRecommendations();

      // After clearing cache, should get new timestamp
      expect(first.timestamp).not.toBe(second.timestamp);
    });

    it('should allow setting cache duration', () => {
      expect(() => estimator.setCacheDuration(30000)).not.toThrow();
    });

    it('should accept cache duration of 0', () => {
      expect(() => estimator.setCacheDuration(0)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle mempool with outliers', async () => {
      const entries = [
        // Normal transactions
        ...Array(18)
          .fill(null)
          .map(() => createMockMempoolEntry('5000', '1000')),
        // Outlier: extremely high fee
        createMockMempoolEntry('1000000', '1000'),
        // Outlier: extremely low fee
        createMockMempoolEntry('1', '1000'),
      ];

      mockNode.getMempoolEntries.mockResolvedValue({
        ok: true,
        result: { entries },
      });

      const recommendations = await estimator.getRecommendations();

      // Should still return reasonable recommendations despite outliers
      expect(recommendations.normal.feeRate).toBeLessThan(100);
      expect(recommendations.normal.feeRate).toBeGreaterThan(0);
    });

    it('should handle invalid mass values gracefully', async () => {
      const entries = [createMockMempoolEntry('5000', '0')]; // Invalid: mass = 0

      mockNode.getMempoolEntries.mockResolvedValue({
        ok: true,
        result: { entries },
      });

      const recommendations = await estimator.getRecommendations();

      // Should fall back to small mempool recommendations
      expect(recommendations.mempoolSize).toBe(1);
    });

    it('should handle negative fee values', async () => {
      const entries = [createMockMempoolEntry('-1000', '1000')]; // Invalid: negative fee

      mockNode.getMempoolEntries.mockResolvedValue({
        ok: true,
        result: { entries },
      });

      const recommendations = await estimator.getRecommendations();

      // Should handle gracefully
      expect(recommendations).toHaveProperty('normal');
    });
  });

  describe('Fee Rate Calculation', () => {
    it('should calculate fee rate as (fee / (mass/10))', async () => {
      // fee = 10000 sompi, mass = 2000 → feeRate = 10000 / (2000/10) = 50 sompi/byte
      const entries = [createMockMempoolEntry('10000', '2000')];

      mockNode.getMempoolEntries.mockResolvedValue({
        ok: true,
        result: { entries },
      });

      const recommendations = await estimator.getRecommendations();

      // With single transaction, all percentiles should be same
      // Fee rate should be capped at max = 50
      expect(recommendations.normal.feeRate).toBeLessThanOrEqual(50);
    });
  });
});
