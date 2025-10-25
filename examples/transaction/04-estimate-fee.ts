/**
 * Example 04: Calculate Minimum Fee
 *
 * Learn how to calculate the minimum transaction fee based on
 * actual UTXO count and transaction structure.
 *
 * Prerequisites:
 * - Access to Hoosat node
 * - Node must be synced
 * - Address with UTXOs
 */
import { HoosatClient, HoosatCrypto, HoosatUtils } from 'hoosat-sdk';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   💰 EXAMPLE 04: CALCULATE MINIMUM FEE');
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

  // ==================== TEST ADDRESS ====================
  console.log('2️⃣  Test Address Setup');
  console.log('═════════════════════════════════════');

  const testAddress = 'hoosat:qz7uluw5ckcm6z9v8mwqypzqkfqmqy48jtunzm5mqrjtkfnnf77j5s6k38dv7';
  console.log(`Address: ${testAddress}\n`);

  // ==================== GET UTXOS ====================
  console.log('3️⃣  Fetch UTXOs for Address');
  console.log('═════════════════════════════════════');

  const utxosResult = await client.getUtxosByAddresses([testAddress]);

  if (!utxosResult.ok || !utxosResult.result) {
    console.error('❌ Failed to fetch UTXOs');
    process.exit(1);
  }

  const utxos = utxosResult.result.utxos;
  console.log(`✅ Found ${utxos.length} UTXOs\n`);

  if (utxos.length === 0) {
    console.log('⚠️  No UTXOs available for this address');
    console.log('   Try using an address with balance\n');
    client.disconnect();
    return;
  }

  // ==================== AUTOMATIC FEE CALCULATION ====================
  console.log('4️⃣  Calculate Minimum Fee (Automatic)');
  console.log('═════════════════════════════════════');

  try {
    const minFee = await client.calculateMinFee(testAddress);
    const feeHTN = HoosatUtils.sompiToAmount(minFee);

    console.log('Fee Details:');
    console.log(`  Inputs:     ${utxos.length} UTXOs`);
    console.log(`  Outputs:    2 (recipient + change)`);
    console.log(`  Min Fee:    ${minFee} sompi`);
    console.log(`  Min Fee:    ${feeHTN} HTN\n`);
  } catch (error: any) {
    console.error('❌ Fee calculation failed:', error.message);
  }

  // ==================== MANUAL FEE CALCULATION ====================
  console.log('5️⃣  Calculate Fee Manually (HoosatCrypto)');
  console.log('═════════════════════════════════════');

  const inputCount = utxos.length;
  const outputCount = 2; // Standard: 1 recipient + 1 change

  const manualFee = HoosatCrypto.calculateMinFee(inputCount, outputCount);
  const manualFeeHTN = HoosatUtils.sompiToAmount(manualFee);

  console.log('Manual Calculation:');
  console.log(`  Formula:    HoosatCrypto.calculateMinFee(${inputCount}, ${outputCount})`);
  console.log(`  Min Fee:    ${manualFee} sompi`);
  console.log(`  Min Fee:    ${manualFeeHTN} HTN\n`);

  // ==================== COMPARE DIFFERENT SCENARIOS ====================
  console.log('6️⃣  Fee Comparison for Different Scenarios');
  console.log('═════════════════════════════════════\n');

  const scenarios = [
    { name: 'Simple (1→1)', inputs: 1, outputs: 1 },
    { name: 'Standard (1→2)', inputs: 1, outputs: 2 },
    { name: 'Batch Pay (2→2)', inputs: 2, outputs: 2 }, // Max 2 recipients
    { name: 'Consolidate (5→1)', inputs: 5, outputs: 1 },
    { name: 'Large (10→2)', inputs: 10, outputs: 2 },
    { name: 'Very Large (20→2)', inputs: 20, outputs: 2 },
  ];

  console.log('Type               | Fee (sompi) | Fee (HTN)');
  console.log('-------------------|-------------|-------------');

  for (const scenario of scenarios) {
    const fee = HoosatCrypto.calculateMinFee(scenario.inputs, scenario.outputs);
    const feeHTN = HoosatUtils.sompiToAmount(fee);

    console.log(`${scenario.name.padEnd(18)} | ${fee.padStart(11)} | ${feeHTN.padStart(11)}`);
  }

  console.log();
  console.log('⚠️  Note: Outputs include recipients + change');
  console.log('    Network limitation: max 2 recipient outputs per tx\n');

  // ==================== WITH PAYLOAD (FUTURE) ====================
  console.log('7️⃣  Fee Calculation with Payload');
  console.log('═════════════════════════════════════');

  const payloadSizes = [0, 64, 128, 256, 512];

  console.log('Standard transaction (5 inputs, 2 outputs):\n');
  console.log('Payload Size | Fee (sompi) | Fee (HTN)');
  console.log('-------------|-------------|-------------');

  for (const payloadSize of payloadSizes) {
    const feeWithPayload = HoosatCrypto.calculateMinFee(5, 2, payloadSize);
    const feeHTN = HoosatUtils.sompiToAmount(feeWithPayload);

    console.log(`${payloadSize.toString().padStart(12)} | ${feeWithPayload.padStart(11)} | ${feeHTN.padStart(11)}`);
  }

  console.log();
  console.log('ℹ️  Payload support is for future subnetwork usage');
  console.log('   Currently not active on the network\n');

  // ==================== HOW IT WORKS ====================
  console.log('8️⃣  How Fee Calculation Works');
  console.log('═════════════════════════════════════');

  console.log('MASS-Based Formula:');
  console.log('  1. txSize = overhead + (inputs × inputSize) + (outputs × outputSize)');
  console.log('  2. massForSize = txSize × 1');
  console.log('  3. massForScriptPubKey = (outputs × scriptPubKeySize) × 10');
  console.log('  4. massForSigOps = inputs × 1000');
  console.log('  5. totalMass = massForSize + massForScriptPubKey + massForSigOps');
  console.log('  6. fee = totalMass (in sompi)\n');

  console.log('Why MASS-based?');
  console.log('  • Accounts for actual transaction weight');
  console.log('  • Prevents spam with small outputs');
  console.log('  • Fair pricing based on resource usage');
  console.log('  • Compatible with HTND node implementation\n');

  // ==================== BEST PRACTICES ====================
  console.log('9️⃣  Best Practices');
  console.log('═════════════════════════════════════');

  console.log('✅ Do:');
  console.log('  • Always calculate fee before building transaction');
  console.log('  • Use client.calculateMinFee() for convenience');
  console.log('  • Use HoosatCrypto.calculateMinFee() for manual calculation');
  console.log('  • Check balance includes amount + fee');
  console.log('  • Account for change output in fee calculation\n');

  console.log('❌ Don\'t:');
  console.log('  • Use hardcoded static fees');
  console.log('  • Forget to account for change output');
  console.log('  • Assume fee is always the same');
  console.log('  • Try to send with insufficient balance\n');

  // Cleanup
  client.disconnect();
  console.log('✅ Disconnected from node\n');
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
