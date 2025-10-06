import { HoosatCrypto } from '../src';

/**
 * Детальный анализ Schnorr preimage
 */
async function debugSchnorrPreimage() {
  console.log('🔬 === SCHNORR PREIMAGE DEBUG ===\n');

  const transaction = {
    version: 0,
    inputs: [
      {
        previousOutpoint: {
          transactionId: 'd4e1f08dac917cb535a082c59d3aed6045d415963eecd49183c6b00f91a0ee1d',
          index: 1,
        },
        signatureScript: '',
        sequence: '0',
        sigOpCount: 1,
      },
    ],
    outputs: [
      {
        amount: '1000',
        scriptPublicKey: {
          version: 0,
          scriptPublicKey: '20fe34183d4e783b5dbd572b338d6e4c084ef92fa941a77bbe9b23acf27107f065ac',
        },
      },
      {
        amount: '19399789000',
        scriptPublicKey: {
          version: 0,
          scriptPublicKey: '210294eb83da2c7ad14c91a941ea2dbe22786b2eff5969ee794891dc55538fd67c37ab',
        },
      },
    ],
    lockTime: '0',
    subnetworkId: '0000000000000000000000000000000000000000',
    gas: '0',
    payload: '',
  };

  const utxo = {
    outpoint: {
      transactionId: 'd4e1f08dac917cb535a082c59d3aed6045d415963eecd49183c6b00f91a0ee1d',
      index: 1,
    },
    utxoEntry: {
      amount: '19399800000',
      scriptPublicKey: {
        version: 0,
        script: '210294eb83da2c7ad14c91a941ea2dbe22786b2eff5969ee794891dc55538fd67c37ab',
      },
      blockDaaScore: '0',
      isCoinbase: false,
    },
  };

  // Эталонный preimage из Motoko (297 байт)
  const MOTOKO_PREIMAGE =
    '0000cfde759aee05c83d26e98d16cd9f5f07eb58eacc167c9568baae4eb039be9a7515f9e0c70c911d5651e49f810589ea4b556733ee12ffd4debc9e8aceb87c0c3d904dbf56bdfcd00ac2d808d0ead76922d361815c1bf16a25ed10de02c10b91e5d4e1f08dac917cb535a082c59d3aed6045d415963eecd49183c6b00f91a0ee1d0100000000002300000000000000210294eb83da2c7ad14c91a941ea2dbe22786b2eff5969ee794891dc55538fd67c37abc0745184040000000000000000000000017329db05036b4f320b7a891ea108ecaf128ada554a29b85672f0ce9119704c6e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001';

  console.log('📋 Expected Motoko preimage:');
  console.log(`   Length: ${MOTOKO_PREIMAGE.length / 2} bytes`);
  console.log(`   Hex: ${MOTOKO_PREIMAGE.slice(0, 80)}...`);
  console.log('');

  // Создаем preimage вручную, как в Motoko
  const buffers: Buffer[] = [];

  // 1. Version (uint16LE)
  const versionBuf = Buffer.alloc(2);
  versionBuf.writeUInt16LE(0, 0);
  buffers.push(versionBuf);
  console.log(`1. Version: ${versionBuf.toString('hex')} (${versionBuf.length} bytes)`);

  // 2. PreviousOutputsHash (32 bytes)
  const prevOutputsHash = Buffer.from('cfde759aee05c83d26e98d16cd9f5f07eb58eacc167c9568baae4eb039be9a75', 'hex');
  buffers.push(prevOutputsHash);
  console.log(`2. PrevOutputsHash: ${prevOutputsHash.toString('hex')} (${prevOutputsHash.length} bytes)`);

  // 3. SequencesHash (32 bytes)
  const sequencesHash = Buffer.from('15f9e0c70c911d5651e49f810589ea4b556733ee12ffd4debc9e8aceb87c0c3d', 'hex');
  buffers.push(sequencesHash);
  console.log(`3. SequencesHash: ${sequencesHash.toString('hex')} (${sequencesHash.length} bytes)`);

  // 4. SigOpCountsHash (32 bytes)
  const sigOpCountsHash = Buffer.from('904dbf56bdfcd00ac2d808d0ead76922d361815c1bf16a25ed10de02c10b91e5', 'hex');
  buffers.push(sigOpCountsHash);
  console.log(`4. SigOpCountsHash: ${sigOpCountsHash.toString('hex')} (${sigOpCountsHash.length} bytes)`);

  // 5. Current Outpoint TxID (32 bytes, NOT reversed!)
  const txId = Buffer.from('d4e1f08dac917cb535a082c59d3aed6045d415963eecd49183c6b00f91a0ee1d', 'hex');
  buffers.push(txId);
  console.log(`5. TxID (NOT reversed): ${txId.toString('hex')} (${txId.length} bytes)`);

  // 6. Index (uint32LE)
  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32LE(1, 0);
  buffers.push(indexBuf);
  console.log(`6. Index: ${indexBuf.toString('hex')} (${indexBuf.length} bytes)`);

  // 7. ScriptVersion (uint16LE) - ALWAYS 0!
  const scriptVersionBuf = Buffer.alloc(2);
  scriptVersionBuf.writeUInt16LE(0, 0);
  buffers.push(scriptVersionBuf);
  console.log(`7. ScriptVersion: ${scriptVersionBuf.toString('hex')} (${scriptVersionBuf.length} bytes)`);

  // 8. ScriptLength (uint64LE)
  const script = Buffer.from('210294eb83da2c7ad14c91a941ea2dbe22786b2eff5969ee794891dc55538fd67c37ab', 'hex');
  const scriptLengthBuf = Buffer.alloc(8);
  scriptLengthBuf.writeBigUInt64LE(BigInt(script.length), 0);
  buffers.push(scriptLengthBuf);
  console.log(`8. ScriptLength: ${scriptLengthBuf.toString('hex')} (${scriptLengthBuf.length} bytes) = ${script.length}`);

  // 9. Script (35 bytes)
  buffers.push(script);
  console.log(`9. Script: ${script.toString('hex')} (${script.length} bytes)`);

  // 10. Amount (uint64LE)
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(BigInt(19399800000), 0);
  buffers.push(amountBuf);
  console.log(`10. Amount: ${amountBuf.toString('hex')} (${amountBuf.length} bytes) = 19399800000`);

  // 11. Sequence (uint64LE)
  const sequenceBuf = Buffer.alloc(8);
  sequenceBuf.writeBigUInt64LE(BigInt(0), 0);
  buffers.push(sequenceBuf);
  console.log(`11. Sequence: ${sequenceBuf.toString('hex')} (${sequenceBuf.length} bytes)`);

  // 12. SigOpCount (1 byte)
  buffers.push(Buffer.from([1]));
  console.log(`12. SigOpCount: 01 (1 byte)`);

  // 13. OutputsHash (32 bytes)
  const outputsHash = Buffer.from('7329db05036b4f320b7a891ea108ecaf128ada554a29b85672f0ce9119704c6e', 'hex');
  buffers.push(outputsHash);
  console.log(`13. OutputsHash: ${outputsHash.toString('hex')} (${outputsHash.length} bytes)`);

  // 14. LockTime (uint64LE)
  const lockTimeBuf = Buffer.alloc(8);
  lockTimeBuf.writeBigUInt64LE(BigInt(0), 0);
  buffers.push(lockTimeBuf);
  console.log(`14. LockTime: ${lockTimeBuf.toString('hex')} (${lockTimeBuf.length} bytes)`);

  // 15. SubnetworkID (20 bytes)
  const subnetworkId = Buffer.from('0000000000000000000000000000000000000000', 'hex');
  buffers.push(subnetworkId);
  console.log(`15. SubnetworkID: ${subnetworkId.toString('hex')} (${subnetworkId.length} bytes)`);

  // 16. Gas (uint64LE)
  const gasBuf = Buffer.alloc(8);
  gasBuf.writeBigUInt64LE(BigInt(0), 0);
  buffers.push(gasBuf);
  console.log(`16. Gas: ${gasBuf.toString('hex')} (${gasBuf.length} bytes)`);

  // 17. PayloadHash (32 bytes zeros for native)
  const payloadHash = Buffer.alloc(32, 0);
  buffers.push(payloadHash);
  console.log(`17. PayloadHash: ${payloadHash.toString('hex')} (${payloadHash.length} bytes)`);

  // 18. SigHashType (1 byte)
  buffers.push(Buffer.from([1]));
  console.log(`18. SigHashType: 01 (1 byte)`);

  console.log('');

  // Собираем preimage
  const myPreimage = Buffer.concat(buffers);
  console.log('📊 MY PREIMAGE:');
  console.log(`   Length: ${myPreimage.length} bytes`);
  console.log(`   Hex: ${myPreimage.toString('hex')}`);
  console.log('');

  console.log('📊 MOTOKO PREIMAGE:');
  console.log(`   Length: ${MOTOKO_PREIMAGE.length / 2} bytes`);
  console.log(`   Hex: ${MOTOKO_PREIMAGE}`);
  console.log('');

  // Побайтовое сравнение
  const motokoBytes = Buffer.from(MOTOKO_PREIMAGE, 'hex');
  console.log('🔍 BYTE-BY-BYTE COMPARISON:');

  if (myPreimage.length !== motokoBytes.length) {
    console.log(`❌ Length mismatch! My: ${myPreimage.length}, Motoko: ${motokoBytes.length}\n`);
  } else {
    console.log(`✅ Length match: ${myPreimage.length} bytes\n`);
  }

  let firstDiff = -1;
  for (let i = 0; i < Math.min(myPreimage.length, motokoBytes.length); i++) {
    if (myPreimage[i] !== motokoBytes[i]) {
      if (firstDiff === -1) firstDiff = i;
      console.log(
        `❌ Diff at byte ${i}: my=0x${myPreimage[i].toString(16).padStart(2, '0')}, motoko=0x${motokoBytes[i].toString(16).padStart(2, '0')}`
      );

      // Показываем только первые 10 различий
      if (firstDiff !== -1 && i - firstDiff > 10) {
        console.log('   ... (more differences)');
        break;
      }
    }
  }

  if (firstDiff === -1) {
    console.log('✅ All bytes match!\n');

    // Проверяем hash
    console.log('✅ Computing Blake3 keyed hash...');
    const hash = HoosatCrypto.blake3KeyedHash('TransactionSigningHash', myPreimage);
    console.log(`   Result: ${hash.toString('hex')}`);
    console.log(`   Expected: 7e63dac1af7042e7d7a9446cc760622dc2d11e1ccbbf695c9a217467fba051a9`);
  } else {
    console.log(`\n❌ First difference at byte ${firstDiff}`);
  }
}

debugSchnorrPreimage().catch(console.error);
