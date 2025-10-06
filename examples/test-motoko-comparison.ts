import { HoosatCrypto } from '../src';
import { createHash } from 'crypto';

/**
 * Тест с точными данными из Motoko лога
 * Это РАБОЧАЯ транзакция, которая была принята нодой
 */
async function testMotokoComparison() {
  console.log('🔬 === MOTOKO COMPARISON TEST ===\n');

  // ==================== ЭТАЛОННЫЕ ДАННЫЕ ИЗ MOTOKO ====================
  const MOTOKO_EXPECTED = {
    previousOutputsHash: 'cfde759aee05c83d26e98d16cd9f5f07eb58eacc167c9568baae4eb039be9a75',
    outputsHash: '7329db05036b4f320b7a891ea108ecaf128ada554a29b85672f0ce9119704c6e',
    schnorrHash: '7e63dac1af7042e7d7a9446cc760622dc2d11e1ccbbf695c9a217467fba051a9',
    ecdsaDomainHash: 'a4f2ece45a286cb1ec0a4e4d383468d000f71757052b1504aa3495328df5f4ea',
    ecdsaHash: 'c7acb62ffaf99e499abd23a27fe462b46a500a97ff3c63e8a0adbfea30278043',
    signature:
      'f4ae16d555b3c8cb3b025cab0fb84cbaa464e297d606fab45125ae2d3170f2b83a42f9eca8d516b55d8de206d2e4ad5fd1cfcf339cf4f49a7523c402b4a6149f',
    sighashPreimage:
      '0000cfde759aee05c83d26e98d16cd9f5f07eb58eacc167c9568baae4eb039be9a7515f9e0c70c911d5651e49f810589ea4b556733ee12ffd4debc9e8aceb87c0c3d904dbf56bdfcd00ac2d808d0ead76922d361815c1bf16a25ed10de02c10b91e5d4e1f08dac917cb535a082c59d3aed6045d415963eecd49183c6b00f91a0ee1d0100000000002300000000000000210294eb83da2c7ad14c91a941ea2dbe22786b2eff5969ee794891dc55538fd67c37abc0745184040000000000000000000000017329db05036b4f320b7a891ea108ecaf128ada554a29b85672f0ce9119704c6e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001',
  };

  // ==================== ВХОДНЫЕ ДАННЫЕ ====================
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

  console.log('📦 Input Data:');
  console.log(`   TX: ${transaction.inputs[0].previousOutpoint.transactionId.slice(0, 20)}...`);
  console.log(`   Index: ${transaction.inputs[0].previousOutpoint.index}`);
  console.log(`   Amount: ${utxo.utxoEntry.amount} sompi`);
  console.log(`   Script: ${utxo.utxoEntry.scriptPublicKey.script}\n`);

  // ==================== ВЫЧИСЛЯЕМ ХЕШИ ====================
  console.log('🔐 Computing Hashes:\n');

  // 1. Schnorr Hash
  console.log('1️⃣ Schnorr Hash (Blake3 keyed):');
  const schnorrHash = HoosatCrypto.getSignatureHashSchnorr(transaction, 0, utxo);
  const schnorrHashHex = schnorrHash.toString('hex');
  console.log(`   Computed: ${schnorrHashHex}`);
  console.log(`   Expected: ${MOTOKO_EXPECTED.schnorrHash}`);
  console.log(`   Match: ${schnorrHashHex === MOTOKO_EXPECTED.schnorrHash ? '✅' : '❌'}\n`);

  // 2. ECDSA Domain Hash
  console.log('2️⃣ ECDSA Domain Hash (SHA256):');
  const ecdsaDomainHash = createHash('sha256').update('TransactionSigningHashECDSA').digest();
  const ecdsaDomainHashHex = ecdsaDomainHash.toString('hex');
  console.log(`   Computed: ${ecdsaDomainHashHex}`);
  console.log(`   Expected: ${MOTOKO_EXPECTED.ecdsaDomainHash}`);
  console.log(`   Match: ${ecdsaDomainHashHex === MOTOKO_EXPECTED.ecdsaDomainHash ? '✅' : '❌'}\n`);

  // 3. ECDSA Preimage
  console.log('3️⃣ ECDSA Final Preimage:');
  const ecdsaPreimage = Buffer.concat([ecdsaDomainHash, schnorrHash]);
  console.log(`   Length: ${ecdsaPreimage.length} bytes (should be 64)`);
  console.log(`   Hex: ${ecdsaPreimage.toString('hex')}\n`);

  // 4. ECDSA Hash
  console.log('4️⃣ ECDSA Hash (SHA256 of preimage):');
  const ecdsaHash = HoosatCrypto.getSignatureHashECDSA(transaction, 0, utxo);
  const ecdsaHashHex = ecdsaHash.toString('hex');
  console.log(`   Computed: ${ecdsaHashHex}`);
  console.log(`   Expected: ${MOTOKO_EXPECTED.ecdsaHash}`);
  console.log(`   Match: ${ecdsaHashHex === MOTOKO_EXPECTED.ecdsaHash ? '✅' : '❌'}\n`);

  // ==================== РЕЗУЛЬТАТ ====================
  console.log('='.repeat(60));
  console.log('📊 COMPARISON RESULTS:\n');

  const results = [
    {
      name: 'Schnorr Hash',
      computed: schnorrHashHex,
      expected: MOTOKO_EXPECTED.schnorrHash,
    },
    {
      name: 'ECDSA Domain Hash',
      computed: ecdsaDomainHashHex,
      expected: MOTOKO_EXPECTED.ecdsaDomainHash,
    },
    {
      name: 'ECDSA Hash',
      computed: ecdsaHashHex,
      expected: MOTOKO_EXPECTED.ecdsaHash,
    },
  ];

  let allMatch = true;
  results.forEach(({ name, computed, expected }) => {
    const match = computed === expected;
    allMatch = allMatch && match;
    console.log(`${match ? '✅' : '❌'} ${name}`);
    if (!match) {
      console.log(`   Computed: ${computed}`);
      console.log(`   Expected: ${expected}`);
    }
  });

  console.log('\n' + '='.repeat(60));

  if (allMatch) {
    console.log('\n🎉 SUCCESS! All hashes match Motoko implementation!\n');
    console.log('✅ Your implementation is CORRECT!');
    console.log('✅ Ready to test with real node\n');
    return true;
  } else {
    console.log("\n❌ MISMATCH! Some hashes don't match.\n");
    console.log('🔍 Debug needed. Check the crypto.ts implementation.\n');
    return false;
  }
}

// Запуск
testMotokoComparison()
  .then(success => {
    if (success) {
      console.log('🚀 Next step: npm run test:send-real-htn');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Error:', error);
    process.exit(1);
  });
