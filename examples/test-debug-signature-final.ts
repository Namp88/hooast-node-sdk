import { HoosatNode } from '../src';
import { CryptoUtils } from '../src/utils/crypto.utils';
import * as blake3 from 'blake3';
import { createHash } from 'crypto';

/**
 * Детальный debug signature hash с проверкой гипотезы про subscript
 */
async function debugSignatureDetailed() {
  console.log('🔍 Detailed Signature Hash Debug\n');

  const privateKeyHex = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';
  const wallet = CryptoUtils.importKeyPair(privateKeyHex);

  console.log('Wallet:');
  console.log(`  Address: ${wallet.address}`);
  console.log(`  PubKey: ${wallet.publicKey.toString('hex')}\n`);

  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  // Получаем UTXO
  const utxosResult = await node.getUtxosByAddresses([wallet.address]);
  if (!utxosResult.ok || utxosResult.result.utxos.length === 0) {
    console.log('❌ No UTXOs found');
    return;
  }

  const utxo = utxosResult.result.utxos[0];

  console.log('UTXO from node:');
  console.log(`  TxID: ${utxo.outpoint.transactionId}`);
  console.log(`  Amount: ${utxo.utxoEntry.amount} sompi`);
  console.log(`  ScriptPubKey: ${utxo.utxoEntry.scriptPublicKey.scriptPublicKey}`);
  console.log(`  Version: ${utxo.utxoEntry.scriptPublicKey.version}\n`);

  // Парсим script
  const fullScript = Buffer.from(utxo.utxoEntry.scriptPublicKey.scriptPublicKey, 'hex');
  console.log('Script analysis:');
  console.log(`  Full script: ${fullScript.toString('hex')}`);
  console.log(`  Length: ${fullScript.length} bytes`);
  console.log(`  First byte (opcode): 0x${fullScript[0].toString(16)} (OP_DATA_${fullScript[0]})`);
  console.log(`  Last byte (opcode): 0x${fullScript[fullScript.length - 1].toString(16)}`);

  if (fullScript[fullScript.length - 1] === 0xab) {
    console.log(`  ✅ Last byte is 0xAB (OP_CHECKSIGECDSA)\n`);
  }

  const pubkeyInScript = fullScript.slice(1, 34);
  console.log(`  PubKey in script: ${pubkeyInScript.toString('hex')}`);
  console.log(`  Match wallet: ${pubkeyInScript.equals(wallet.publicKey) ? '✅' : '❌'}\n`);

  // ==================== ТЕСТ ДВУХ ВАРИАНТОВ ====================

  console.log('======================================');
  console.log('🧪 Testing TWO variants:\n');

  // Создаем минимальную транзакцию
  const recipientAddress = 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74';
  const transaction = {
    version: 0,
    inputs: [
      {
        previousOutpoint: utxo.outpoint,
        signatureScript: '',
        sequence: '0',
        sigOpCount: 1,
      },
    ],
    outputs: [
      {
        amount: '1000000',
        scriptPublicKey: {
          scriptPublicKey: CryptoUtils.addressToScriptPublicKey(recipientAddress).toString('hex'),
          version: 0,
        },
      },
      {
        amount: '48900000',
        scriptPublicKey: {
          scriptPublicKey: CryptoUtils.addressToScriptPublicKey(wallet.address).toString('hex'),
          version: 0,
        },
      },
    ],
    lockTime: '0',
    subnetworkId: '0000000000000000000000000000000000000000',
    gas: '0',
    payload: '',
  };

  // ==================== ВАРИАНТ 1: Полный script ====================
  console.log('📝 VARIANT 1: Full script with opcodes\n');

  const utxoForSigning1 = {
    outpoint: utxo.outpoint,
    utxoEntry: {
      amount: utxo.utxoEntry.amount,
      scriptPublicKey: {
        version: utxo.utxoEntry.scriptPublicKey.version,
        script: utxo.utxoEntry.scriptPublicKey.scriptPublicKey, // Полный script
      },
      blockDaaScore: utxo.utxoEntry.blockDaaScore,
      isCoinbase: utxo.utxoEntry.isCoinbase,
    },
  };

  const schnorrHash1 = CryptoUtils.getSignatureHashSchnorr(transaction, 0, utxoForSigning1);
  const ecdsaHash1 = createHash('sha256').update('TransactionSigningHashECDSA').update(schnorrHash1).digest();

  console.log(`Script used: ${utxoForSigning1.utxoEntry.scriptPublicKey.script}`);
  console.log(`Script length: ${Buffer.from(utxoForSigning1.utxoEntry.scriptPublicKey.script, 'hex').length} bytes`);
  console.log(`Schnorr Hash: ${schnorrHash1.toString('hex')}`);
  console.log(`ECDSA Hash:   ${ecdsaHash1.toString('hex')}\n`);

  // ==================== ВАРИАНТ 2: Script БЕЗ финального opcode ====================
  console.log('📝 VARIANT 2: Script WITHOUT final opcode (subscript)\n');

  // Убираем последний байт (0xab)
  const scriptWithoutOpcode = fullScript.slice(0, -1).toString('hex');

  const utxoForSigning2 = {
    outpoint: utxo.outpoint,
    utxoEntry: {
      amount: utxo.utxoEntry.amount,
      scriptPublicKey: {
        version: utxo.utxoEntry.scriptPublicKey.version,
        script: scriptWithoutOpcode, // БЕЗ финального opcode!
      },
      blockDaaScore: utxo.utxoEntry.blockDaaScore,
      isCoinbase: utxo.utxoEntry.isCoinbase,
    },
  };

  const schnorrHash2 = CryptoUtils.getSignatureHashSchnorr(transaction, 0, utxoForSigning2);
  const ecdsaHash2 = createHash('sha256').update('TransactionSigningHashECDSA').update(schnorrHash2).digest();

  console.log(`Script used: ${utxoForSigning2.utxoEntry.scriptPublicKey.script}`);
  console.log(`Script length: ${Buffer.from(utxoForSigning2.utxoEntry.scriptPublicKey.script, 'hex').length} bytes`);
  console.log(`Schnorr Hash: ${schnorrHash2.toString('hex')}`);
  console.log(`ECDSA Hash:   ${ecdsaHash2.toString('hex')}\n`);

  // ==================== ВАРИАНТ 3: Только pubkey ====================
  console.log('📝 VARIANT 3: Only pubkey (no opcodes)\n');

  const pubkeyOnly = pubkeyInScript.toString('hex');

  const utxoForSigning3 = {
    outpoint: utxo.outpoint,
    utxoEntry: {
      amount: utxo.utxoEntry.amount,
      scriptPublicKey: {
        version: utxo.utxoEntry.scriptPublicKey.version,
        script: pubkeyOnly, // Только pubkey
      },
      blockDaaScore: utxo.utxoEntry.blockDaaScore,
      isCoinbase: utxo.utxoEntry.isCoinbase,
    },
  };

  const schnorrHash3 = CryptoUtils.getSignatureHashSchnorr(transaction, 0, utxoForSigning3);
  const ecdsaHash3 = createHash('sha256').update('TransactionSigningHashECDSA').update(schnorrHash3).digest();

  console.log(`Script used: ${utxoForSigning3.utxoEntry.scriptPublicKey.script}`);
  console.log(`Script length: ${Buffer.from(utxoForSigning3.utxoEntry.scriptPublicKey.script, 'hex').length} bytes`);
  console.log(`Schnorr Hash: ${schnorrHash3.toString('hex')}`);
  console.log(`ECDSA Hash:   ${ecdsaHash3.toString('hex')}\n`);

  // ==================== СРАВНЕНИЕ ====================
  console.log('======================================');
  console.log('📊 Comparison:\n');

  console.log('Your current implementation uses VARIANT 1:');
  console.log(`  Schnorr: 58dc6b5869c1c98abad60cc88141e35b5e880d1c7e6060a2c261b78947a196f1`);
  console.log(`  ECDSA:   1f9dad119996464cba7fbfa7e9bbc47d32ffe68ab4057214596a612aa3b22126\n`);

  console.log('Variant 1 (full script):');
  console.log(`  Schnorr: ${schnorrHash1.toString('hex')}`);
  console.log(`  ECDSA:   ${ecdsaHash1.toString('hex')}`);
  console.log(
    `  Match: ${schnorrHash1.toString('hex') === '58dc6b5869c1c98abad60cc88141e35b5e880d1c7e6060a2c261b78947a196f1' ? '✅' : '❌'}\n`
  );

  console.log('Variant 2 (without final opcode):');
  console.log(`  Schnorr: ${schnorrHash2.toString('hex')}`);
  console.log(`  ECDSA:   ${ecdsaHash2.toString('hex')}`);
  console.log(`  ${schnorrHash1.equals(schnorrHash2) ? '❌ Same as variant 1' : '✅ DIFFERENT!'}\n`);

  console.log('Variant 3 (only pubkey):');
  console.log(`  Schnorr: ${schnorrHash3.toString('hex')}`);
  console.log(`  ECDSA:   ${ecdsaHash3.toString('hex')}`);
  console.log(`  ${schnorrHash1.equals(schnorrHash3) ? '❌ Same as variant 1' : '✅ DIFFERENT!'}\n`);

  // ==================== РЕКОМЕНДАЦИЯ ====================
  console.log('======================================');
  console.log('💡 Recommendation:\n');

  if (!schnorrHash1.equals(schnorrHash2)) {
    console.log('Try VARIANT 2: Script WITHOUT final opcode (subscript)');
    console.log('This is common in Bitcoin-like signature hash calculations.\n');

    console.log('To test: Modify getSignatureHashSchnorr() to use subscript:');
    console.log('```typescript');
    console.log('let prevScriptBuf = Buffer.from(utxo.utxoEntry.scriptPublicKey.script, "hex");');
    console.log('// For ECDSA: remove final opcode (0xab)');
    console.log('if (prevScriptBuf[prevScriptBuf.length - 1] === 0xab) {');
    console.log('  prevScriptBuf = prevScriptBuf.slice(0, -1);');
    console.log('}');
    console.log('const prevScript = prevScriptBuf;');
    console.log('```\n');
  }

  if (!schnorrHash1.equals(schnorrHash3)) {
    console.log('Or try VARIANT 3: Only pubkey (no opcodes at all)');
    console.log('Less likely, but worth testing.\n');
  }

  console.log('Ask developer (Tonto) which variant is correct for ECDSA!');
}

debugSignatureDetailed().catch(console.error);
