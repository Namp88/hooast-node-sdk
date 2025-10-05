import * as secp256k1 from 'secp256k1';
import { CryptoUtils } from '../src/utils/crypto.utils';
import { HoosatNode } from '../src';

async function testPubkeyMatch() {
  console.log('🔍 Проверка соответствия ключей\n');

  // Ваш приватный ключ
  const privateKeyHex = '4ca34b781f6eaeee59be8d9629516d9b1d16e587e57890d1b381c72fcb8a9e4a';
  const privateKey = Buffer.from(privateKeyHex, 'hex');

  // 1. Генерируем публичный ключ
  const publicKey = Buffer.from(secp256k1.publicKeyCreate(privateKey, true));
  console.log('1️⃣ Публичный ключ из приватного:');
  console.log(`   ${publicKey.toString('hex')}`);
  console.log(`   Длина: ${publicKey.length} bytes\n`);

  // 2. Создаем адрес через наш CryptoUtils
  const wallet = CryptoUtils.importKeyPair(privateKeyHex);
  console.log('2️⃣ Адрес из importKeyPair:');
  console.log(`   ${wallet.address}\n`);

  // 3. Получаем UTXO с ноды
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  console.log('3️⃣ Получаем UTXOs с ноды...');
  const utxosResult = await node.getUtxosByAddresses([wallet.address]);

  if (utxosResult.ok && utxosResult.result.utxos.length > 0) {
    const utxo = utxosResult.result.utxos[0];
    const scriptHex = utxo.utxoEntry.scriptPublicKey.scriptPublicKey;

    console.log(`   Найдено ${utxosResult.result.utxos.length} UTXO`);
    console.log(`   ScriptPubKey: ${scriptHex}\n`);

    // Парсим скрипт
    const scriptBuf = Buffer.from(scriptHex, 'hex');

    if (scriptBuf.length >= 35 && scriptBuf[0] === 0x21) {
      // ECDSA: 0x21 <33-byte pubkey> 0xab
      const pubkeyInScript = scriptBuf.slice(1, 34);

      console.log('4️⃣ Публичный ключ в UTXO ScriptPubKey:');
      console.log(`   ${pubkeyInScript.toString('hex')}`);
      console.log(`   Длина: ${pubkeyInScript.length} bytes\n`);

      // Сравниваем
      const match = publicKey.equals(pubkeyInScript);

      console.log('5️⃣ Результат сравнения:');
      if (match) {
        console.log('   ✅ КЛЮЧИ СОВПАДАЮТ! Проблема не в ключах.\n');

        // Значит проблема в signature hash или в подписи
        console.log('⚠️  Ключи правильные, но подпись неверная.');
        console.log('   Проблема либо в:');
        console.log('   1. Алгоритме создания signature hash');
        console.log('   2. Алгоритме ECDSA подписи');
        console.log('   3. Формате SignatureScript\n');
      } else {
        console.log('   ❌ КЛЮЧИ НЕ СОВПАДАЮТ!\n');
        console.log('   Наш pubkey:  ', publicKey.toString('hex'));
        console.log('   UTXO pubkey: ', pubkeyInScript.toString('hex'));
        console.log('\n   Это значит что UTXO принадлежит другому адресу!');
      }
    } else if (scriptBuf.length >= 34 && scriptBuf[0] === 0x20) {
      // Schnorr: 0x20 <32-byte pubkey> 0xac
      console.log('   ⚠️  Это Schnorr UTXO, а мы пытаемся подписать ECDSA!');
    } else {
      console.log('   ❌ Неизвестный формат скрипта');
    }
  } else {
    console.log('   ❌ Нет UTXOs или ошибка:', utxosResult.error);
  }
}

testPubkeyMatch().catch(console.error);
