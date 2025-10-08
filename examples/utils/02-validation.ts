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
import { HoosatUtils } from 'hoosat-sdk';

function main() {
  console.log('✅ Validation Utilities\n');

  // ==================== ADDRESS VALIDATION ====================
  console.log('1️⃣  Address Validation:');
  console.log('─────────────────────────────────────');

  const addressTests = [
    // Mainnet addresses
    { address: 'hoosat:qz7ulu8mmmul6hdcnssmjnt28h2xfer8dz9nfqamvvh86ngef4q8dvzxcjdqe', expected: true, note: 'Valid Mainnet Schnorr' },
    { address: 'hoosat:qyp2uxq7rl0a95npw0yay62chv22l4f33hd8nween6g5jcge4lk57tqsfw88n2d', expected: true, note: 'Valid Mainnet ECDSA' },

    // Testnet addresses
    { address: 'hoosattest:qreey20hdmz0h8dkae92cvtgx9e4cp464dqn922vmnmcs6llv4r7uylr2nvgc', expected: true, note: 'Valid Testnet ECDSA' },
    { address: 'hoosattest:qz7ulu8mmmul6hdcnssmjnt28h2xfer8dz9nfqamvvh86ngef4q8dvx72zy9w', expected: true, note: 'Valid Testnet Schnorr' },

    // Invalid addresses
    { address: 'kaspa:qz7ulu...', expected: false, note: 'Wrong prefix (kaspa)' },
    { address: 'hoosat:', expected: false, note: 'Incomplete mainnet' },
    { address: 'hoosattest:', expected: false, note: 'Incomplete testnet' },
    { address: 'invalid_address', expected: false, note: 'Invalid format' },
  ];

  addressTests.forEach(({ address, expected, note }) => {
    const isValid = HoosatUtils.isValidAddress(address);
    const icon = isValid === expected ? '✅' : '❌';
    const truncated = address.length > 30 ? HoosatUtils.truncateAddress(address) : address;
    const network = HoosatUtils.getAddressNetwork(address);
    const networkStr = network ? ` [${network}]` : '';
    console.log(`${icon} ${truncated.padEnd(35)}${networkStr.padEnd(12)} - ${note}`);
  });

  console.log('\n');

  // ==================== NETWORK DETECTION ====================
  console.log('1.5️⃣ Network Detection:');
  console.log('─────────────────────────────────────');

  const networkTests = [
    { address: 'hoosat:qz7ulu8mmmul6hdcnssmjnt28h2xfer8dz9nfqamvvh86ngef4q8dvzxcjdqe', expected: 'mainnet' },
    { address: 'hoosattest:qreey20hdmz0h8dkae92cvtgx9e4cp464dqn922vmnmcs6llv4r7uylr2nvgc', expected: 'testnet' },
    { address: 'invalid', expected: null },
  ];

  networkTests.forEach(({ address, expected }) => {
    const network = HoosatUtils.getAddressNetwork(address);
    const icon = network === expected ? '✅' : '❌';
    const truncated = address.length > 30 ? HoosatUtils.truncateAddress(address) : address;
    console.log(`${icon} ${truncated.padEnd(35)} → ${network || 'null'}`);
  });

  console.log('\n');

  // ==================== MULTIPLE ADDRESSES ====================
  console.log('2️⃣  Multiple Address Validation:');
  console.log('─────────────────────────────────────');

  const validMainnetAddresses = [
    'hoosat:qz7ulu8mmmul6hdcnssmjnt28h2xfer8dz9nfqamvvh86ngef4q8dvzxcjdqe',
    'hoosat:qq8xdvhkh5k8rvqvpp4z0w9t62q36qltvwa9j2fvvz8d2rw07vl7c7ux7nz0l',
  ];

  const validTestnetAddresses = [
    'hoosattest:qreey20hdmz0h8dkae92cvtgx9e4cp464dqn922vmnmcs6llv4r7uylr2nvgc',
    'hoosattest:qz7ulu8mmmul6hdcnssmjnt28h2xfer8dz9nfqamvvh86ngef4q8dvx72zy9w',
  ];

  const invalidAddresses = ['hoosat:qz7ulu...', 'invalid'];
  const mixedNetworkAddresses = [...validMainnetAddresses, ...validTestnetAddresses];

  console.log(`All mainnet addresses:      ${HoosatUtils.isValidAddresses(validMainnetAddresses) ? '✅' : '❌'}`);
  console.log(`All testnet addresses:      ${HoosatUtils.isValidAddresses(validTestnetAddresses) ? '✅' : '❌'}`);
  console.log(
    `Mixed network addresses:    ${HoosatUtils.isValidAddresses(mixedNetworkAddresses) ? '✅' : '❌'} (valid - different networks OK)`
  );
  console.log(`With invalid addresses:     ${HoosatUtils.isValidAddresses([...validMainnetAddresses, ...invalidAddresses]) ? '✅' : '❌'}`);
  console.log(`Check unique (no duplicates): ${HoosatUtils.isValidAddresses(validMainnetAddresses, true) ? '✅' : '❌'}`);
  console.log(
    `With duplicates:            ${HoosatUtils.isValidAddresses([validMainnetAddresses[0], validMainnetAddresses[0]], true) ? '✅' : '❌'}`
  );

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
