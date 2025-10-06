/**
 * Example 06: Dynamic Fee Estimation from Network
 *
 * Learn how to:
 * - Analyze current mempool conditions
 * - Get dynamic fee recommendations
 * - Choose optimal fee rate based on priority
 * - Monitor network congestion
 *
 * This example shows how to estimate fees dynamically based on
 * current network activity, rather than using static rates.
 */
import { FeeEstimator, FeePriority, HoosatNode, HoosatUtils } from '../../src';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   📊 EXAMPLE 06: DYNAMIC FEE ESTIMATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== CONNECT TO NODE ====================
  console.log('1️⃣  Connecting to Node');
  console.log('═════════════════════════════════════');

  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
    timeout: 15000,
  });

  try {
    const info = await node.getInfo();
    if (!info.ok || !info.result) {
      throw new Error('Failed to connect to node');
    }

    console.log('✅ Connected successfully');
    console.log(`   Synced:  ${info.result.isSynced}\n`);
  } catch (error) {
    console.error('❌ Failed to connect:', error);
    process.exit(1);
  }

  // ==================== CREATE FEE ESTIMATOR ====================
  console.log('2️⃣  Initialize Fee Estimator');
  console.log('═════════════════════════════════════');

  const feeEstimator = new FeeEstimator(node);
  console.log('✅ Fee estimator created\n');

  // ==================== ANALYZE MEMPOOL ====================
  console.log('3️⃣  Analyze Current Mempool');
  console.log('═════════════════════════════════════');

  const recommendations = await feeEstimator.getRecommendations();

  console.log('Network Status:');
  console.log(`  Mempool Size:     ${recommendations.mempoolSize} transactions`);
  console.log(`  Analyzed Samples: ${recommendations.low.basedOnSamples}`);
  console.log(`  Average Fee Rate: ${recommendations.averageFeeRate} sompi/byte`);
  console.log(`  Median Fee Rate:  ${recommendations.medianFeeRate} sompi/byte`);
  console.log();

  if (recommendations.mempoolSize === 0) {
    console.log('ℹ️  Mempool is empty - network has low activity');
    console.log('   Using minimal fees (1 sompi/byte) for fast confirmation\n');
  } else if (recommendations.mempoolSize < 10) {
    console.log('⚠️  Mempool has very few transactions (< 10)');
    console.log('   Using conservative fallback rates to avoid anomalies');
    console.log('   Actual samples analyzed: 0 (too few for reliable stats)\n');
  } else if (recommendations.mempoolSize > 100) {
    console.log('⚠️  Mempool is busy - network has high activity');
    console.log('   Consider using higher fee rates for faster confirmation\n');
  } else {
    console.log('✅ Mempool has normal activity\n');
  }

  // ==================== FEE RECOMMENDATIONS ====================
  console.log('4️⃣  Fee Rate Recommendations');
  console.log('═════════════════════════════════════');
  console.log('Priority | Fee Rate      | Percentile | Description');
  console.log('---------|---------------|------------|------------------');
  console.log(
    `Low      | ${recommendations.low.feeRate.toString().padStart(2)} sompi/byte | ${recommendations.low.percentile}th        | Slow, cheapest`
  );
  console.log(
    `Normal   | ${recommendations.normal.feeRate.toString().padStart(2)} sompi/byte | ${recommendations.normal.percentile}th        | Standard speed`
  );
  console.log(
    `High     | ${recommendations.high.feeRate.toString().padStart(2)} sompi/byte | ${recommendations.high.percentile}th        | Fast confirmation`
  );
  console.log(
    `Urgent   | ${recommendations.urgent.feeRate.toString().padStart(2)} sompi/byte | ${recommendations.urgent.percentile}th        | Highest priority`
  );
  console.log();

  // ==================== EXAMPLE TRANSACTION ====================
  console.log('5️⃣  Example: Calculate Fee for Transaction');
  console.log('═════════════════════════════════════');

  const inputs = 2;
  const outputs = 2;

  console.log(`Transaction Size: ${inputs} inputs, ${outputs} outputs`);
  console.log();

  console.log('Estimated Fees by Priority:');
  console.log('─────────────────────────────────────');

  const priorities = [FeePriority.Low, FeePriority.Normal, FeePriority.High, FeePriority.Urgent];

  for (const priority of priorities) {
    const estimate = await feeEstimator.estimateFee(priority, inputs, outputs);

    const feeHTN = HoosatUtils.sompiToAmount(estimate.totalFee);
    const priorityName = priority.charAt(0).toUpperCase() + priority.slice(1);

    console.log(`${priorityName.padEnd(8)}: ${estimate.totalFee.padStart(6)} sompi (${feeHTN} HTN) @ ${estimate.feeRate} sompi/byte`);
  }
  console.log();

  // ==================== COMPARE TRANSACTION TYPES ====================
  console.log('6️⃣  Fee Comparison for Different Transaction Types');
  console.log('═════════════════════════════════════');
  console.log('Using Normal priority...\n');

  const scenarios = [
    { name: 'Simple (1→2)', inputs: 1, outputs: 2 },
    { name: 'Standard (2→2)', inputs: 2, outputs: 2 },
    { name: 'Multi-send (1→5)', inputs: 1, outputs: 5 },
    { name: 'Consolidate (5→1)', inputs: 5, outputs: 1 },
    { name: 'Complex (5→5)', inputs: 5, outputs: 5 },
  ];

  console.log('Type             | Fee (sompi) | Fee (HTN)');
  console.log('-----------------|-------------|-------------');

  for (const scenario of scenarios) {
    const estimate = await feeEstimator.estimateFee(FeePriority.Normal, scenario.inputs, scenario.outputs);

    const feeHTN = HoosatUtils.sompiToAmount(estimate.totalFee);

    console.log(`${scenario.name.padEnd(16)} | ${estimate.totalFee.padStart(11)} | ${feeHTN}`);
  }
  console.log();

  // ==================== REAL-TIME MONITORING ====================
  console.log('7️⃣  Real-time Fee Monitoring');
  console.log('═════════════════════════════════════');
  console.log('Monitoring mempool for 30 seconds...\n');

  const monitoringDuration = 30000; // 30 seconds
  const checkInterval = 5000; // Check every 5 seconds
  const startTime = Date.now();

  console.log('Time  | Mempool | Median Fee | Normal Rate');
  console.log('------|---------|------------|-------------');

  const printStatus = async (elapsed: number) => {
    const recs = await feeEstimator.getRecommendations(true); // Force refresh

    const timeStr = `${Math.floor(elapsed / 1000)}s`.padEnd(5);
    const mempoolStr = recs.mempoolSize.toString().padStart(7);
    const medianStr = `${recs.medianFeeRate} sompi/byte`.padStart(10);
    const normalStr = `${recs.normal.feeRate} sompi/byte`.padStart(11);

    console.log(`${timeStr} | ${mempoolStr} | ${medianStr} | ${normalStr}`);
  };

  // Initial status
  await printStatus(0);

  // Monitor for specified duration
  const intervalId = setInterval(async () => {
    const elapsed = Date.now() - startTime;

    if (elapsed >= monitoringDuration) {
      clearInterval(intervalId);
      console.log();
      console.log('✅ Monitoring complete!\n');

      // ==================== SUMMARY ====================
      console.log('═══════════════════════════════════════════════════════════');
      console.log('   📈 SUMMARY');
      console.log('═══════════════════════════════════════════════════════════\n');

      console.log('Key Takeaways:');
      console.log('─────────────────────────────────────');
      console.log('1. ✅ Fee rates are calculated from current mempool');
      console.log('2. ✅ Recommendations update every minute (cached)');
      console.log('3. ✅ Choose priority based on urgency:');
      console.log('     • Low: No rush, save on fees');
      console.log('     • Normal: Standard confirmation time');
      console.log('     • High: Fast confirmation needed');
      console.log('     • Urgent: Highest priority, fastest');
      console.log('4. ✅ Empty mempool = use minimal fees');
      console.log('5. ✅ Busy mempool = consider higher fees');
      console.log();

      console.log('Usage in Your Code:');
      console.log('─────────────────────────────────────');
      console.log('```typescript');
      console.log('const feeEstimator = new FeeEstimator(node);');
      console.log('const estimate = await feeEstimator.estimateFee(');
      console.log("  FeePriority.Normal, // or 'normal'");
      console.log('  2, // inputs');
      console.log('  2  // outputs');
      console.log(');');
      console.log('');
      console.log('// Use the recommended fee');
      console.log('builder.setFee(estimate.totalFee);');
      console.log('```');
      console.log();

      console.log('🎯 Pro Tips:');
      console.log('─────────────────────────────────────');
      console.log('• Use FeePriority.Low during off-peak hours');
      console.log('• Use FeePriority.High when network is busy');
      console.log('• Monitor mempool size to gauge network activity');
      console.log('• Cache is updated every 60 seconds automatically');
      console.log('• Force refresh with getRecommendations(true)');
      console.log();

      // Disconnect
      node.disconnect();
      console.log('✅ Disconnected from node\n');

      return;
    }

    await printStatus(elapsed);
  }, checkInterval);
}

// Run example
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
