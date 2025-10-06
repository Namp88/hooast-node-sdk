/**
 * Example: Generate New Key Pair
 *
 * Demonstrates:
 * - Generating new ECDSA key pair
 * - Displaying private key, public key, and address
 * - Understanding address format
 * - Security best practices
 *
 * Prerequisites:
 * - None (works offline)
 *
 * ⚠️  WARNING: Never share your private key!
 * Store it securely and never commit to version control.
 */
import { HoosatCrypto, HoosatUtils } from '../../src';

function main() {
  console.log('🔑 Generate New Hoosat Key Pair\n');

  // Generate new ECDSA key pair
  const wallet = HoosatCrypto.generateKeyPair();

  console.log('✅ Key pair generated successfully!\n');

  // Display wallet information
  console.log('📋 Wallet Information:');
  console.log('─────────────────────────────────────');
  console.log(`Private Key: ${wallet.privateKey.toString('hex')}`);
  console.log(`Public Key:  ${wallet.publicKey.toString('hex')}`);
  console.log(`Address:     ${wallet.address}`);
  console.log('─────────────────────────────────────\n');

  // Get address details
  const addressType = HoosatUtils.getAddressType(wallet.address);
  const addressVersion = HoosatUtils.getAddressVersion(wallet.address);

  console.log('🏷️  Address Details:');
  console.log(`Type:     ${addressType?.toUpperCase()}`);
  console.log(`Version:  0x${addressVersion?.toString(16).padStart(2, '0')}`);
  console.log(`Truncated: ${HoosatUtils.truncateAddress(wallet.address)}\n`);

  // Validation
  console.log('✅ Validation:');
  console.log(`Valid Address:     ${HoosatUtils.isValidAddress(wallet.address)}`);
  console.log(`Valid Private Key: ${HoosatUtils.isValidPrivateKey(wallet.privateKey.toString('hex'))}`);
  console.log(`Valid Public Key:  ${HoosatUtils.isValidPublicKey(wallet.publicKey.toString('hex'))}\n`);

  // Security reminder
  console.log('⚠️  SECURITY REMINDER:');
  console.log('─────────────────────────────────────');
  console.log('1. NEVER share your private key');
  console.log('2. Store it in a secure location (hardware wallet, encrypted file)');
  console.log('3. DO NOT commit it to git or upload online');
  console.log('4. Back up your private key safely');
  console.log('5. Anyone with your private key can spend your funds');
  console.log('─────────────────────────────────────\n');

  // Export format example
  console.log('💾 Export Format (for backup):');
  console.log(
    JSON.stringify(
      {
        address: wallet.address,
        privateKey: wallet.privateKey.toString('hex'),
        createdAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
}

main();
