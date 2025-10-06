/**
 * Example: Import Key Pair from Private Key
 *
 * Demonstrates:
 * - Importing wallet from private key hex
 * - Recovering public key and address
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
  const privateKeyHex = process.env.PRIVATE_KEY || '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';

  console.log('⚠️  WARNING: Never use real private keys in examples!\n');

  // Validate private key format
  if (!HoosatUtils.isValidPrivateKey(privateKeyHex)) {
    console.error('Invalid private key format');
    console.log('Expected: 64-character hexadecimal string (32 bytes)');
    return;
  }

  console.log('Private Key Format: ✅ Valid\n');

  try {
    // Import key pair
    console.log('🔄 Importing key pair...\n');
    const wallet = HoosatCrypto.importKeyPair(privateKeyHex);

    console.log('✅ Key pair imported successfully!\n');

    // Display wallet information
    console.log('📋 Imported Wallet Information:');
    console.log('═════════════════════════════════════');
    console.log(`Private Key: ${wallet.privateKey.toString('hex')}`);
    console.log(`Public Key:  ${wallet.publicKey.toString('hex')}`);
    console.log(`Address:     ${wallet.address}`);
    console.log('═════════════════════════════════════\n');

    // Verify public key derivation
    console.log('🔍 Verification:');
    console.log('─────────────────────────────────────');

    const derivedPublicKey = HoosatCrypto.getPublicKey(wallet.privateKey);
    const publicKeyMatch = derivedPublicKey.equals(wallet.publicKey);

    console.log(`Public Key Match: ${publicKeyMatch ? '✅ Correct' : '❌ Mismatch'}`);

    // Verify address derivation
    const derivedAddress = HoosatCrypto.publicKeyToAddressECDSA(wallet.publicKey);
    const addressMatch = HoosatUtils.compareAddresses(derivedAddress, wallet.address);

    console.log(`Address Match:    ${addressMatch ? '✅ Correct' : '❌ Mismatch'}`);
    console.log('─────────────────────────────────────\n');

    // Address details
    const addressType = HoosatUtils.getAddressType(wallet.address);
    const addressVersion = HoosatUtils.getAddressVersion(wallet.address);

    console.log('🏷️  Address Details:');
    console.log(`Type:      ${addressType?.toUpperCase()}`);
    console.log(`Version:   0x${addressVersion?.toString(16).padStart(2, '0')}`);
    console.log(`Truncated: ${HoosatUtils.truncateAddress(wallet.address)}\n`);

    // Key validation
    console.log('✅ Key Validation:');
    console.log(`Private Key: ${HoosatUtils.isValidPrivateKey(wallet.privateKey.toString('hex')) ? 'Valid' : 'Invalid'}`);
    console.log(`Public Key:  ${HoosatUtils.isValidPublicKey(wallet.publicKey.toString('hex')) ? 'Valid' : 'Invalid'}`);
    console.log(`Address:     ${HoosatUtils.isValidAddress(wallet.address) ? 'Valid' : 'Invalid'}\n`);

    // Security reminder
    console.log('🔒 Security Reminder:');
    console.log('─────────────────────────────────────');
    console.log('1. Store private keys in secure, encrypted storage');
    console.log('2. Use environment variables, not hardcoded values');
    console.log('3. Consider using hardware wallets for large amounts');
    console.log('4. Backup private keys in multiple secure locations');
    console.log('5. Test with small amounts first');
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
