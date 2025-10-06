/**
 * Example: Validation Utilities
 *
 * Demonstrates:
 * - Validating addresses
 * - Validating transaction IDs and hashes
 * - Validating private/public keys
 * - Validating amounts
 * - Array validation
 *
 * Prerequisites:
 * - None (works offline)
 */
import { HoosatUtils } from '../../src';

function main() {
  console.log('✅ Validation Utilities\n');

  // ==================== ADDRESS VALIDATION ====================
  console.log('1️⃣  Address Validation:');
  console.log('─────────────────────────────────────');

  const addressTests = [
    { address: 'hoosat:qz7ulu8mmmul6hdcnssmjnt28h2xfer8dz9nfqamvvh86ngef4q8dvzxcjdqe', expected: true, note: 'Valid Schnorr' },
    { address: 'hoosat:qyp2uxq7rl0a95npw0yay62chv22l4f33hd8nween6g5jcge4lk57tqsfw88n2d', expected: true, note: 'Valid ECDSA' },
    { address: 'kaspa:qz7ulu...', expected: false, note: 'Wrong prefix' },
    { address: 'hoosat:', expected: false, note: 'Incomplete' },
    { address: 'invalid_address', expected: false, note: 'Invalid format' },
  ];

  addressTests.forEach(({ address, expected, note }) => {
    const isValid = HoosatUtils.isValidAddress(address);
    const icon = isValid === expected ? '✅' : '❌';
    const truncated = address.length > 30 ? HoosatUtils.truncateAddress(address) : address;
    console.log(`${icon} ${truncated.padEnd(30)} - ${note}`);
  });

  console.log('\n');

  // ==================== MULTIPLE ADDRESSES ====================
  console.log('2️⃣  Multiple Address Validation:');
  console.log('─────────────────────────────────────');

  const validAddresses = [
    'hoosat:qz7ulu8mmmul6hdcnssmjnt28h2xfer8dz9nfqamvvh86ngef4q8dvzxcjdqe',
    'hoosat:qq8xdvhkh5k8rvqvpp4z0w9t62q36qltvwa9j2fvvz8d2rw07vl7c7ux7nz0l',
  ];

  const invalidAddresses = ['hoosat:qz7ulu...', 'invalid'];

  console.log(`All valid addresses:   ${HoosatUtils.isValidAddresses(validAddresses) ? '✅' : '❌'}`);
  console.log(`Mixed addresses:       ${HoosatUtils.isValidAddresses([...validAddresses, ...invalidAddresses]) ? '✅' : '❌'}`);
  console.log(`Check unique:          ${HoosatUtils.isValidAddresses(validAddresses, true) ? '✅' : '❌'}`);
  console.log(`With duplicates:       ${HoosatUtils.isValidAddresses([validAddresses[0], validAddresses[0]], true) ? '✅' : '❌'}`);

  console.log('\n');

  // ==================== HASH VALIDATION ====================
  console.log('3️⃣  Hash Validation:');
  console.log('─────────────────────────────────────');

  const hashTests = [
    { hash: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd', expected: true, note: 'Valid 64-char hash' },
    { hash: 'A1B2C3D4E5F6789012345678901234567890123456789012345678901234ABCD', expected: true, note: 'Valid uppercase' },
    { hash: 'invalid_hash', expected: false, note: 'Invalid format' },
    { hash: 'a1b2c3', expected: false, note: 'Too short' },
  ];

  hashTests.forEach(({ hash, expected, note }) => {
    const isValid = HoosatUtils.isValidHash(hash);
    const icon = isValid === expected ? '✅' : '❌';
    const truncated = hash.length > 20 ? `${hash.slice(0, 10)}...${hash.slice(-10)}` : hash;
    console.log(`${icon} ${truncated.padEnd(25)} - ${note}`);
  });

  console.log('\n');

  // ==================== TRANSACTION ID VALIDATION ====================
  console.log('4️⃣  Transaction ID Validation:');
  console.log('─────────────────────────────────────');

  const txId = '091ea22a707ac840c8291706fca5421a61ee03147f3f9655133d5b62ec38f29f';
  console.log(`Valid TX ID:   ${HoosatUtils.isValidTransactionId(txId) ? '✅' : '❌'}`);
  console.log(`Invalid TX ID: ${HoosatUtils.isValidTransactionId('invalid') ? '✅' : '❌'}`);

  console.log('\n');

  // ==================== BLOCK HASH VALIDATION ====================
  console.log('5️⃣  Block Hash Validation:');
  console.log('─────────────────────────────────────');

  const blockHash = 'f1e2d3c4b5a6978012345678901234567890123456789012345678901234cdef';
  console.log(`Valid Block Hash:   ${HoosatUtils.isValidBlockHash(blockHash) ? '✅' : '❌'}`);
  console.log(`Invalid Block Hash: ${HoosatUtils.isValidBlockHash('short') ? '✅' : '❌'}`);

  console.log('\n');

  // ==================== KEY VALIDATION ====================
  console.log('6️⃣  Private/Public Key Validation:');
  console.log('─────────────────────────────────────');

  const privateKey = '0000000000000000000000000000000000000000000000000000000000000001';
  const publicKeyCompressed = '02eddf8d68ad880ec15b9d0de338d62f53630af2efc2e2d3a03e2f7a65c379fbaa';
  const publicKeyUncompressed = '04' + 'e'.repeat(128);

  console.log(`Valid Private Key (32 bytes):       ${HoosatUtils.isValidPrivateKey(privateKey) ? '✅' : '❌'}`);
  console.log(`Valid Compressed Pubkey (33 bytes): ${HoosatUtils.isValidPublicKey(publicKeyCompressed) ? '✅' : '❌'}`);
  console.log(`Valid Uncompressed Pubkey (65):     ${HoosatUtils.isValidPublicKey(publicKeyUncompressed, false) ? '✅' : '❌'}`);
  console.log(`Invalid Key:                        ${HoosatUtils.isValidPrivateKey('short') ? '✅' : '❌'}`);

  console.log('\n');

  // ==================== AMOUNT VALIDATION ====================
  console.log('7️⃣  Amount Validation:');
  console.log('─────────────────────────────────────');

  const amountTests = [
    { amount: '1.5', expected: true, note: 'Valid decimal' },
    { amount: '1.12345678', expected: true, note: 'Valid 8 decimals' },
    { amount: '1.123456789', expected: false, note: 'Too many decimals' },
    { amount: '-5', expected: false, note: 'Negative number' },
    { amount: 'abc', expected: false, note: 'Not a number' },
    { amount: '0', expected: true, note: 'Zero is valid' },
  ];

  amountTests.forEach(({ amount, expected, note }) => {
    const isValid = HoosatUtils.isValidAmount(amount);
    const icon = isValid === expected ? '✅' : '❌';
    console.log(`${icon} "${amount}".padEnd(15) - ${note}`);
  });

  console.log('\n');

  // ==================== COMPARISON ====================
  console.log('8️⃣  Comparison Utilities:');
  console.log('─────────────────────────────────────');

  const addr1 = 'hoosat:qz7ulu8mmmul6hdcnssmjnt28h2xfer8dz9nfqamvvh86ngef4q8dvzxcjdqe';
  const addr2 = 'HOOSAT:qz7ulu8mmmul6hdcnssmjnt28h2xfer8dz9nfqamvvh86ngef4q8dvzxcjdqe';

  console.log(`Same address (case-insensitive): ${HoosatUtils.compareAddresses(addr1, addr2) ? '✅' : '❌'}`);

  const hash1 = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd';
  const hash2 = 'A1B2C3D4E5F6789012345678901234567890123456789012345678901234ABCD';

  console.log(`Same hash (case-insensitive):    ${HoosatUtils.compareHashes(hash1, hash2) ? '✅' : '❌'}`);

  console.log('\n');

  // ==================== SUMMARY ====================
  console.log('💡 Summary:');
  console.log('─────────────────────────────────────');
  console.log('Available validation methods:');
  console.log('  • isValidAddress()');
  console.log('  • isValidAddresses()');
  console.log('  • isValidHash()');
  console.log('  • isValidTransactionId()');
  console.log('  • isValidBlockHash()');
  console.log('  • isValidHashes()');
  console.log('  • isValidPrivateKey()');
  console.log('  • isValidPublicKey()');
  console.log('  • isValidAmount()');
  console.log('  • compareAddresses()');
  console.log('  • compareHashes()');
  console.log('─────────────────────────────────────\n');
}

main();
