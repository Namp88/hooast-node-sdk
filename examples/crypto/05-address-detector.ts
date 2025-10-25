/**
 * Example: Address Detector
 *
 * Demonstrates:
 * - Detecting address type (Schnorr, ECDSA, P2SH)
 * - Validating address format
 * - Detecting network (mainnet/testnet)
 * - Getting address version byte
 * - Full address information display
 *
 * Prerequisites:
 * - None (works offline)
 *
 * Usage:
 * 1. Replace the address in the main() function
 * 2. Run: ts-node examples/crypto/05-address-detector.ts
 */

import { HoosatCrypto, HoosatUtils } from '../../src';

/**
 * Analyzes and displays detailed information about a Hoosat address
 * @param address - The Hoosat address to analyze
 */
function detectAddress(address: string): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    HOOSAT ADDRESS DETECTOR');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('Address:');
  console.log(`  ${address}\n`);

  // ==================== VALIDATION ====================
  const isValid = HoosatUtils.isValidAddress(address);

  console.log('Validation:');
  console.log(`  Valid:          ${isValid ? '✓ Yes' : '✗ No'}`);

  if (!isValid) {
    console.log('\n❌ Invalid address format!\n');
    console.log('Expected format:');
    console.log('  - Mainnet:  hoosat:q...');
    console.log('  - Testnet:  hoosattest:q...\n');
    console.log('═══════════════════════════════════════════════════════════════\n');
    return;
  }

  // ==================== ADDRESS TYPE ====================
  const addressType = HoosatUtils.getAddressType(address);
  const version = HoosatUtils.getAddressVersion(address);

  console.log(`  Type:           ${addressType?.toUpperCase()}`);
  console.log(`  Version:        0x${version?.toString(16).padStart(2, '0')}`);

  // Display type-specific information
  let typeDescription = '';
  let signatureAlgorithm = '';

  switch (addressType) {
    case 'schnorr':
      typeDescription = 'Schnorr signature (P2PK)';
      signatureAlgorithm = 'Schnorr signature over secp256k1';
      break;
    case 'ecdsa':
      typeDescription = 'ECDSA signature (P2PK) - Current standard';
      signatureAlgorithm = 'ECDSA signature over secp256k1';
      break;
    case 'p2sh':
      typeDescription = 'Pay to Script Hash (Multi-sig/Complex)';
      signatureAlgorithm = 'Script-based (varies)';
      break;
    default:
      typeDescription = 'Unknown type';
      signatureAlgorithm = 'N/A';
  }

  console.log(`  Description:    ${typeDescription}`);
  console.log(`  Signature:      ${signatureAlgorithm}`);

  // ==================== NETWORK ====================
  const network = HoosatUtils.getAddressNetwork(address);

  console.log('\nNetwork:');
  console.log(`  Type:           ${network?.toUpperCase()}`);
  console.log(`  Prefix:         ${network === 'mainnet' ? 'hoosat:' : 'hoosattest:'}`);

  // ==================== DISPLAY ====================
  const truncated = HoosatUtils.truncateAddress(address);

  console.log('\nDisplay:');
  console.log(`  Full:           ${address}`);
  console.log(`  Truncated:      ${truncated}`);

  // ==================== TECHNICAL DETAILS ====================
  console.log('\nTechnical Details:');

  let pubkeySize = '';
  let scriptFormat = '';
  let useCase = '';

  switch (addressType) {
    case 'schnorr':
      pubkeySize = '32 bytes (uncompressed x-coordinate)';
      scriptFormat = '0x20 + pubkey + 0xAC (OP_CHECKSIG)';
      useCase = 'Future standard for regular transactions';
      break;
    case 'ecdsa':
      pubkeySize = '33 bytes (compressed)';
      scriptFormat = '0x21 + pubkey + 0xAB (OP_CHECKSIGECDSA)';
      useCase = 'Current standard for regular transactions';
      break;
    case 'p2sh':
      pubkeySize = '32 bytes (script hash)';
      scriptFormat = '0xAA (OP_BLAKE3) + 0x20 + hash + 0x87 (OP_EQUAL)';
      useCase = 'Multi-signature wallets, complex conditions';
      break;
  }

  console.log(`  Pubkey Size:    ${pubkeySize}`);
  console.log(`  Script Format:  ${scriptFormat}`);
  console.log(`  Use Case:       ${useCase}`);

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

/**
 * Main function - analyze multiple addresses
 */
function main() {
  console.clear();
  console.log('\n');

  // ==================== EXAMPLE 1: TESTNET ECDSA ADDRESS ====================
  console.log('Example 1: Testnet ECDSA Address\n');
  detectAddress('hoosat:qypz50uljgkuvkcejdru769fhxpl483rlvkx0x3yn797rjd3l2fwqysf5gmcg8z');

  // ==================== EXAMPLE 2: MAINNET ECDSA ADDRESS ====================
  console.log('Example 2: Mainnet ECDSA Address (generated)\n');
  const mainnetWallet = HoosatCrypto.generateKeyPair('mainnet');
  detectAddress(mainnetWallet.address);

  // ==================== EXAMPLE 3: SCHNORR ADDRESS ====================
  console.log('Example 3: Schnorr Address (demo)\n');
  const schnorrPubkey = Buffer.from('a'.repeat(64), 'hex'); // 32 bytes
  const schnorrAddress = HoosatCrypto.publicKeyToAddress(schnorrPubkey, 'mainnet');
  detectAddress(schnorrAddress);

  // ==================== EXAMPLE 4: P2SH ADDRESS ====================
  console.log('Example 4: P2SH Address (demo)\n');
  const bech32 = require('@libs/bech32-hoosat');
  const redeemScript = Buffer.from('sample multisig script', 'utf8');
  const p2shHash = HoosatCrypto.blake3Hash(redeemScript);
  const p2shAddress = bech32.encode('hoosat', p2shHash, 0x08);
  detectAddress(p2shAddress);

  // ==================== EXAMPLE 5: INVALID ADDRESS ====================
  console.log('Example 5: Invalid Address\n');
  detectAddress('invalid-address-format');

  // ==================== USAGE INSTRUCTIONS ====================
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                      HOW TO USE THIS EXAMPLE');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('To analyze your own address:');
  console.log('1. Replace the address in the main() function');
  console.log('2. Or use the detectAddress() function directly:\n');
  console.log('   detectAddress("hoosat:qyour_address_here");\n');
  console.log('3. Run: ts-node examples/crypto/05-address-detector.ts\n');
  console.log('Supported address types:');
  console.log('  • Schnorr (0x00)  - 32-byte Schnorr public key');
  console.log('  • ECDSA (0x01)    - 33-byte ECDSA compressed public key (default)');
  console.log('  • P2SH (0x08)     - 32-byte script hash\n');
  console.log('Supported networks:');
  console.log('  • Mainnet:  hoosat:q...');
  console.log('  • Testnet:  hoosattest:q...\n');
  console.log('═══════════════════════════════════════════════════════════════\n');
}

// Run the example
main();
