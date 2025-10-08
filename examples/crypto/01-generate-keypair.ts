/**
 * Example: Generate New Key Pair
 *
 * Demonstrates:
 * - Generating new ECDSA key pair for mainnet
 * - Generating new ECDSA key pair for testnet
 * - Displaying private key, public key, and address
 * - Understanding address format differences
 * - Security best practices
 *
 * Prerequisites:
 * - None (works offline)
 *
 * ⚠️  WARNING: Never share your private key!
 * Store it securely and never commit to version control.
 */
import { HoosatCrypto, HoosatUtils } from 'hoosat-sdk';

function main() {
  console.log('🔑 Generate New Hoosat Key Pairs\n');

  // ==================== MAINNET WALLET ====================
  console.log('1️⃣  Mainnet Wallet');
  console.log('═════════════════════════════════════');

  const mainnetWallet = HoosatCrypto.generateKeyPair('mainnet');

  console.log('✅ Mainnet key pair generated!\n');
  console.log('📋 Wallet Information:');
  console.log('─────────────────────────────────────');
  console.log(`Private Key: ${mainnetWallet.privateKey.toString('hex')}`);
  console.log(`Public Key:  ${mainnetWallet.publicKey.toString('hex')}`);
  console.log(`Address:     ${mainnetWallet.address}`);
  console.log('─────────────────────────────────────\n');

  const mainnetType = HoosatUtils.getAddressType(mainnetWallet.address);
  const mainnetVersion = HoosatUtils.getAddressVersion(mainnetWallet.address);
  const mainnetNetwork = HoosatUtils.getAddressNetwork(mainnetWallet.address);

  console.log('🏷️  Address Details:');
  console.log(`Type:     ${mainnetType?.toUpperCase()}`);
  console.log(`Version:  0x${mainnetVersion?.toString(16).padStart(2, '0')}`);
  console.log(`Network:  ${mainnetNetwork?.toUpperCase()}`);
  console.log(`Prefix:   hoosat:`);
  console.log(`Truncated: ${HoosatUtils.truncateAddress(mainnetWallet.address)}\n`);

  // ==================== TESTNET WALLET ====================
  console.log('2️⃣  Testnet Wallet');
  console.log('═════════════════════════════════════');

  const testnetWallet = HoosatCrypto.generateKeyPair('testnet');

  console.log('✅ Testnet key pair generated!\n');
  console.log('📋 Wallet Information:');
  console.log('─────────────────────────────────────');
  console.log(`Private Key: ${testnetWallet.privateKey.toString('hex')}`);
  console.log(`Public Key:  ${testnetWallet.publicKey.toString('hex')}`);
  console.log(`Address:     ${testnetWallet.address}`);
  console.log('─────────────────────────────────────\n');

  const testnetType = HoosatUtils.getAddressType(testnetWallet.address);
  const testnetVersion = HoosatUtils.getAddressVersion(testnetWallet.address);
  const testnetNetwork = HoosatUtils.getAddressNetwork(testnetWallet.address);

  console.log('🏷️  Address Details:');
  console.log(`Type:     ${testnetType?.toUpperCase()}`);
  console.log(`Version:  0x${testnetVersion?.toString(16).padStart(2, '0')}`);
  console.log(`Network:  ${testnetNetwork?.toUpperCase()}`);
  console.log(`Prefix:   hoosattest:`);
  console.log(`Truncated: ${HoosatUtils.truncateAddress(testnetWallet.address)}\n`);

  // ==================== COMPARISON ====================
  console.log('🔍 Network Comparison');
  console.log('═════════════════════════════════════');
  console.log('Network   | Prefix       | Example');
  console.log('----------|--------------|---------------------------');
  console.log('Mainnet   | hoosat:      | hoosat:qyp2uxq7rl0...');
  console.log('Testnet   | hoosattest:  | hoosattest:qreey20hdm...');
  console.log('═════════════════════════════════════\n');

  // ==================== VALIDATION ====================
  console.log('✅ Validation:');
  console.log('─────────────────────────────────────');
  console.log(`Mainnet Valid:  ${HoosatUtils.isValidAddress(mainnetWallet.address)}`);
  console.log(`Testnet Valid:  ${HoosatUtils.isValidAddress(testnetWallet.address)}`);
  console.log(`Private Keys:   ${HoosatUtils.isValidPrivateKey(mainnetWallet.privateKey.toString('hex'))}`);
  console.log(`Public Keys:    ${HoosatUtils.isValidPublicKey(mainnetWallet.publicKey.toString('hex'))}\n`);

  // ==================== SAME PRIVATE KEY, DIFFERENT NETWORKS ====================
  console.log('🔐 Same Private Key, Different Networks:');
  console.log('─────────────────────────────────────');
  console.log('Note: The same private key generates different addresses');
  console.log('for mainnet and testnet due to different prefixes.\n');

  const samplePrivateKey = '0000000000000000000000000000000000000000000000000000000000000001';
  const sampleMainnet = HoosatCrypto.importKeyPair(samplePrivateKey, 'mainnet');
  const sampleTestnet = HoosatCrypto.importKeyPair(samplePrivateKey, 'testnet');

  console.log(`Private Key: ${samplePrivateKey}`);
  console.log(`Mainnet:     ${HoosatUtils.truncateAddress(sampleMainnet.address)}`);
  console.log(`Testnet:     ${HoosatUtils.truncateAddress(sampleTestnet.address)}`);
  console.log();

  // ==================== SECURITY REMINDER ====================
  console.log('⚠️  SECURITY REMINDER:');
  console.log('─────────────────────────────────────');
  console.log('1. NEVER share your private key');
  console.log('2. Store it in a secure location (hardware wallet, encrypted file)');
  console.log('3. DO NOT commit it to git or upload online');
  console.log('4. Back up your private key safely');
  console.log('5. Anyone with your private key can spend your funds');
  console.log('6. Use testnet for development and testing');
  console.log('7. Double-check network before sending real funds');
  console.log('─────────────────────────────────────\n');

  // ==================== EXPORT FORMAT ====================
  console.log('💾 Export Format Examples (for backup):');
  console.log('─────────────────────────────────────');

  console.log('\nMainnet Wallet:');
  console.log(
    JSON.stringify(
      {
        network: 'mainnet',
        address: mainnetWallet.address,
        privateKey: mainnetWallet.privateKey.toString('hex'),
        createdAt: new Date().toISOString(),
      },
      null,
      2
    )
  );

  console.log('\nTestnet Wallet:');
  console.log(
    JSON.stringify(
      {
        network: 'testnet',
        address: testnetWallet.address,
        privateKey: testnetWallet.privateKey.toString('hex'),
        createdAt: new Date().toISOString(),
      },
      null,
      2
    )
  );
  console.log();
}

main();
