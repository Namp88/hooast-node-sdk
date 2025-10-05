import * as bech32Hoosat from '../src/utils/bech32-hoosat';
import { CryptoUtils } from '../src/utils/crypto.utils';

// Проблемный адрес из ошибки
const testAddress = 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74';

console.log('🔍 Тестируем декодирование адреса\n');
console.log(`Адрес: ${testAddress}\n`);

// Шаг 1: Базовые проверки
console.log('1️⃣ Базовые проверки:');
console.log(`   Начинается с "hoosat:": ${testAddress.startsWith('hoosat:')}`);
console.log(`   Длина после ":": ${testAddress.split(':')[1].length}\n`);

// Шаг 2: Попытка декодирования
console.log('2️⃣ Декодирование Bech32:');
try {
  const decoded = bech32Hoosat.decode(testAddress);
  console.log('   ✅ Декодирование успешно!');
  console.log(`   Версия: 0x${decoded.version.toString(16).padStart(2, '0')}`);
  console.log(`   Prefix: ${decoded.prefix}`);
  console.log(`   Payload length: ${decoded.payload.length} байт`);
  console.log(`   Payload (hex): ${decoded.payload.toString('hex')}\n`);

  // Шаг 3: Валидация через CryptoUtils
  console.log('3️⃣ Валидация через CryptoUtils.isValidAddress:');
  const isValid = CryptoUtils.isValidAddress(testAddress);
  console.log(`   Результат: ${isValid ? '✅ VALID' : '❌ INVALID'}\n`);

  if (!isValid) {
    console.log('⚠️  Адрес декодируется, но не проходит валидацию!');
    console.log('   Проверьте функцию isValidAddress в crypto.utils.ts\n');
  }

  // Шаг 4: Конвертация в ScriptPublicKey
  console.log('4️⃣ Конвертация в ScriptPublicKey:');
  try {
    const scriptPubKey = CryptoUtils.addressToScriptPublicKey(testAddress);
    console.log('   ✅ Конвертация успешна!');
    console.log(`   ScriptPubKey: ${scriptPubKey.toString('hex')}\n`);
  } catch (error) {
    console.error('   ❌ Ошибка конвертации:', error.message, '\n');
  }
} catch (error) {
  console.error('   ❌ Ошибка декодирования:', error.message);
  console.error('   Stack:', error.stack, '\n');
}

// Дополнительные тесты
console.log('5️⃣ Тестируем другие типы адресов:');
const testAddresses = [
  {
    name: 'ECDSA (твой кошелек)',
    address: 'hoosat:qyp2uxq7rl0a95npw0yay82chv22l4f33hd8nween0g5jcge4lk57tqsfw88n2d',
  },
  {
    name: 'Короткий Schnorr',
    address: 'hoosat:qz7ulu6pwqeq6kxpup85fzuukwx7v5z6zs5xspm0ka',
  },
];

testAddresses.forEach(({ name, address }) => {
  try {
    const decoded = bech32Hoosat.decode(address);
    const isValid = CryptoUtils.isValidAddress(address);
    console.log(`   ${name}: ${isValid ? '✅' : '❌'} (version: 0x${decoded.version.toString(16)}, len: ${decoded.payload.length})`);
  } catch (error) {
    console.log(`   ${name}: ❌ Decode failed`);
  }
});

console.log('\n✅ Тест завершен');
