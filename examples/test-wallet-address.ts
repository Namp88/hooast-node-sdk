import { CryptoUtils } from '../src/utils/crypto.utils';
import * as bech32Hoosat from '../src/utils/bech32-hoosat';
import { HoosatUtils } from '../src/utils/utils';

/**
 * Быстрая проверка адреса кошелька
 */
async function testWalletAddress() {
  console.log('🔑 Testing Wallet Address\n');

  const privateKeyHex = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';

  console.log('1️⃣ Importing wallet from private key...');
  const wallet = CryptoUtils.importKeyPair(privateKeyHex);

  console.log(`   Private key: ${privateKeyHex}`);
  console.log(`   Public key:  ${wallet.publicKey.toString('hex')}`);
  console.log(`   Address:     ${wallet.address}\n`);

  // Проверка валидности адреса
  console.log('2️⃣ Validating address...');
  const isValid = HoosatUtils.isValidAddress(wallet.address);
  console.log(`   Valid: ${isValid ? '✅' : '❌'}\n`);

  if (!isValid) {
    console.log('❌ Address is INVALID! Investigating...\n');

    try {
      const decoded = bech32Hoosat.decode(wallet.address);
      console.log('   Decoded successfully (should not happen if invalid)');
      console.log(`   Prefix: ${decoded.prefix}`);
      console.log(`   Version: 0x${decoded.version.toString(16)}`);
      console.log(`   Payload length: ${decoded.payload.length} bytes`);
    } catch (error: any) {
      console.log(`   Bech32 decode error: ${error.message}`);
    }
    return;
  }

  // Декодируем адрес
  console.log('3️⃣ Decoding address...');
  try {
    const decoded = bech32Hoosat.decode(wallet.address);
    console.log(`   Prefix: ${decoded.prefix}`);
    console.log(`   Version: 0x${decoded.version.toString(16)} (${decoded.version})`);
    console.log(`   Payload length: ${decoded.payload.length} bytes`);
    console.log(`   Payload: ${decoded.payload.toString('hex')}\n`);

    // Сравниваем payload с нашим pubkey
    console.log('4️⃣ Comparing payload with public key...');
    const match = decoded.payload.equals(wallet.publicKey);
    console.log(`   Payload matches PubKey: ${match ? '✅' : '❌'}\n`);

    if (!match) {
      console.log('   Payload: ', decoded.payload.toString('hex'));
      console.log('   PubKey:  ', wallet.publicKey.toString('hex'));
      console.log('   ⚠️  MISMATCH!\n');
    }
  } catch (error: any) {
    console.error(`   ❌ Decode error: ${error.message}\n`);
  }

  // Конвертируем в ScriptPubKey
  console.log('5️⃣ Converting to ScriptPubKey...');
  try {
    const scriptPubKey = CryptoUtils.addressToScriptPublicKey(wallet.address);
    console.log(`   Script: ${scriptPubKey.toString('hex')}`);
    console.log(`   Length: ${scriptPubKey.length} bytes`);

    // Анализируем формат
    const firstByte = scriptPubKey[0];
    const lastByte = scriptPubKey[scriptPubKey.length - 1];

    console.log(`   First byte: 0x${firstByte.toString(16)} (${firstByte})`);
    console.log(`   Last byte:  0x${lastByte.toString(16)}`);

    if (firstByte === 0x21 && lastByte === 0xab) {
      console.log(`   ✅ ECDSA format correct: 0x21 + 33-byte pubkey + 0xab\n`);

      const pubkeyInScript = scriptPubKey.slice(1, 34);
      console.log(`   PubKey in script: ${pubkeyInScript.toString('hex')}`);
      console.log(`   Our wallet PubKey: ${wallet.publicKey.toString('hex')}`);
      console.log(`   Match: ${pubkeyInScript.equals(wallet.publicKey) ? '✅' : '❌'}\n`);
    } else {
      console.log(`   ⚠️  Unexpected format!\n`);
    }
  } catch (error: any) {
    console.error(`   ❌ Script conversion error: ${error.message}\n`);
  }

  // Round-trip test
  console.log('6️⃣ Round-trip test (pubkey → address → script → check)...');
  try {
    // Создаем адрес из pubkey
    const addressFromPubkey = CryptoUtils.publicKeyToAddressECDSA(wallet.publicKey);
    console.log(`   Generated address: ${addressFromPubkey}`);
    console.log(`   Original address:  ${wallet.address}`);
    console.log(`   Match: ${addressFromPubkey === wallet.address ? '✅' : '❌'}\n`);

    if (addressFromPubkey !== wallet.address) {
      console.log('   ⚠️  ADDRESS MISMATCH!\n');

      // Детальное сравнение
      console.log('   Detailed comparison:');
      for (let i = 0; i < Math.max(addressFromPubkey.length, wallet.address.length); i++) {
        if (addressFromPubkey[i] !== wallet.address[i]) {
          console.log(`   Position ${i}: '${addressFromPubkey[i] || '?'}' vs '${wallet.address[i] || '?'}'`);
        }
      }
    }
  } catch (error: any) {
    console.error(`   ❌ Round-trip error: ${error.message}\n`);
  }

  console.log('======================================\n');
  console.log('✅ Test Complete!\n');

  if (isValid) {
    console.log('🎯 Next step: Run real transaction test');
    console.log('   npm run test:send-real-htn');
  } else {
    console.log('⚠️  Fix address generation before testing transactions!');
  }
}

testWalletAddress().catch(console.error);
