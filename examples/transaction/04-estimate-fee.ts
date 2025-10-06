/**
 * Example: Fee Estimation
 *
 * Demonstrates:
 * - Estimating transaction fees based on size
 * - Fee calculation for different input/output combinations
 * - Custom fee rates (sompi per byte)
 * - Fee comparison for different transaction types
 * - Understanding transaction size factors
 *
 * Prerequisites:
 * - None (works offline, no transaction created)
 *
 * Note: This example only estimates fees, no transactions are built or signed.
 */
import { HoosatCrypto, HoosatUtils } from '../../src';

function main() {
  console.log('💸 Transaction Fee Estimation\n');

  // ==================== FEE BASICS ====================
  console.log('1️⃣  Fee Calculation Basics');
  console.log('═════════════════════════════════════');
  console.log('Formula: Fee = Transaction Size (bytes) × Fee Rate (sompi/byte)');
  console.log();
  console.log('Default Fee Rate: 1 sompi/byte');
  console.log('Minimum Fee:      1000 sompi (0.00001 HTN)');
  console.log();

  // ==================== TRANSACTION SIZE FACTORS ====================
  console.log('2️⃣  Transaction Size Factors');
  console.log('═════════════════════════════════════');
  console.log('Component              | Approximate Size');
  console.log('-----------------------|------------------');
  console.log('Base transaction       | ~10 bytes');
  console.log('Per input (ECDSA)      | ~150 bytes');
  console.log('Per output             | ~35 bytes');
  console.log('═════════════════════════════════════\n');

  // ==================== SCENARIO 1: SINGLE INPUT/OUTPUT ====================
  console.log('3️⃣  Scenario 1: Simple Transaction (1 in, 2 out)');
  console.log('═════════════════════════════════════');

  const inputs1 = 1;
  const outputs1 = 2; // recipient + change

  const estimatedSize1 = HoosatCrypto.estimateTransactionSize(inputs1, outputs1);
  const estimatedFee1 = HoosatCrypto.calculateFee(inputs1, outputs1, 1);

  console.log('Configuration:');
  console.log(`  Inputs:   ${inputs1}`);
  console.log(`  Outputs:  ${outputs1} (1 recipient + 1 change)`);
  console.log();
  console.log('Estimation:');
  console.log(`  Size:     ~${estimatedSize1} bytes`);
  console.log(`  Fee:      ${estimatedFee1} sompi (${HoosatUtils.sompiToAmount(estimatedFee1)} HTN)`);
  console.log(`  Fee Rate: 1 sompi/byte`);
  console.log();

  // ==================== SCENARIO 2: MULTIPLE INPUTS ====================
  console.log('4️⃣  Scenario 2: Multiple Inputs (4 in, 2 out)');
  console.log('═════════════════════════════════════');

  const inputs2 = 4;
  const outputs2 = 2;

  const estimatedSize2 = HoosatCrypto.estimateTransactionSize(inputs2, outputs2);
  const estimatedFee2 = HoosatCrypto.calculateFee(inputs2, outputs2, 1);

  console.log('Configuration:');
  console.log(`  Inputs:   ${inputs2}`);
  console.log(`  Outputs:  ${outputs2}`);
  console.log();
  console.log('Estimation:');
  console.log(`  Size:     ~${estimatedSize2} bytes`);
  console.log(`  Fee:      ${estimatedFee2} sompi (${HoosatUtils.sompiToAmount(estimatedFee2)} HTN)`);
  console.log(`  Fee Rate: 1 sompi/byte`);
  console.log();

  const sizeDiff = estimatedSize2 - estimatedSize1;
  const feeDiff = BigInt(estimatedFee2) - BigInt(estimatedFee1);
  console.log('Comparison to Scenario 1:');
  console.log(`  Size increase:  +${sizeDiff} bytes`);
  console.log(`  Fee increase:   +${feeDiff} sompi (${HoosatUtils.sompiToAmount(feeDiff)} HTN)`);
  console.log(`  Per extra input: ~${Math.floor(sizeDiff / 3)} bytes`);
  console.log();

  // ==================== SCENARIO 3: MULTIPLE OUTPUTS ====================
  console.log('5️⃣  Scenario 3: Multiple Outputs (1 in, 5 out)');
  console.log('═════════════════════════════════════');

  const inputs3 = 1;
  const outputs3 = 5; // payment splitting

  const estimatedSize3 = HoosatCrypto.estimateTransactionSize(inputs3, outputs3);
  const estimatedFee3 = HoosatCrypto.calculateFee(inputs3, outputs3, 1);

  console.log('Configuration:');
  console.log(`  Inputs:   ${inputs3}`);
  console.log(`  Outputs:  ${outputs3} (payment splitting)`);
  console.log();
  console.log('Estimation:');
  console.log(`  Size:     ~${estimatedSize3} bytes`);
  console.log(`  Fee:      ${estimatedFee3} sompi (${HoosatUtils.sompiToAmount(estimatedFee3)} HTN)`);
  console.log();

  // ==================== SCENARIO 4: CONSOLIDATION ====================
  console.log('6️⃣  Scenario 4: UTXO Consolidation (10 in, 1 out)');
  console.log('═════════════════════════════════════');

  const inputs4 = 10;
  const outputs4 = 1; // consolidate to single output

  const estimatedSize4 = HoosatCrypto.estimateTransactionSize(inputs4, outputs4);
  const estimatedFee4 = HoosatCrypto.calculateFee(inputs4, outputs4, 1);

  console.log('Configuration:');
  console.log(`  Inputs:   ${inputs4} (consolidating small UTXOs)`);
  console.log(`  Outputs:  ${outputs4} (single consolidated output)`);
  console.log();
  console.log('Estimation:');
  console.log(`  Size:     ~${estimatedSize4} bytes`);
  console.log(`  Fee:      ${estimatedFee4} sompi (${HoosatUtils.sompiToAmount(estimatedFee4)} HTN)`);
  console.log();
  console.log('Note: Higher fee due to many inputs, but reduces future fees');
  console.log();

  // ==================== CUSTOM FEE RATES ====================
  console.log('7️⃣  Custom Fee Rates (2 in, 2 out)');
  console.log('═════════════════════════════════════');

  const inputs5 = 2;
  const outputs5 = 2;
  const estimatedSize5 = HoosatCrypto.estimateTransactionSize(inputs5, outputs5);

  const feeRates = [1, 2, 5, 10];

  console.log('Fee Rate Comparison:');
  console.log();
  feeRates.forEach(rate => {
    const fee = HoosatCrypto.calculateFee(inputs5, outputs5, rate);
    console.log(`  ${rate.toString().padStart(2)} sompi/byte:`);
    console.log(`    Size: ~${estimatedSize5} bytes`);
    console.log(`    Fee:  ${fee} sompi (${HoosatUtils.sompiToAmount(fee)} HTN)`);
    console.log();
  });

  // ==================== PRIORITY FEES ====================
  console.log('8️⃣  Priority Fee Recommendations');
  console.log('═════════════════════════════════════');

  const standardInputs = 2;
  const standardOutputs = 2;

  console.log('Priority Level | Fee Rate      | Use Case');
  console.log('---------------|---------------|----------------------------------');
  console.log('Economy        | 1 sompi/byte  | No rush, lower fees');
  console.log('Standard       | 2 sompi/byte  | Normal transactions');
  console.log('Fast           | 5 sompi/byte  | Quick confirmation needed');
  console.log('Instant        | 10 sompi/byte | Urgent, highest priority');
  console.log();

  console.log('Example (2 inputs, 2 outputs):');
  console.log();
  const priorities = [
    { name: 'Economy', rate: 1 },
    { name: 'Standard', rate: 2 },
    { name: 'Fast', rate: 5 },
    { name: 'Instant', rate: 10 },
  ];

  priorities.forEach(({ name, rate }) => {
    const fee = HoosatCrypto.calculateFee(standardInputs, standardOutputs, rate);
    console.log(`  ${name.padEnd(8)}: ${fee.padStart(6)} sompi (${HoosatUtils.sompiToAmount(fee)} HTN)`);
  });
  console.log();

  // ==================== COMPARISON TABLE ====================
  console.log('9️⃣  Transaction Type Comparison (1 sompi/byte)');
  console.log('═════════════════════════════════════');

  const scenarios = [
    { name: 'Simple Payment', inputs: 1, outputs: 2 },
    { name: 'Multi-Send', inputs: 1, outputs: 5 },
    { name: 'Multi-Input', inputs: 4, outputs: 2 },
    { name: 'Consolidation (5)', inputs: 5, outputs: 1 },
    { name: 'Consolidation (10)', inputs: 10, outputs: 1 },
    { name: 'Complex', inputs: 5, outputs: 5 },
  ];

  console.log('Type                | In | Out | Size     | Fee');
  console.log('--------------------|----|----|----------|-------------');

  scenarios.forEach(({ name, inputs, outputs }) => {
    const size = HoosatCrypto.estimateTransactionSize(inputs, outputs);
    const fee = HoosatCrypto.calculateFee(inputs, outputs, 1);
    const feeHTN = HoosatUtils.sompiToAmount(fee);

    console.log(
      `${name.padEnd(19)} | ${inputs.toString().padStart(2)} | ${outputs.toString().padStart(2)} | ${size.toString().padStart(8)} | ${fee.toString().padStart(6)} (${feeHTN})`
    );
  });
  console.log();

  // ==================== FEE CALCULATION FORMULA ====================
  console.log('🔟 Manual Fee Calculation');
  console.log('═════════════════════════════════════');
  console.log('Formula:');
  console.log('  Size = 10 + (inputs × 150) + (outputs × 35)');
  console.log('  Fee  = max(Size × FeeRate, MinFee)');
  console.log('  MinFee = 1000 sompi');
  console.log();

  console.log('Example: 3 inputs, 2 outputs, 1 sompi/byte');
  console.log();
  const manualInputs = 3;
  const manualOutputs = 2;
  const manualFeeRate = 1;
  const manualMinFee = 1000;

  const calculatedSize = 10 + manualInputs * 150 + manualOutputs * 35;
  const calculatedFeeRaw = calculatedSize * manualFeeRate;
  const calculatedFee = Math.max(calculatedFeeRaw, manualMinFee);

  console.log('  Step 1: Calculate size');
  console.log(`    Size = 10 + (${manualInputs} × 150) + (${manualOutputs} × 35)`);
  console.log(`    Size = 10 + ${manualInputs * 150} + ${manualOutputs * 35}`);
  console.log(`    Size = ${calculatedSize} bytes`);
  console.log();
  console.log('  Step 2: Calculate fee');
  console.log(`    Fee = ${calculatedSize} × ${manualFeeRate} = ${calculatedFeeRaw} sompi`);
  console.log(`    Fee = max(${calculatedFeeRaw}, ${manualMinFee}) = ${calculatedFee} sompi`);
  console.log(`    Fee = ${HoosatUtils.sompiToAmount(calculatedFee.toString())} HTN`);
  console.log();

  // Verify with SDK
  const sdkSize = HoosatCrypto.estimateTransactionSize(manualInputs, manualOutputs);
  const sdkFee = HoosatCrypto.calculateFee(manualInputs, manualOutputs, manualFeeRate);

  console.log('  SDK Verification:');
  console.log(`    estimateTransactionSize(${manualInputs}, ${manualOutputs}) = ${sdkSize} bytes`);
  console.log(`    calculateFee(${manualInputs}, ${manualOutputs}, ${manualFeeRate}) = ${sdkFee} sompi`);
  console.log(`    Match: ${calculatedSize === sdkSize && calculatedFee.toString() === sdkFee ? '✅' : '❌'}`);
  console.log();

  // ==================== COST ANALYSIS ====================
  console.log('💰 Cost Analysis (Current HTN Price: Example)');
  console.log('═════════════════════════════════════');
  console.log('Assuming 1 HTN = $0.10 USD (example only):');
  console.log();

  const htnPriceUSD = 0.1; // Example price

  scenarios.forEach(({ name, inputs, outputs }) => {
    const fee = HoosatCrypto.calculateFee(inputs, outputs, 1);
    const feeHTN = parseFloat(HoosatUtils.sompiToAmount(fee));
    const feeUSD = feeHTN * htnPriceUSD;

    console.log(`${name.padEnd(19)}: ${fee.toString().padStart(6)} sompi = $${feeUSD.toFixed(6)} USD`);
  });
  console.log();

  // ==================== BEST PRACTICES ====================
  console.log('💡 Best Practices');
  console.log('─────────────────────────────────────');
  console.log('1. ✅ Use calculateFee() for automatic estimation');
  console.log('2. ✅ Start with 1 sompi/byte for normal priority');
  console.log('3. ✅ Increase fee rate for urgent transactions');
  console.log('4. ✅ Minimize inputs to reduce fees');
  console.log('5. ✅ Consolidate UTXOs during low-fee periods');
  console.log('6. ⚠️  Each extra input costs ~150 bytes more');
  console.log('7. ⚠️  Each extra output costs ~35 bytes more');
  console.log('8. ⚠️  Always check actual size after signing');
  console.log('─────────────────────────────────────\n');

  // ==================== FEE OPTIMIZATION TIPS ====================
  console.log('🎯 Fee Optimization Tips');
  console.log('─────────────────────────────────────');
  console.log('Reduce Inputs:');
  console.log('  • Use largest UTXOs first');
  console.log('  • Consolidate small UTXOs when fees are low');
  console.log('  • Avoid creating dust (< 1000 sompi)');
  console.log();
  console.log('Reduce Outputs:');
  console.log('  • Batch multiple payments into one transaction');
  console.log('  • Avoid unnecessary change outputs');
  console.log('  • Use exact-match UTXOs when possible');
  console.log();
  console.log('Timing:');
  console.log('  • Consolidate UTXOs during off-peak hours');
  console.log('  • Non-urgent transactions can use lower fee rates');
  console.log('─────────────────────────────────────\n');

  console.log('📚 Next Steps');
  console.log('─────────────────────────────────────');
  console.log('See: examples/transaction/05-send-real.ts');
  console.log('     for real transaction submission (with warnings!)');
  console.log('─────────────────────────────────────\n');

  console.log('✅ Fee estimation complete!');
}

main();
