/**
 * Example: Hashing Utilities
 *
 * Demonstrates:
 * - Blake3 single hash
 * - Blake3 double hash (for transaction IDs)
 * - Blake3 keyed hash (Hoosat-specific)
 * - Computing transaction IDs
 *
 * Prerequisites:
 * - None (works offline)
 */
import { HoosatCrypto, HoosatUtils } from 'hoosat-sdk';

function main() {
  console.log('Hashing Utilities\n');

  // ==================== BLAKE3 SINGLE HASH ====================
  console.log('1. Blake3 Single Hash');
  console.log('─────────────────────────────────────');

  const data1 = Buffer.from('Hello Hoosat!', 'utf8');
  const hash1 = HoosatCrypto.blake3Hash(data1);

  console.log(`Input:  "${data1.toString('utf8')}"`);
  console.log(`Hash:   ${hash1.toString('hex')}`);
  console.log(`Length: ${hash1.length} bytes`);
  console.log();

  // Different inputs produce different hashes
  const data2 = Buffer.from('Hello hoosat!', 'utf8'); // lowercase 'h'
  const hash2 = HoosatCrypto.blake3Hash(data2);

  console.log(`Input:  "${data2.toString('utf8')}"`);
  console.log(`Hash:   ${hash2.toString('hex')}`);
  console.log(`Match:  ${hash1.equals(hash2) ? 'Yes' : 'No (different inputs)'}`);
  console.log('\n');

  // ==================== BLAKE3 DOUBLE HASH ====================
  console.log('2. Blake3 Double Hash (Transaction IDs)');
  console.log('─────────────────────────────────────');

  const txData = Buffer.from('sample transaction data', 'utf8');
  const singleHash = HoosatCrypto.blake3Hash(txData);
  const doubleHash = HoosatCrypto.doubleBlake3Hash(txData);

  console.log(`Input:        "${txData.toString('utf8')}"`);
  console.log(`Single Hash:  ${singleHash.toString('hex')}`);
  console.log(`Double Hash:  ${doubleHash.toString('hex')}`);
  console.log();

  // Verify double hash = hash(hash(data))
  const verifyDouble = HoosatCrypto.blake3Hash(singleHash);
  console.log(`Verification: ${verifyDouble.equals(doubleHash) ? 'Correct' : 'Error'}`);
  console.log('\n');

  // ==================== BLAKE3 KEYED HASH ====================
  console.log('3. Blake3 Keyed Hash (Hoosat-specific)');
  console.log('─────────────────────────────────────');

  const keyString = 'TransactionSigningHash';
  const keyedData = Buffer.from('transaction preimage', 'utf8');

  // Keyed hash with string key
  const keyedHash1 = HoosatCrypto.blake3KeyedHash(keyString, keyedData);
  console.log(`Key:         "${keyString}"`);
  console.log(`Data:        "${keyedData.toString('utf8')}"`);
  console.log(`Keyed Hash:  ${keyedHash1.toString('hex')}`);
  console.log();

  // Keyed hash with Buffer key
  const keyBuffer = Buffer.alloc(32);
  Buffer.from('MyCustomKey').copy(keyBuffer); // Zero-padded to 32 bytes
  const keyedHash2 = HoosatCrypto.blake3KeyedHash(keyBuffer, keyedData);
  console.log(`Key (hex):   ${keyBuffer.toString('hex')}`);
  console.log(`Keyed Hash:  ${keyedHash2.toString('hex')}`);
  console.log();

  // Different keys produce different hashes
  const differentKey = 'DifferentKey';
  const keyedHash3 = HoosatCrypto.blake3KeyedHash(differentKey, keyedData);
  console.log(`Different Key: "${differentKey}"`);
  console.log(`Hash:          ${keyedHash3.toString('hex')}`);
  console.log(`Matches:       ${keyedHash1.equals(keyedHash3) ? 'Yes' : 'No (different keys)'}`);
  console.log('\n');

  // ==================== TRANSACTION ID ====================
  console.log('4. Transaction ID Calculation');
  console.log('─────────────────────────────────────');

  // Sample transaction structure
  const sampleTransaction = {
    version: 0,
    inputs: [
      {
        previousOutpoint: {
          transactionId: 'a'.repeat(64),
          index: 0,
        },
        signatureScript: 'b'.repeat(130),
        sequence: '0',
        sigOpCount: 1,
      },
    ],
    outputs: [
      {
        amount: '100000000',
        scriptPublicKey: {
          scriptPublicKey: 'c'.repeat(70),
          version: 0,
        },
      },
    ],
    lockTime: '0',
    subnetworkId: '0'.repeat(40),
    gas: '0',
    payload: '',
  };

  const txId = HoosatCrypto.getTransactionId(sampleTransaction);

  console.log('Sample Transaction:');
  console.log(`  Inputs:  ${sampleTransaction.inputs.length}`);
  console.log(`  Outputs: ${sampleTransaction.outputs.length}`);
  console.log();
  console.log(`Transaction ID: ${txId}`);
  console.log(`Truncated:      ${HoosatUtils.truncateHash(txId)}`);
  console.log(`Valid Format:   ${HoosatUtils.isValidTransactionId(txId) ? 'Yes' : 'No'}`);
  console.log('\n');

  // ==================== HASH VALIDATION ====================
  console.log('5. Hash Validation');
  console.log('─────────────────────────────────────');

  const testHashes = [
    { hash: hash1.toString('hex'), valid: true },
    { hash: 'invalid', valid: false },
    { hash: '123', valid: false },
  ];

  testHashes.forEach(({ hash, valid }) => {
    const isValid = HoosatUtils.isValidHash(hash);
    const status = isValid === valid ? 'Correct' : 'Error';
    const truncated = hash.length > 20 ? HoosatUtils.truncateHash(hash) : hash;
    console.log(`${truncated.padEnd(25)} - ${isValid ? 'Valid' : 'Invalid'} (${status})`);
  });

  console.log('\n');

  // ==================== USE CASES ====================
  console.log('Common Use Cases');
  console.log('─────────────────────────────────────');
  console.log('blake3Hash():        General purpose hashing');
  console.log('doubleBlake3Hash():  Transaction IDs, Block hashes');
  console.log('blake3KeyedHash():   Signature hashing (internal)');
  console.log('getTransactionId():  Calculate TX ID from transaction');
  console.log('─────────────────────────────────────\n');
}

main();
