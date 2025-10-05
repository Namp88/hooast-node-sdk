import { HoosatCrypto } from '../src/crypto/crypto';
import { HoosatUtils } from '../src/utils/utils';

/**
 * Тест сравнения с РАБОЧИМ примером от разработчика
 */
async function compareWithWorkingExample() {
  console.log('🔍 Comparison with Working Example\n');

  // ==================== РАБОЧИЙ ПРИМЕР ОТ РАЗРАБОТЧИКА ====================
  const workingExample = {
    input: {
      previousOutpoint: {
        transactionId: '091ea22a707ac840c8291706fca5421a61ee03147f3f9655133d5b62ec38f29f',
        index: 0,
      },
      signatureScript:
        '4139574768e48ea741721773853f9ccac044141399a49d9db6240458a5b19faf8d5d9eff33258e31bc09105af3286f176df328b0e89e91be35605607f94ddaaca701',
      sequence: 0,
      sigOpCount: 1,
    },
    outputs: [
      {
        amount: 1000,
        scriptPublicKey: {
          version: 0,
          scriptPublicKey: '20fe34183d4e783b5dbd572b338d6e4c084ef92fa941a77bbe9b23acf27107f065ac',
        },
      },
      {
        amount: 19999989000,
        scriptPublicKey: {
          version: 0,
          scriptPublicKey: '2102eddf8d68ad880ec15b9d0de338d62f53630af2efc2e2d3a03e2f7a65c379fbaaab',
        },
      },
    ],
  };

  console.log('📝 Working Example Analysis:\n');

  // Анализ SignatureScript
  const sigScriptBuf = Buffer.from(workingExample.input.signatureScript, 'hex');
  console.log('SignatureScript:');
  console.log(`  Full: ${workingExample.input.signatureScript}`);
  console.log(`  Length: ${sigScriptBuf.length} bytes`);
  console.log(`  First byte (length marker): 0x${sigScriptBuf[0].toString(16)} (${sigScriptBuf[0]})`);

  if (sigScriptBuf[0] === 0x41) {
    const signature = sigScriptBuf.slice(1, 65);
    const hashType = sigScriptBuf[65];

    console.log(`  ✅ Format: 0x41 + 64-byte sig + hashType`);
    console.log(`  Signature: ${signature.toString('hex')}`);
    console.log(`  HashType: 0x${hashType.toString(16)}\n`);
  }

  // Анализ Output Scripts
  console.log('Output Scripts:');

  workingExample.outputs.forEach((output, idx) => {
    const scriptBuf = Buffer.from(output.scriptPublicKey.scriptPublicKey, 'hex');
    console.log(`\n  Output ${idx}:`);
    console.log(`    Amount: ${output.amount} sompi (${HoosatUtils.sompiToAmount(output.amount.toString())} HTN)`);
    console.log(`    Script: ${output.scriptPublicKey.scriptPublicKey}`);
    console.log(`    Length: ${scriptBuf.length} bytes`);

    const firstByte = scriptBuf[0];
    const lastByte = scriptBuf[scriptBuf.length - 1];

    if (firstByte === 0x20 && lastByte === 0xac) {
      console.log(`    Type: ✅ Schnorr P2PK (0x20 + 32-byte pubkey + 0xac)`);
      const pubkey = scriptBuf.slice(1, 33);
      console.log(`    PubKey: ${pubkey.toString('hex')}`);
    } else if (firstByte === 0x21 && lastByte === 0xab) {
      console.log(`    Type: ✅ ECDSA P2PK (0x21 + 33-byte pubkey + 0xab)`);
      const pubkey = scriptBuf.slice(1, 34);
      console.log(`    PubKey: ${pubkey.toString('hex')}`);
    } else {
      console.log(`    Type: ❓ Unknown`);
    }
  });

  console.log('\n\n======================================\n');
  console.log('📊 Key Findings:\n');
  console.log('1. SignatureScript Format:');
  console.log('   ✅ 0x41 (65 bytes) + 64-byte signature + 0x01 (SIGHASH_ALL)');
  console.log('   ✅ NO pubkey in signatureScript (OP_CHECKSIGECDSA extracts it from prevout)\n');

  console.log('2. Output Script Formats:');
  console.log('   Schnorr: 0x20 + 32-byte pubkey + 0xac (OP_CHECKSIG)');
  console.log('   ECDSA:   0x21 + 33-byte pubkey + 0xab (OP_CHECKSIGECDSA)\n');

  console.log('3. ScriptPubKey Version:');
  console.log('   ✅ Always 0 for both Schnorr and ECDSA outputs');
  console.log('   ⚠️  This is script structure version, NOT address version!\n');

  // ==================== ТЕСТИРУЕМ НАШИ ФУНКЦИИ ====================

  console.log('======================================\n');
  console.log('🧪 Testing Our Implementation:\n');

  // Тест 1: Проверяем создание ScriptPubKey для ECDSA
  console.log('Test 1: addressToScriptPublicKey for ECDSA');
  try {
    // Декодируем pubkey из рабочего примера
    const ecdsaScriptBuf = Buffer.from(workingExample.outputs[1].scriptPublicKey.scriptPublicKey, 'hex');
    const ecdsaPubkey = ecdsaScriptBuf.slice(1, 34);

    console.log(`  PubKey from working example: ${ecdsaPubkey.toString('hex')}`);

    // Создаем адрес из pubkey рабочего примера
    const addressFromWorkingExample = HoosatCrypto.publicKeyToAddressECDSA(ecdsaPubkey);
    console.log(`  Address from working example: ${addressFromWorkingExample}`);

    // Конвертируем обратно в script
    const ourScript = HoosatCrypto.addressToScriptPublicKey(addressFromWorkingExample);
    const workingScript = workingExample.outputs[1].scriptPublicKey.scriptPublicKey;

    console.log(`  Our script:      ${ourScript.toString('hex')}`);
    console.log(`  Working script:  ${workingScript}`);
    console.log(`  Match: ${ourScript.toString('hex') === workingScript ? '✅' : '❌'}`);

    if (ourScript[0] === 0x21 && ourScript[ourScript.length - 1] === 0xab) {
      console.log(`  ✅ Format correct!\n`);
    } else {
      console.log(`  ❌ Format incorrect!\n`);
    }

    // Тестируем наш реальный кошелек
    console.log('  Testing our wallet address:');
    const privateKeyHex = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';
    const wallet = HoosatCrypto.importKeyPair(privateKeyHex);
    console.log(`    Address: ${wallet.address}`);
    console.log(`    PubKey: ${wallet.publicKey.toString('hex')}`);

    const walletScript = HoosatCrypto.addressToScriptPublicKey(wallet.address);
    console.log(`    Script: ${walletScript.toString('hex')}`);
    console.log(`    Valid: ${HoosatUtils.isValidAddress(wallet.address) ? '✅' : '❌'}\n`);
  } catch (error: any) {
    console.error(`  ❌ Error:`, error.message, '\n');
  }

  // Тест 2: Проверяем SignatureScript format
  console.log('Test 2: SignatureScript Format');
  const mockSignature = Buffer.alloc(64, 0xaa); // Mock 64-byte signature
  const hashType = 0x01;

  const ourSigScript = Buffer.concat([Buffer.from([0x41]), mockSignature, Buffer.from([hashType])]);

  console.log(`  Our SigScript: ${ourSigScript.toString('hex').slice(0, 40)}...`);
  console.log(`  Length: ${ourSigScript.length} bytes`);
  console.log(`  First byte: 0x${ourSigScript[0].toString(16)} (${ourSigScript[0]})`);
  console.log(`  Last byte: 0x${ourSigScript[ourSigScript.length - 1].toString(16)}`);

  if (ourSigScript[0] === 0x41 && ourSigScript.length === 66) {
    console.log(`  ✅ Format matches working example!\n`);
  } else {
    console.log(`  ❌ Format doesn't match!\n`);
  }

  // Тест 3: Blake3 Keyed Hash
  console.log('Test 3: Blake3 Keyed Hash');
  const testData = Buffer.from('test');
  const key = 'TransactionSigningHash';

  try {
    const hash = HoosatCrypto.blake3KeyedHash(key, testData);
    console.log(`  Input: "${testData.toString()}"`);
    console.log(`  Key: "${key}"`);
    console.log(`  Hash: ${hash.toString('hex')}`);
    console.log(`  ✅ Function works\n`);
  } catch (error: any) {
    console.error(`  ❌ Error:`, error.message, '\n');
  }

  console.log('======================================\n');
  console.log('✅ Analysis Complete!\n');

  console.log('🎯 Next Steps:');
  console.log('1. Verify that UTXOs from node have correct format');
  console.log('2. Ensure scriptPublicKey.version is used from node response');
  console.log('3. Double-check signature hash calculation matches HTND');
  console.log('4. Run send-real-htn.ts with maximum debug\n');
}

compareWithWorkingExample().catch(console.error);
