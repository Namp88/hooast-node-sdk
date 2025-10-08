/**
 * Example: Amount Conversion
 *
 * Demonstrates:
 * - Converting between sompi and HTN
 * - Formatting amounts for display
 * - Validating amounts
 * - Working with BigInt for precision
 *
 * Prerequisites:
 * - None (works offline)
 */
import { HoosatUtils } from 'hoosat-sdk';

function main() {
  console.log('💱 Amount Conversion Examples\n');

  // ==================== SOMPI TO HTN ====================
  console.log('1️⃣  Sompi to HTN Conversion:');
  console.log('─────────────────────────────────────');

  const amounts = [
    '100000000', // 1 HTN
    '150000000', // 1.5 HTN
    '1', // 0.00000001 HTN (1 sompi)
    '50000', // 0.0005 HTN
    '123456789', // 1.23456789 HTN
  ];

  amounts.forEach(sompi => {
    const htn = HoosatUtils.sompiToAmount(sompi);
    const formatted = HoosatUtils.formatAmount(htn);
    console.log(`${sompi.padStart(12, ' ')} sompi = ${htn} HTN (${formatted})`);
  });

  console.log('\n');

  // ==================== HTN TO SOMPI ====================
  console.log('2️⃣  HTN to Sompi Conversion:');
  console.log('─────────────────────────────────────');

  const htnAmounts = [
    '1', // 1 HTN
    '1.5', // 1.5 HTN
    '0.00000001', // 1 sompi
    '0.0005', // 50000 sompi
    '1.23456789', // 123456789 sompi
  ];

  htnAmounts.forEach(htn => {
    const sompi = HoosatUtils.amountToSompi(htn);
    console.log(`${htn.padEnd(12, ' ')} HTN = ${sompi.padStart(12, ' ')} sompi`);
  });

  console.log('\n');

  // ==================== FORMATTING ====================
  console.log('3️⃣  Formatting for Display:');
  console.log('─────────────────────────────────────');

  const displayAmounts = ['1.5', '1234567.89', '0.00000001'];

  displayAmounts.forEach(htn => {
    const formatted = HoosatUtils.formatAmount(htn, 8);
    console.log(`${htn.padEnd(15, ' ')} → ${formatted} HTN`);
  });

  console.log('\n');

  // ==================== VALIDATION ====================
  console.log('4️⃣  Amount Validation:');
  console.log('─────────────────────────────────────');

  const testAmounts = [
    { value: '1.5', expected: true },
    { value: '1.123456789', expected: false }, // Too many decimals
    { value: '-5', expected: false }, // Negative
    { value: 'abc', expected: false }, // Invalid
    { value: '0', expected: true },
  ];

  testAmounts.forEach(({ value, expected }) => {
    const isValid = HoosatUtils.isValidAmount(value);
    const icon = isValid === expected ? '✅' : '❌';
    console.log(`${icon} "${value}".padEnd(15) → ${isValid ? 'Valid' : 'Invalid'}`);
  });

  console.log('\n');

  // ==================== PRECISION EXAMPLE ====================
  console.log('5️⃣  Working with BigInt (Precision):');
  console.log('─────────────────────────────────────');

  // Always use BigInt for calculations to avoid floating point errors
  const balance = BigInt('123456789');
  const fee = BigInt('1000');
  const amountToSend = BigInt('50000000');

  const remaining = balance - fee - amountToSend;

  console.log(`Balance:       ${HoosatUtils.sompiToAmount(balance.toString())} HTN`);
  console.log(`Fee:           ${HoosatUtils.sompiToAmount(fee.toString())} HTN`);
  console.log(`Send Amount:   ${HoosatUtils.sompiToAmount(amountToSend.toString())} HTN`);
  console.log(`Remaining:     ${HoosatUtils.sompiToAmount(remaining.toString())} HTN`);

  console.log('\n');

  // ==================== TIPS ====================
  console.log('💡 Tips:');
  console.log('─────────────────────────────────────');
  console.log('1. Always use BigInt for sompi calculations');
  console.log('2. Convert to HTN only for display purposes');
  console.log('3. Max 8 decimal places for HTN amounts');
  console.log('4. 1 HTN = 100,000,000 sompi');
  console.log('5. Validate user input with isValidAmount()');
  console.log('─────────────────────────────────────\n');
}

main();
