/**
 * Example 04: Dynamic Fee Estimation from Network
 *
 * Learn how to use HoosatFeeEstimator to get optimal fee rates
 * based on current network conditions.
 *
 * Prerequisites:
 * - Access to Hoosat node
 * - Node must be synced
 */
import { FeePriority, HoosatClient, HoosatFeeEstimator, HoosatUtils } from 'hoosat-sdk';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   📊 EXAMPLE 04: DYNAMIC FEE ESTIMATION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== CONNECT TO NODE ====================
  console.log('1️⃣  Connecting to Node');
  console.log('═════════════════════════════════════');

  const client = new HoosatClient({
    host: '54.38.176.95',
    port: 42420,
    timeout: 15000,
  });

  try {
    const info = await client.getInfo();
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

  const feeEstimator = new HoosatFeeEstimator(client);
  console.log('✅ Fee estimator created (uses MASS-based calculation)\n');

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

  // ==================== PRIORITY LEVELS ====================
  console.log('4️⃣  Fee Recommendations by Priority');
  console.log('═════════════════════════════════════');

  console.log('Priority | Fee Rate      | Percentile');
  console.log('---------|---------------|------------');
  console.log(`Low      | ${recommendations.low.feeRate.toString().padStart(2)} sompi/byte | ${recommendations.low.percentile}th`);
  console.log(`Normal   | ${recommendations.normal.feeRate.toString().padStart(2)} sompi/byte | ${recommendations.normal.percentile}th`);
  console.log(`High     | ${recommendations.high.feeRate.toString().padStart(2)} sompi/byte | ${recommendations.high.percentile}th`);
  console.log(`Urgent   | ${recommendations.urgent.feeRate.toString().padStart(2)} sompi/byte | ${recommendations.urgent.percentile}th`);
  console.log();

  // ==================== EXAMPLE CALCULATION ====================
  console.log('5️⃣  Example: Calculate Fee for Transaction');
  console.log('═════════════════════════════════════');

  const inputs = 2;
  const outputs = 2;

  console.log(`Transaction: ${inputs} inputs → ${outputs} outputs (standard payment)`);
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
    { name: 'Simple (1→1)', inputs: 1, outputs: 1 },
    { name: 'Standard (1→2)', inputs: 1, outputs: 2 },
    { name: 'Batch Pay (2→2)', inputs: 2, outputs: 2 }, // Max 2 recipients
    { name: 'Consolidate (5→1)', inputs: 5, outputs: 1 },
    { name: 'Large Batch (5→2)', inputs: 5, outputs: 2 }, // Max 2 recipients
  ];

  console.log('Type               | Fee (sompi) | Fee (HTN)');
  console.log('-------------------|-------------|-------------');

  for (const scenario of scenarios) {
    const estimate = await feeEstimator.estimateFee(FeePriority.Normal, scenario.inputs, scenario.outputs);

    const feeHTN = HoosatUtils.sompiToAmount(estimate.totalFee);

    console.log(`${scenario.name.padEnd(18)} | ${estimate.totalFee.padStart(11)} | ${feeHTN.padStart(11)}`);
  }

  console.log();
  console.log('⚠️  Note: Outputs include recipients + change');
  console.log('    Current node limitation: max 2 recipient outputs per tx');
  console.log();

  // ==================== REAL-TIME UPDATES ====================
  console.log('7️⃣  Cache Management');
  console.log('═════════════════════════════════════');

  console.log('Cache settings:');
  console.log('  Duration: 60 seconds (default)');
  console.log('  Next refresh: automatic after expiry');
  console.log();

  console.log('To force refresh:');
  console.log('  feeEstimator.clearCache()');
  console.log('  await feeEstimator.getRecommendations(true)');
  console.log();

  // ==================== RECOMMENDATIONS ====================
  console.log('8️⃣  Usage Recommendations');
  console.log('═════════════════════════════════════');

  console.log('Fee Priority Guidelines:');
  console.log('  Low:    Use when not time-sensitive (may take longer)');
  console.log('  Normal: Standard for most transactions');
  console.log('  High:   When you need faster confirmation');
  console.log('  Urgent: Critical transactions only (highest cost)');
  console.log();

  console.log('Best Practices:');
  console.log('  • Check mempool size before choosing priority');
  console.log('  • Use Low priority when mempool is empty');
  console.log('  • Use High/Urgent during network congestion');
  console.log('  • Cache is refreshed automatically every minute');
  console.log('  • All fees use MASS-based calculation (accurate!)');
  console.log();

  // Cleanup
  client.disconnect();
  console.log('✅ Disconnected from node\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
