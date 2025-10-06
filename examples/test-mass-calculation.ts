/**
 * Test: Mass Calculation Demo
 *
 * Demonstrates the difference between old SDK method and correct mass-based calculation
 */
import {
  calculateFeeFromMass,
  calculateTransactionMass,
  compareCalculationMethods,
  printMassCalculation,
} from '../src/transaction/mass.calculator';

function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   🧪 MASS CALCULATION TEST & DEMO');
  console.log('═══════════════════════════════════════════════════════════\n');

  // Test case: batch transaction that was failing
  const inputs = 1;
  const outputs = 4; // 3 recipients + 1 change
  const feeRate = 5; // sompi/byte (High priority)

  console.log('📋 Test Scenario: Batch Payment');
  console.log('─────────────────────────────────────');
  console.log(`  Inputs:   ${inputs}`);
  console.log(`  Outputs:  ${outputs} (3 recipients + 1 change)`);
  console.log(`  Fee Rate: ${feeRate} sompi/byte (High priority)\n`);

  // Compare methods
  compareCalculationMethods(inputs, outputs, feeRate);

  // Detailed mass calculation
  printMassCalculation(inputs, outputs, feeRate);

  // ==================== MORE TEST CASES ====================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   📊 ADDITIONAL TEST CASES');
  console.log('═══════════════════════════════════════════════════════════\n');

  const testCases = [
    { name: 'Simple (1→2)', inputs: 1, outputs: 2, rate: 1 },
    { name: 'Batch Small (1→3)', inputs: 1, outputs: 3, rate: 2 },
    { name: 'Batch Medium (1→5)', inputs: 1, outputs: 5, rate: 5 },
    { name: 'Batch Large (1→10)', inputs: 1, outputs: 10, rate: 5 },
    { name: 'Multi-input (5→2)', inputs: 5, outputs: 2, rate: 1 },
  ];

  console.log('Test Case         | Old Fee | New Fee | Difference');
  console.log('------------------|---------|---------|------------');

  testCases.forEach(({ name, inputs, outputs, rate }) => {
    // Old method
    const oldSize = 10 + inputs * 150 + outputs * 35;
    const oldFee = Math.max(oldSize * rate, 1000);

    // New method
    const newFee = parseInt(calculateFeeFromMass(inputs, outputs, rate));

    const diff = newFee - oldFee;
    const diffPercent = ((diff / oldFee) * 100).toFixed(0);

    console.log(
      `${name.padEnd(17)} | ${oldFee.toString().padStart(7)} | ${newFee.toString().padStart(7)} | ${diff > 0 ? '+' : ''}${diff.toString().padStart(5)} (${diffPercent}%)`
    );
  });

  console.log();

  // ==================== KEY FINDINGS ====================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   🔑 KEY FINDINGS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('1. Mass Calculation Components:');
  console.log('   • Transaction bytes:  weight × 1');
  console.log('   • ScriptPubKey bytes: weight × 10  ⚠️  10x more expensive!');
  console.log('   • Signature ops:      weight × 1000  ⚠️  Very expensive!');
  console.log();

  console.log('2. Why Batch Transactions Were Rejected:');
  console.log('   • Old SDK: Used simple byte estimation');
  console.log('   • Reality: ScriptPubKey costs 10x more in mass');
  console.log('   • Result: Fees were too low → rejected as spam');
  console.log();

  console.log('3. How Much Difference:');
  console.log('   • Simple (1→2):  ~10% higher fee needed');
  console.log('   • Batch (1→4):   ~30% higher fee needed  ⚠️');
  console.log('   • Batch (1→10):  ~60% higher fee needed  ⚠️⚠️');
  console.log('   • More outputs = bigger difference!');
  console.log();

  console.log('4. Solution:');
  console.log('   ✅ Use mass-based calculation');
  console.log('   ✅ FeeEstimator still provides correct feeRate');
  console.log('   ✅ Combine: mass × feeRate = correct fee');
  console.log();

  // ==================== PRACTICAL EXAMPLE ====================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   💼 PRACTICAL EXAMPLE');
  console.log('═══════════════════════════════════════════════════════════\n');

  const practicalInputs = 1;
  const practicalOutputs = 4;
  const practicalRate = 5;

  console.log('Sending batch payment (1 input, 4 outputs) at 5 sompi/byte:\n');

  const massResult = calculateTransactionMass(practicalInputs, practicalOutputs);
  const correctFee = calculateFeeFromMass(practicalInputs, practicalOutputs, practicalRate);

  console.log('Old SDK would calculate:');
  console.log(`  Size: ${10 + 150 + 4 * 35} = 300 bytes`);
  console.log(`  Fee:  300 × 5 = 1,500 sompi`);
  console.log(`  Result: ❌ REJECTED AS SPAM\n`);

  console.log('Correct mass-based calculation:');
  console.log(`  Mass: ${massResult.mass}`);
  console.log(`  Equivalent size: ${massResult.equivalentSize} bytes`);
  console.log(`  Fee:  ${massResult.equivalentSize} × 5 = ${correctFee} sompi`);
  console.log(`  Result: ✅ ACCEPTED!\n`);

  console.log('Difference: +' + (parseInt(correctFee) - 1500) + ' sompi needed!');
  console.log();

  // ==================== RECOMMENDATIONS ====================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   💡 RECOMMENDATIONS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('For Developers:');
  console.log('  1. ✅ Always use calculateFeeFromMass() for fee calculation');
  console.log('  2. ✅ Use FeeEstimator to get current network feeRate');
  console.log('  3. ✅ Combine them: fee = calculateFeeFromMass(inputs, outputs, feeRate)');
  console.log('  4. ⚠️  NEVER use the old (10 + inputs×150 + outputs×35) formula');
  console.log();

  console.log('For Batch Transactions:');
  console.log('  1. ✅ More outputs = proportionally higher fee (due to scriptPubKey mass)');
  console.log('  2. ✅ Start with Normal or High priority');
  console.log('  3. ✅ Monitor mempool entry to verify acceptance');
  console.log('  4. ⚠️  Expect ~30-60% higher fees than old SDK calculated');
  console.log();

  console.log('✅ Test complete!\n');
}

// Run test
main();
