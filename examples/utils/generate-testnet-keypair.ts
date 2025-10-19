/**
 * Generate Testnet Keypair
 *
 * Simple utility to generate a testnet keypair for testing
 */

import { HoosatCrypto } from 'hoosat-sdk';

console.log('\n═══════════════════════════════════════════════════════════');
console.log('   🔑 GENERATE TESTNET KEYPAIR');
console.log('═══════════════════════════════════════════════════════════\n');

// Generate new keypair
const keypair = HoosatCrypto.generateKeyPair('testnet');

console.log('Keypair generated successfully!\n');

// Convert Buffer to hex string
const privateKeyHex = keypair.privateKey.toString('hex');
const publicKeyHex = keypair.publicKey.toString('hex');

console.log('Private Key:', privateKeyHex);
console.log('Public Key: ', publicKeyHex);
console.log('Address:    ', keypair.address);

console.log('\n─────────────────────────────────────────────────────────────');
console.log('⚠️  SAVE YOUR PRIVATE KEY SECURELY!');
console.log('─────────────────────────────────────────────────────────────\n');

console.log('To use this keypair for testnet testing:\n');
console.log('1. Set environment variable:');
console.log('   PowerShell:');
console.log(`   $env:TESTNET_PRIVATE_KEY="${privateKeyHex}"`);
console.log('\n   CMD:');
console.log(`   set TESTNET_PRIVATE_KEY=${privateKeyHex}`);
console.log('\n2. Share your address with Tonto to receive testnet coins:');
console.log(`   ${keypair.address}`);
console.log('\n3. Run payload tests:');
console.log('   npx tsx examples/transaction/12-testnet-subnetwork-payload.ts\n');
