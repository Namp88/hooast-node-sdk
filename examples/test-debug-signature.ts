import { HoosatNode } from '../src';
import { CryptoUtils, TransactionBuilder } from '../src/utils/crypto.utils';

/**
 * Тест с ПОЛНЫМ debug-логированием signature hash
 */
async function debugSignatureHash() {
  const privateKeyHex = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';
  const wallet = CryptoUtils.importKeyPair(privateKeyHex);

  console.log('💼 Wallet:');
  console.log(`   Address: ${wallet.address}`);
  console.log(`   PubKey (hex): ${wallet.publicKey.toString('hex')}\n`);

  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  const utxosResult = await node.getUtxosByAddresses([wallet.address]);

  if (!utxosResult.ok || utxosResult.result.utxos.length === 0) {
    console.log('❌ No UTXOs');
    return;
  }

  const utxo = utxosResult.result.utxos[0];

  console.log('📦 UTXO from node:');
  console.log(`   Amount: ${utxo.utxoEntry.amount} sompi`);
  console.log(`   ScriptPubKey version: ${utxo.utxoEntry.scriptPublicKey.version}`);
  console.log(`   ScriptPubKey hex: ${utxo.utxoEntry.scriptPublicKey.scriptPublicKey}`);
  console.log(`   ScriptPubKey length: ${utxo.utxoEntry.scriptPublicKey.scriptPublicKey.length / 2} bytes\n`);

  // Создаем минимальную транзакцию
  const recipientAddress = 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74';
  const sendAmount = '25000000'; // 0.25 HTN

  const builder = new TransactionBuilder();

  builder.addInput(
    {
      outpoint: utxo.outpoint,
      utxoEntry: {
        amount: utxo.utxoEntry.amount,
        scriptPublicKey: {
          version: utxo.utxoEntry.scriptPublicKey.version,
          script: utxo.utxoEntry.scriptPublicKey.scriptPublicKey,
        },
        blockDaaScore: utxo.utxoEntry.blockDaaScore,
        isCoinbase: utxo.utxoEntry.isCoinbase,
      },
    },
    wallet.privateKey
  );

  builder.addOutput(recipientAddress, sendAmount);

  const change = BigInt(utxo.utxoEntry.amount) - BigInt(sendAmount) - 1000n;
  builder.addOutput(wallet.address, change.toString());

  const transaction = builder.build();

  console.log('🔨 Transaction built:');
  console.log(`   Version: ${transaction.version}`);
  console.log(`   Inputs: ${transaction.inputs.length}`);
  console.log(`   Outputs: ${transaction.outputs.length}`);
  console.log(`   LockTime: ${transaction.lockTime}`);
  console.log(`   SubnetworkId: ${transaction.subnetworkId}`);
  console.log(`   Gas: ${transaction.gas}`);
  console.log(`   Payload: ${transaction.payload || '(empty)'}\n`);

  // Тестируем создание signature hash с ПОЛНЫМ логом
  console.log('🔐 Creating signature hash...\n');

  const utxoForSigning = {
    outpoint: utxo.outpoint,
    utxoEntry: {
      amount: utxo.utxoEntry.amount,
      scriptPublicKey: {
        version: utxo.utxoEntry.scriptPublicKey.version,
        script: utxo.utxoEntry.scriptPublicKey.scriptPublicKey,
      },
      blockDaaScore: utxo.utxoEntry.blockDaaScore,
      isCoinbase: utxo.utxoEntry.isCoinbase,
    },
  };

  // Создаем Schnorr signature hash с debug
  const schnorrHash = createSignatureHashWithDebug(transaction, 0, utxoForSigning);

  console.log(`\n✅ Schnorr Hash: ${schnorrHash.toString('hex')}`);

  // Создаем ECDSA hash
  const ecdsaHash = createHash('sha256').update(schnorrHash).digest();
  console.log(`✅ ECDSA Hash (SHA256): ${ecdsaHash.toString('hex')}\n`);

  // Подписываем
  const signature = secp256k1.ecdsaSign(ecdsaHash, wallet.privateKey);
  console.log(`✅ ECDSA Signature: ${Buffer.from(signature.signature).toString('hex')}\n`);

  // Создаем signatureScript
  const sigScript = Buffer.concat([Buffer.from([0x41]), Buffer.from(signature.signature), Buffer.from([0x01])]);

  console.log(`✅ SignatureScript (hex): ${sigScript.toString('hex')}`);
  console.log(`   Length: ${sigScript.length} bytes`);
  console.log(`   Format: 0x41 (65) + 64-byte sig + 0x01 (SIGHASH_ALL)\n`);

  // Сравниваем с рабочим примером от разработчика
  const workingExample =
    '4139574768e48ea741721773853f9ccac044141399a49d9db6240458a5b19faf8d5d9eff33258e31bc09105af3286f176df328b0e89e91be35605607f94ddaaca701';
  console.log('📝 Working example from dev:');
  console.log(`   ${workingExample}`);
  console.log(`   Length: ${workingExample.length / 2} bytes\n`);

  if (sigScript.toString('hex') === workingExample) {
    console.log('🎉 EXACT MATCH!');
  } else {
    console.log('⚠️  Different signature (expected - different private key)');
  }
}

