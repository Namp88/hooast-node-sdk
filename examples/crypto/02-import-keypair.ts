/**
 * Example: Import Key Pair from Private Key
 *
 * Demonstrates:
 * - Importing wallet from private key hex
 * - Recovering public key and address for mainnet
 * - Recovering public key and address for testnet
 * - Validating imported keys
 * - Verifying address derivation
 *
 * Prerequisites:
 * - None (works offline)
 * - Valid private key in hex format
 */
import { HoosatCrypto, HoosatUtils } from '../../src';

function main() {
  console.log('🔐 Import Key Pair from Private Key\n');

  // Get private key from environment or use example (DON'T USE THIS KEY IN PRODUCTION!)
  const privateKeyHexMainnet = process.env.PRIVATE_KEY_MAINNET || '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';
  const privateKeyHexTestnet = process.env.PRIVATE_KEY_TESTNET || 'c4f96415b32e27e2612345138cdbc53b5ca2b8bde69b81f852b00880950cb3d6';

  console.log('⚠️  WARNING: Never use real private keys in examples!\n');

  // Validate private key format
  if (!HoosatUtils.isValidPrivateKey(privateKeyHexMainnet)) {
    console.error('Invalid private key format');
    console.log('Expected: 64-character hexadecimal string (32 bytes)');
    return;
  }

  console.log('Private Key Format: ✅ Valid\n');

  try {
    // ==================== MAINNET IMPORT ====================
    console.log('1️⃣  Mainnet Import');
    console.log('═════════════════════════════════════');
    console.log('🔄 Importing for mainnet...\n');

    const mainnetWallet = HoosatCrypto.importKeyPair(privateKeyHexMainnet, 'mainnet');

    console.log('✅ Mainnet wallet imported!\n');
    console.log('📋 Mainnet Wallet:');
    console.log('─────────────────────────────────────');
    console.log(`Private Key: ${mainnetWallet.privateKey.toString('hex')}`);
    console.log(`Public Key:  ${mainnetWallet.publicKey.toString('hex')}`);
    console.log(`Address:     ${mainnetWallet.address}`);
    console.log('─────────────────────────────────────\n');

    // Mainnet verification
    const mainnetDerivedPubKey = HoosatCrypto.getPublicKey(mainnetWallet.privateKey);
    const mainnetDerivedAddr = HoosatCrypto.publicKeyToAddressECDSA(mainnetWallet.publicKey, 'mainnet');

    console.log('🔍 Mainnet Verification:');
    console.log(`Public Key Match: ${mainnetDerivedPubKey.equals(mainnetWallet.publicKey) ? '✅ Correct' : '❌ Mismatch'}`);
    console.log(
      `Address Match:    ${HoosatUtils.compareAddresses(mainnetDerivedAddr, mainnetWallet.address) ? '✅ Correct' : '❌ Mismatch'}`
    );
    console.log();

    const mainnetType = HoosatUtils.getAddressType(mainnetWallet.address);
    const mainnetVersion = HoosatUtils.getAddressVersion(mainnetWallet.address);
    const mainnetNetwork = HoosatUtils.getAddressNetwork(mainnetWallet.address);

    console.log('🏷️  Mainnet Address Details:');
    console.log(`Type:      ${mainnetType?.toUpperCase()}`);
    console.log(`Version:   0x${mainnetVersion?.toString(16).padStart(2, '0')}`);
    console.log(`Network:   ${mainnetNetwork?.toUpperCase()}`);
    console.log(`Truncated: ${HoosatUtils.truncateAddress(mainnetWallet.address)}\n`);

    // ==================== TESTNET IMPORT ====================
    console.log('2️⃣  Testnet Import');
    console.log('═════════════════════════════════════');
    console.log('🔄 Importing for testnet...\n');

    const testnetWallet = HoosatCrypto.importKeyPair(privateKeyHexTestnet, 'testnet');

    console.log('✅ Testnet wallet imported!\n');
    console.log('📋 Testnet Wallet:');
    console.log('─────────────────────────────────────');
    console.log(`Private Key: ${testnetWallet.privateKey.toString('hex')}`);
    console.log(`Public Key:  ${testnetWallet.publicKey.toString('hex')}`);
    console.log(`Address:     ${testnetWallet.address}`);
    console.log('─────────────────────────────────────\n');

    // Testnet verification
    const testnetDerivedPubKey = HoosatCrypto.getPublicKey(testnetWallet.privateKey);
    const testnetDerivedAddr = HoosatCrypto.publicKeyToAddressECDSA(testnetWallet.publicKey, 'testnet');

    console.log('🔍 Testnet Verification:');
    console.log(`Public Key Match: ${testnetDerivedPubKey.equals(testnetWallet.publicKey) ? '✅ Correct' : '❌ Mismatch'}`);
    console.log(
      `Address Match:    ${HoosatUtils.compareAddresses(testnetDerivedAddr, testnetWallet.address) ? '✅ Correct' : '❌ Mismatch'}`
    );
    console.log();

    const testnetType = HoosatUtils.getAddressType(testnetWallet.address);
    const testnetVersion = HoosatUtils.getAddressVersion(testnetWallet.address);
    const testnetNetwork = HoosatUtils.getAddressNetwork(testnetWallet.address);

    console.log('🏷️  Testnet Address Details:');
    console.log(`Type:      ${testnetType?.toUpperCase()}`);
    console.log(`Version:   0x${testnetVersion?.toString(16).padStart(2, '0')}`);
    console.log(`Network:   ${testnetNetwork?.toUpperCase()}`);
    console.log(`Truncated: ${HoosatUtils.truncateAddress(testnetWallet.address)}\n`);

    // ==================== COMPARISON ====================
    console.log('🔍 Network Comparison');
    console.log('═════════════════════════════════════');
    console.log('Property     | Same?   | Notes');
    console.log('-------------|---------|---------------------------');
    console.log(`Private Key  | ✅ Yes  | ${mainnetWallet.privateKey.equals(testnetWallet.privateKey) ? 'Identical' : 'Different'}`);
    console.log(`Public Key   | ✅ Yes  | ${mainnetWallet.publicKey.equals(testnetWallet.publicKey) ? 'Identical' : 'Different'}`);
    console.log(`Address      | ❌ No   | Different prefixes`);
    console.log('═════════════════════════════════════\n');

    console.log('Addresses:');
    console.log(`Mainnet: ${HoosatUtils.truncateAddress(mainnetWallet.address)}`);
    console.log(`Testnet: ${HoosatUtils.truncateAddress(testnetWallet.address)}`);
    console.log();

    // ==================== KEY VALIDATION ====================
    console.log('✅ Key Validation:');
    console.log('─────────────────────────────────────');
    console.log(`Private Key Valid:    ${HoosatUtils.isValidPrivateKey(mainnetWallet.privateKey.toString('hex'))}`);
    console.log(`Public Key Valid:     ${HoosatUtils.isValidPublicKey(mainnetWallet.publicKey.toString('hex'))}`);
    console.log(`Mainnet Address:      ${HoosatUtils.isValidAddress(mainnetWallet.address)}`);
    console.log(`Testnet Address:      ${HoosatUtils.isValidAddress(testnetWallet.address)}\n`);

    // ==================== SECURITY REMINDER ====================
    console.log('🔒 Security Reminder:');
    console.log('─────────────────────────────────────');
    console.log('1. Store private keys in secure, encrypted storage');
    console.log('2. Use environment variables, not hardcoded values');
    console.log('3. Consider using hardware wallets for large amounts');
    console.log('4. Backup private keys in multiple secure locations');
    console.log('5. Test with testnet first, then mainnet with small amounts');
    console.log('6. The same private key works for both networks');
    console.log('7. Always verify the network before sending funds');
    console.log('─────────────────────────────────────\n');
  } catch (error) {
    console.error('Failed to import key pair:', error);
    console.log('\nCommon issues:');
    console.log('- Private key must be exactly 64 hex characters (32 bytes)');
    console.log('- Only hexadecimal characters (0-9, a-f) are allowed');
    console.log('- Private key must be a valid secp256k1 key');
  }
}

main();
