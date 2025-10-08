/**
 * Example: Formatting Utilities
 *
 * Demonstrates:
 * - Formatting amounts for display
 * - Truncating addresses and hashes
 * - Formatting hashrate and difficulty
 * - Formatting for different contexts (UI, logs, etc.)
 *
 * Prerequisites:
 * - None (works offline)
 */

import { HoosatUtils } from 'hoosat-sdk';

function main() {
  console.log('Formatting Utilities\n');

  // ==================== AMOUNT FORMATTING ====================
  console.log('1. Amount Formatting');
  console.log('─────────────────────────────────────');

  const amounts = ['1.5', '1234567.89', '0.00000001', '999999999.99999999'];

  amounts.forEach(amount => {
    const formatted = HoosatUtils.formatAmount(amount);
    console.log(`${amount.padEnd(20)} -> ${formatted} HTN`);
  });

  console.log('\n');

  // Custom decimal places
  console.log('Custom Decimal Places:');
  console.log('─────────────────────────────────────');

  const value = '123.456789';
  [2, 4, 6, 8].forEach(decimals => {
    const formatted = HoosatUtils.formatAmount(value, decimals);
    console.log(`${decimals} decimals: ${formatted} HTN`);
  });

  console.log('\n');

  // ==================== ADDRESS TRUNCATION ====================
  console.log('2. Address Truncation');
  console.log('─────────────────────────────────────');

  const fullAddress = 'hoosat:qz7ulu8mmmul6hdcnssmjnt28h2xfer8dz9nfqamvvh86ngef4q8dvzxcjdqe';

  console.log(`Full:       ${fullAddress}`);
  console.log(`Default:    ${HoosatUtils.truncateAddress(fullAddress)}`);
  console.log(`Short:      ${HoosatUtils.truncateAddress(fullAddress, 10, 6)}`);
  console.log(`Long:       ${HoosatUtils.truncateAddress(fullAddress, 20, 12)}`);
  console.log();

  // Validation
  const truncated = HoosatUtils.truncateAddress(fullAddress);
  console.log(`Truncated is valid address: ${HoosatUtils.isValidAddress(truncated) ? 'Yes' : 'No (as expected)'}`);
  console.log(`Original is valid address:  ${HoosatUtils.isValidAddress(fullAddress) ? 'Yes' : 'No'}`);

  console.log('\n');

  // ==================== HASH TRUNCATION ====================
  console.log('3. Hash Truncation');
  console.log('─────────────────────────────────────');

  const fullHash = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd';

  console.log(`Full Hash:  ${fullHash}`);
  console.log(`Default:    ${HoosatUtils.truncateHash(fullHash)}`);
  console.log(`Short:      ${HoosatUtils.truncateHash(fullHash, 6, 6)}`);
  console.log(`Long:       ${HoosatUtils.truncateHash(fullHash, 16, 16)}`);

  console.log('\n');

  // ==================== HASHRATE FORMATTING ====================
  console.log('4. Hashrate Formatting');
  console.log('─────────────────────────────────────');

  const hashrates = [
    1000, // 1 KH/s
    1000000, // 1 MH/s
    1000000000, // 1 GH/s
    1500000000000, // 1.5 TH/s
    2500000000000000, // 2.5 PH/s
  ];

  hashrates.forEach(rate => {
    const formatted = HoosatUtils.formatHashrate(rate);
    console.log(`${rate.toString().padStart(20)} H/s = ${formatted}`);
  });

  console.log('\n');

  // Parse hashrate back
  console.log('Parse Hashrate:');
  console.log('─────────────────────────────────────');

  const formattedRates = ['1.5 TH/s', '150 MH/s', '5 KH/s'];
  formattedRates.forEach(formatted => {
    const parsed = HoosatUtils.parseHashrate(formatted);
    console.log(`${formatted.padEnd(12)} -> ${parsed} H/s`);
  });

  console.log('\n');

  // ==================== DIFFICULTY FORMATTING ====================
  console.log('5. Difficulty Formatting');
  console.log('─────────────────────────────────────');

  const difficulties = [
    1000, // 1 K
    1000000, // 1 M
    1000000000, // 1 G
    1500000000000, // 1.5 T
    2500000000000000, // 2.5 P
  ];

  difficulties.forEach(diff => {
    const formatted = HoosatUtils.formatDifficulty(diff);
    console.log(`${diff.toString().padStart(20)} = ${formatted}`);
  });

  console.log('\n');

  // ==================== COMPARISON ====================
  console.log('6. String Comparison (Case-insensitive)');
  console.log('─────────────────────────────────────');

  const addr1 = 'hoosat:qz7ulu8mmmul6hdcnssmjnt28h2xfer8dz9nfqamvvh86ngef4q8dvzxcjdqe';
  const addr2 = 'HOOSAT:QZ7ULU8MMMUL6HDCNSSMJNT28H2XFER8DZ9NFQAMVVH86NGEF4Q8DVZXCJDQE';
  const addr3 = 'hoosat:qq8xdvhkh5k8rvqvpp4z0w9t62q36qltvwa9j2fvvz8d2rw07vl7c7ux7nz0l';

  console.log(`Same address (different case):`);
  console.log(`  Compare: ${HoosatUtils.compareAddresses(addr1, addr2) ? 'Match' : 'No match'}`);

  console.log(`\nDifferent addresses:`);
  console.log(`  Compare: ${HoosatUtils.compareAddresses(addr1, addr3) ? 'Match' : 'No match'}`);

  console.log('\n');

  const hash1 = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd';
  const hash2 = 'A1B2C3D4E5F6789012345678901234567890123456789012345678901234ABCD';

  console.log(`Same hash (different case):`);
  console.log(`  Compare: ${HoosatUtils.compareHashes(hash1, hash2) ? 'Match' : 'No match'}`);

  console.log('\n');

  // ==================== PRACTICAL EXAMPLES ====================
  console.log('7. Practical UI Examples');
  console.log('─────────────────────────────────────');

  console.log('\nTransaction Display:');
  console.log(`  From:     ${HoosatUtils.truncateAddress(fullAddress)}`);
  console.log(`  Amount:   ${HoosatUtils.formatAmount('1234567.89')} HTN`);
  console.log(`  TX Hash:  ${HoosatUtils.truncateHash(fullHash)}`);

  console.log('\nNetwork Stats Display:');
  console.log(`  Hashrate:    ${HoosatUtils.formatHashrate(1500000000000)}`);
  console.log(`  Difficulty:  ${HoosatUtils.formatDifficulty(2500000000000)}`);

  console.log('\nBalance Display:');
  const sompiBalance = '123456789012';
  console.log(`  Raw:         ${sompiBalance} sompi`);
  console.log(`  HTN:         ${HoosatUtils.sompiToAmount(sompiBalance)} HTN`);
  console.log(`  Formatted:   ${HoosatUtils.formatAmount(HoosatUtils.sompiToAmount(sompiBalance))} HTN`);

  console.log('\n');

  // ==================== TIPS ====================
  console.log('Tips for Formatting');
  console.log('─────────────────────────────────────');
  console.log('1. Use truncate methods for UI display (tables, lists)');
  console.log('2. Use formatAmount() for user-friendly number display');
  console.log('3. Keep full addresses/hashes in tooltips or detail views');
  console.log('4. Use formatHashrate/Difficulty for network statistics');
  console.log('5. Always validate before formatting (validate first!)');
  console.log('─────────────────────────────────────\n');
}

main();