// Helper с ПОЛНЫМ debug-логом
function createSignatureHashWithDebug(transaction: any, inputIndex: number, utxo: any): Buffer {
  const input = transaction.inputs[inputIndex];
  const hashType = 0x01; // SIGHASH_ALL

  const buffers: any[] = [];

  console.log('📝 Building signature hash components:');

  // 1. Version
  const versionBuf = Buffer.alloc(2);
  versionBuf.writeUInt16LE(transaction.version, 0);
  buffers.push({ name: 'Version', buf: versionBuf });
  console.log(`   1. Version: ${versionBuf.toString('hex')} (${transaction.version})`);

  // 2. Previous outputs hash (mock для debug)
  const prevOutHash = Buffer.alloc(32, 0); // Zero для простоты
  buffers.push({ name: 'PrevOutputsHash', buf: prevOutHash });
  console.log(`   2. PrevOutputsHash: ${prevOutHash.toString('hex').substring(0, 20)}...`);

  // 3. Sequences hash (mock)
  const seqHash = Buffer.alloc(32, 0);
  buffers.push({ name: 'SequencesHash', buf: seqHash });
  console.log(`   3. SequencesHash: ${seqHash.toString('hex').substring(0, 20)}...`);

  // 4. SigOpCounts hash (mock)
  const sigOpHash = Buffer.alloc(32, 0);
  buffers.push({ name: 'SigOpCountsHash', buf: sigOpHash });
  console.log(`   4. SigOpCountsHash: ${sigOpHash.toString('hex').substring(0, 20)}...`);

  // 5. Current outpoint
  const txIdReversed = Buffer.from(input.previousOutpoint.transactionId, 'hex').reverse();
  buffers.push({ name: 'OutpointTxID', buf: txIdReversed });
  console.log(`   5. OutpointTxID: ${txIdReversed.toString('hex').substring(0, 20)}...`);

  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32LE(input.previousOutpoint.index, 0);
  buffers.push({ name: 'OutpointIndex', buf: indexBuf });
  console.log(`   6. OutpointIndex: ${indexBuf.toString('hex')} (${input.previousOutpoint.index})`);

  // 7. PrevScriptPublicKey Version
  const scriptVersionBuf = Buffer.alloc(2);
  scriptVersionBuf.writeUInt16LE(utxo.utxoEntry.scriptPublicKey.version, 0);
  buffers.push({ name: 'ScriptVersion', buf: scriptVersionBuf });
  console.log(`   7. ScriptVersion: ${scriptVersionBuf.toString('hex')} (${utxo.utxoEntry.scriptPublicKey.version})`);

  // 8. PrevScriptPublicKey Script (КРИТИЧНО!)
  const prevScript = Buffer.from(utxo.utxoEntry.scriptPublicKey.script, 'hex');
  const scriptLengthVarInt = encodeVarInt(prevScript.length);
  buffers.push({ name: 'ScriptLength', buf: scriptLengthVarInt });
  buffers.push({ name: 'Script', buf: prevScript });
  console.log(`   8. ScriptLength (VarInt): ${scriptLengthVarInt.toString('hex')} (${prevScript.length} bytes)`);
  console.log(`   9. Script: ${prevScript.toString('hex')}`);

  // 9. Amount
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(BigInt(utxo.utxoEntry.amount), 0);
  buffers.push({ name: 'Amount', buf: amountBuf });
  console.log(`   10. Amount: ${amountBuf.toString('hex')} (${utxo.utxoEntry.amount} sompi)`);

  // 10. Sequence
  const sequenceBuf = Buffer.alloc(8);
  sequenceBuf.writeBigUInt64LE(BigInt(input.sequence), 0);
  buffers.push({ name: 'Sequence', buf: sequenceBuf });
  console.log(`   11. Sequence: ${sequenceBuf.toString('hex')} (${input.sequence})`);

  // 11. SigOpCount
  const sigOpBuf = Buffer.from([input.sigOpCount]);
  buffers.push({ name: 'SigOpCount', buf: sigOpBuf });
  console.log(`   12. SigOpCount: ${sigOpBuf.toString('hex')} (${input.sigOpCount})`);

  // 12. Outputs hash (mock)
  const outHash = Buffer.alloc(32, 0);
  buffers.push({ name: 'OutputsHash', buf: outHash });
  console.log(`   13. OutputsHash: ${outHash.toString('hex').substring(0, 20)}...`);

  // 13. LockTime
  const lockTimeBuf = Buffer.alloc(8);
  lockTimeBuf.writeBigUInt64LE(BigInt(transaction.lockTime), 0);
  buffers.push({ name: 'LockTime', buf: lockTimeBuf });
  console.log(`   14. LockTime: ${lockTimeBuf.toString('hex')} (${transaction.lockTime})`);

  // 14. SubnetworkID
  const subnetBuf = Buffer.from(transaction.subnetworkId, 'hex');
  buffers.push({ name: 'SubnetworkID', buf: subnetBuf });
  console.log(`   15. SubnetworkID: ${subnetBuf.toString('hex')}`);

  // 15. Gas
  const gasBuf = Buffer.alloc(8);
  gasBuf.writeBigUInt64LE(BigInt(transaction.gas), 0);
  buffers.push({ name: 'Gas', buf: gasBuf });
  console.log(`   16. Gas: ${gasBuf.toString('hex')} (${transaction.gas})`);

  // 16. Payload hash (empty = zero hash)
  const payloadHash = Buffer.alloc(32, 0);
  buffers.push({ name: 'PayloadHash', buf: payloadHash });
  console.log(`   17. PayloadHash: ${payloadHash.toString('hex').substring(0, 20)}... (zero)`);

  // 17. HashType
  const hashTypeBuf = Buffer.from([hashType]);
  buffers.push({ name: 'HashType', buf: hashTypeBuf });
  console.log(`   18. HashType: ${hashTypeBuf.toString('hex')} (SIGHASH_ALL)\n`);

  // Собираем всё вместе
  const dataToHash = Buffer.concat(buffers.map((b: any) => b.buf));
  console.log(`📦 Total data to hash: ${dataToHash.length} bytes`);
  console.log(`   Full hex: ${dataToHash.toString('hex').substring(0, 100)}...\n`);

  // Применяем Blake3 keyed hash
  const keyString = 'TransactionSigningHash';
  const keyBuffer = Buffer.alloc(32);
  keyBuffer.write(keyString, 0, 'utf8');

  console.log(`🔑 Blake3 Key: "${keyString}"`);
  console.log(`   Key (hex): ${keyBuffer.toString('hex')}\n`);

  const hash = Buffer.from(blake3.keyedHash(keyBuffer, dataToHash));
  return hash;
}

function encodeVarInt(value: number): Buffer {
  if (value < 0xfd) {
    return Buffer.from([value]);
  } else if (value <= 0xffff) {
    const buf = Buffer.alloc(3);
    buf[0] = 0xfd;
    buf.writeUInt16LE(value, 1);
    return buf;
  } else if (value <= 0xffffffff) {
    const buf = Buffer.alloc(5);
    buf[0] = 0xfe;
    buf.writeUInt32LE(value, 1);
    return buf;
  } else {
    const buf = Buffer.alloc(9);
    buf[0] = 0xff;
    buf.writeBigUInt64LE(BigInt(value), 1);
    return buf;
  }
}

// Импорты
import * as blake3 from 'blake3';
import * as secp256k1 from 'secp256k1';
import { createHash } from 'crypto';

debugSignatureHash().catch(console.error);
