/**
 * Example: Address Types (Schnorr, ECDSA, P2SH)
 *
 * Demonstrates:
 * - Generating different address types
 * - Understanding address versions
 * - Converting between public keys and addresses
 * - Creating ScriptPublicKey for different types
 *
 * Prerequisites:
 * - None (works offline)
 */

import { HoosatCrypto, HoosatUtils } from 'hoosat-sdk';

function main() {
  console.log('Address Types in Hoosat\n');

  // ==================== ECDSA ADDRESS (Version 0x01) ====================
  console.log('1. ECDSA Address (Default)');
  console.log('─────────────────────────────────────');

  const ecdsaWallet = HoosatCrypto.generateKeyPair();
  const ecdsaType = HoosatUtils.getAddressType(ecdsaWallet.address);
  const ecdsaVersion = HoosatUtils.getAddressVersion(ecdsaWallet.address);

  console.log(`Public Key:  ${ecdsaWallet.publicKey.toString('hex')}`);
  console.log(`Length:      ${ecdsaWallet.publicKey.length} bytes (compressed)`);
  console.log(`Address:     ${ecdsaWallet.address}`);
  console.log(`Type:        ${ecdsaType?.toUpperCase()}`);
  console.log(`Version:     0x${ecdsaVersion?.toString(16).padStart(2, '0')}`);
  console.log(`Truncated:   ${HoosatUtils.truncateAddress(ecdsaWallet.address)}`);

  // Script for ECDSA
  const ecdsaScript = HoosatCrypto.addressToScriptPublicKey(ecdsaWallet.address);
  console.log(`Script:      ${ecdsaScript.toString('hex')}`);
  console.log(`Length:      ${ecdsaScript.length} bytes`);
  console.log(
    `Format:      0x${ecdsaScript[0].toString(16)} (length) + pubkey + 0x${ecdsaScript[ecdsaScript.length - 1].toString(16)} (OP_CHECKSIGECDSA)`
  );

  console.log('\n');

  // ==================== SCHNORR ADDRESS (Version 0x00) ====================
  console.log('2. Schnorr Address');
  console.log('─────────────────────────────────────');

  // For demo purposes, create a sample 32-byte Schnorr public key
  const schnorrPubkey = Buffer.from('a'.repeat(64), 'hex'); // 32 bytes
  const schnorrAddress = HoosatCrypto.publicKeyToAddress(schnorrPubkey);
  const schnorrType = HoosatUtils.getAddressType(schnorrAddress);
  const schnorrVersion = HoosatUtils.getAddressVersion(schnorrAddress);

  console.log(`Public Key:  ${schnorrPubkey.toString('hex')}`);
  console.log(`Length:      ${schnorrPubkey.length} bytes`);
  console.log(`Address:     ${schnorrAddress}`);
  console.log(`Type:        ${schnorrType?.toUpperCase()}`);
  console.log(`Version:     0x${schnorrVersion?.toString(16).padStart(2, '0')}`);
  console.log(`Truncated:   ${HoosatUtils.truncateAddress(schnorrAddress)}`);

  // Script for Schnorr
  const schnorrScript = HoosatCrypto.addressToScriptPublicKey(schnorrAddress);
  console.log(`Script:      ${schnorrScript.toString('hex')}`);
  console.log(`Length:      ${schnorrScript.length} bytes`);
  console.log(
    `Format:      0x${schnorrScript[0].toString(16)} (length) + pubkey + 0x${schnorrScript[schnorrScript.length - 1].toString(16)} (OP_CHECKSIG)`
  );

  console.log('\n');

  // ==================== P2SH ADDRESS (Version 0x08) ====================
  console.log('3. P2SH Address (Pay to Script Hash)');
  console.log('─────────────────────────────────────');

  // Generate a valid P2SH address from a script hash
  // For demo: hash of a sample redeem script
  const redeemScript = Buffer.from('sample multisig script', 'utf8');
  const p2shHash = HoosatCrypto.blake3Hash(redeemScript); // 32 bytes script hash

  // Import bech32 library to create P2SH address
  const bech32 = require('@libs/bech32-hoosat');
  const p2shAddress = bech32.encode('hoosat', p2shHash, 0x08);

  const p2shType = HoosatUtils.getAddressType(p2shAddress);
  const p2shVersion = HoosatUtils.getAddressVersion(p2shAddress);

  console.log(`Redeem Script: ${redeemScript.toString('utf8')}`);
  console.log(`Script Hash:   ${p2shHash.toString('hex')}`);
  console.log(`Length:        ${p2shHash.length} bytes`);
  console.log(`Address:       ${p2shAddress}`);
  console.log(`Type:          ${p2shType?.toUpperCase()}`);
  console.log(`Version:       0x${p2shVersion?.toString(16).padStart(2, '0')}`);
  console.log(`Truncated:     ${HoosatUtils.truncateAddress(p2shAddress)}`);
  console.log(`Valid:         ${HoosatUtils.isValidAddress(p2shAddress) ? 'Yes' : 'No'}`);

  // Generate ScriptPublicKey
  const p2shScript = HoosatCrypto.addressToScriptPublicKey(p2shAddress);
  console.log(`Script:        ${p2shScript.toString('hex')}`);
  console.log(`Length:        ${p2shScript.length} bytes`);
  console.log(`Format:        0xAA (OP_BLAKE3) + 0x20 (OP_DATA_32) + hash + 0x87 (OP_EQUAL)`);

  console.log('\n');

  // ==================== NETWORK PREFIXES ====================
  console.log('4. Network Prefixes (Mainnet vs Testnet)');
  console.log('─────────────────────────────────────');

  console.log('Hoosat supports two networks with different prefixes:\n');

  // Generate same private key for both networks
  const privateKey = Buffer.from('0'.repeat(63) + '1', 'hex');
  const mainnetWallet = HoosatCrypto.importKeyPair(privateKey.toString('hex'), 'mainnet');
  const testnetWallet = HoosatCrypto.importKeyPair(privateKey.toString('hex'), 'testnet');

  console.log('Same Private Key on Different Networks:');
  console.log(`Private Key: ${privateKey.toString('hex')}`);
  console.log();

  console.log('Mainnet:');
  console.log(`  Prefix:  hoosat:`);
  console.log(`  Address: ${mainnetWallet.address}`);
  console.log(`  Network: ${HoosatUtils.getAddressNetwork(mainnetWallet.address)}`);
  console.log(`  Valid:   ${HoosatUtils.isValidAddress(mainnetWallet.address) ? 'Yes' : 'No'}`);
  console.log();

  console.log('Testnet:');
  console.log(`  Prefix:  hoosattest:`);
  console.log(`  Address: ${testnetWallet.address}`);
  console.log(`  Network: ${HoosatUtils.getAddressNetwork(testnetWallet.address)}`);
  console.log(`  Valid:   ${HoosatUtils.isValidAddress(testnetWallet.address) ? 'Yes' : 'No'}`);
  console.log();

  console.log('Real Testnet Example:');
  const realTestnetAddr = 'hoosattest:qypaq8aera9ewdgqfd4xmz3z6hzyfkdg3cshwdeckn0gwn3vsd3zc8cmr0hd3s5';
  console.log(`Address: ${realTestnetAddr}`);
  console.log(`Valid:   ${HoosatUtils.isValidAddress(realTestnetAddr) ? 'Yes' : 'No'}`);
  console.log(`Type:    ${HoosatUtils.getAddressType(realTestnetAddr)?.toUpperCase()}`);
  console.log(`Network: ${HoosatUtils.getAddressNetwork(realTestnetAddr)}`);

  console.log('\n');

  // ==================== COMPARISON ====================
  console.log('Updated Comparison Table');
  console.log('═════════════════════════════════════');
  console.log('Type      | Version | Pubkey Size | Use Case          | Networks');
  console.log('----------|---------|-------------|-------------------|----------');
  console.log('Schnorr   | 0x00    | 32 bytes    | Standard (future) | Both');
  console.log('ECDSA     | 0x01    | 33 bytes    | Standard (current)| Both');
  console.log('P2SH      | 0x08    | 32 bytes    | Multi-sig, complex| Both');
  console.log('═════════════════════════════════════');
  console.log('Networks: Mainnet (hoosat:) and Testnet (hoosattest:)');
  console.log('═════════════════════════════════════\n');

  // ==================== VALIDATION ====================
  console.log('Address Validation');
  console.log('─────────────────────────────────────');

  const addresses = [
    { addr: ecdsaWallet.address, name: 'ECDSA' },
    { addr: schnorrAddress, name: 'Schnorr' },
  ];

  addresses.forEach(({ addr, name }) => {
    const valid = HoosatUtils.isValidAddress(addr);
    const type = HoosatUtils.getAddressType(addr);
    console.log(`${name.padEnd(10)}: ${valid ? 'Valid' : 'Invalid'} - Type: ${type?.toUpperCase()}`);
  });

  console.log('\n');

  // ==================== PRACTICAL NOTES ====================
  console.log('Updated Practical Notes');
  console.log('─────────────────────────────────────');
  console.log('1. ECDSA (0x01) is currently used by default');
  console.log('2. generateKeyPair() creates ECDSA addresses');
  console.log('3. Both Schnorr and ECDSA use secp256k1 curve');
  console.log('4. P2SH allows for complex spending conditions');
  console.log('5. Address type determined by version byte');
  console.log('6. All addresses use Bech32 encoding');
  console.log('7. Mainnet prefix: "hoosat:"');
  console.log('8. Testnet prefix: "hoosattest:"');
  console.log('9. Same private key = different addresses on different networks');
  console.log('10. Always verify network before sending funds');
  console.log('─────────────────────────────────────\n');
}

main();
