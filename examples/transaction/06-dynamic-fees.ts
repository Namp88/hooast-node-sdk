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
import { FeePriority, HoosatClient, HoosatFeeEstimator, HoosatUtils } from 'hoosat-sdk';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   📊 EXAMPLE 06: DYNAMIC FEE ESTIMATION');
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
  console.log('✅ Fee estimator created (MASS-based calculation)\n');

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

  console.log('Priority | Fee Rate      | Percentile | Recommended For');
  console.log('---------|---------------|------------|------------------');
  console.log(
    `Low      | ${recommendations.low.feeRate.toString().padStart(2)} sompi/byte | ${recommendations.low.percentile}th         | Not urgent`
  );
  console.log(
    `Normal   | ${recommendations.normal.feeRate.toString().padStart(2)} sompi/byte | ${recommendations.normal.percentile}th         | Standard use`
  );
  console.log(
    `High     | ${recommendations.high.feeRate.toString().padStart(2)} sompi/byte | ${recommendations.high.percentile}th         | Fast confirmation`
  );
  console.log(
    `Urgent   | ${recommendations.urgent.feeRate.toString().padStart(2)} sompi/byte | ${recommendations.urgent.percentile}th         | Critical only`
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

  // ⚠️ Updated scenarios to respect 2-recipient limit
  const scenarios = [
    { name: 'Simple (1→1)', inputs: 1, outputs: 1 },
    { name: 'Standard (1→2)', inputs: 1, outputs: 2 },
    { name: 'Batch (1→2)', inputs: 1, outputs: 2 }, // Max 2 recipients
    { name: 'Consolidate (5→1)', inputs: 5, outputs: 1 },
    { name: 'Large Batch (5→2)', inputs: 5, outputs: 2 }, // Max 2 recipients
  ];

  console.log('Type             | Fee (sompi) | Fee (HTN)');
  console.log('-----------------|-------------|-------------');

  for (const scenario of scenarios) {
    const estimate = await feeEstimator.estimateFee(FeePriority.Normal, scenario.inputs, scenario.outputs);

    const feeHTN = HoosatUtils.sompiToAmount(estimate.totalFee);

    console.log(`${scenario.name.padEnd(16)} | ${estimate.totalFee.padStart(11)} | ${feeHTN.padStart(11)}`);
  }

  console.log();
  console.log('⚠️  Important Notes:');
  console.log('   • Output count includes recipients + change output');
  console.log('   • Current node limitation: max 2 recipient outputs per tx');
  console.log('   • For more recipients, send multiple transactions');
  console.log('   • MASS-based fee calculation accounts for ScriptPubKey cost');
  console.log();

  // ==================== NETWORK CONGESTION ANALYSIS ====================
  console.log('7️⃣  Network Congestion Analysis');
  console.log('═════════════════════════════════════');

  const mempoolSize = recommendations.mempoolSize;
  const avgFee = recommendations.averageFeeRate;

  let congestionLevel = 'Low';
  let recommendation = 'Use Low or Normal priority';

  if (mempoolSize > 100) {
    congestionLevel = 'High';
    recommendation = 'Use High or Urgent priority for faster confirmation';
  } else if (mempoolSize > 50) {
    congestionLevel = 'Medium';
    recommendation = 'Use Normal or High priority';
  }

  console.log(`Current Congestion: ${congestionLevel}`);
  console.log(`Mempool Size:       ${mempoolSize} transactions`);
  console.log(`Average Fee Rate:   ${avgFee} sompi/byte`);
  console.log();
  console.log(`Recommendation: ${recommendation}`);
  console.log();

  // ==================== CACHE MANAGEMENT ====================
  console.log('8️⃣  Cache Management');
  console.log('═════════════════════════════════════');

  console.log('Fee estimates are cached for 60 seconds');
  console.log('This avoids excessive mempool queries');
  console.log();

  console.log('Cache control:');
  console.log('  • Force refresh: await feeEstimator.getRecommendations(true)');
  console.log('  • Clear cache:   feeEstimator.clearCache()');
  console.log('  • Change TTL:    feeEstimator.setCacheDuration(120000)');
  console.log();

  // Test cache
  console.log('Testing cache...');
  const start = Date.now();
  await feeEstimator.getRecommendations(); // Should use cache
  const elapsed = Date.now() - start;
  console.log(`  Cached response in ${elapsed}ms ✅`);
  console.log();

  // ==================== BEST PRACTICES ====================
  console.log('9️⃣  Best Practices');
  console.log('═════════════════════════════════════');

  console.log('When to use each priority:');
  console.log();
  console.log('Low Priority:');
  console.log('  • Non-urgent transactions');
  console.log('  • When mempool is empty (<10 transactions)');
  console.log('  • Saves on fees, may take longer to confirm');
  console.log();
  console.log('Normal Priority:');
  console.log('  • Most transactions');
  console.log('  • Balanced between speed and cost');
  console.log('  • Good for typical network conditions');
  console.log();
  console.log('High Priority:');
  console.log('  • Important transactions');
  console.log('  • When mempool is congested (>50 transactions)');
  console.log('  • Need faster confirmation');
  console.log();
  console.log('Urgent Priority:');
  console.log('  • Critical transactions only');
  console.log('  • Maximum fee, fastest confirmation');
  console.log('  • High network congestion (>100 transactions)');
  console.log();

  console.log('Tips:');
  console.log('  • Check mempool size before choosing priority');
  console.log('  • Higher inputs = higher fees (more signature operations)');
  console.log('  • Change outputs add cost, minimize when possible');
  console.log('  • MASS calculation ensures correct fee for node acceptance');
  console.log();

  // Cleanup
  client.disconnect();
  console.log('✅ Disconnected from node\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
