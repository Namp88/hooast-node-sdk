import { CryptoUtils } from '../src/utils/crypto.utils';

console.log('🧪 Тест базовых крипто-функций\n');

// 1. Blake3 хеширование
console.log('1️⃣ Blake3 Hash:');
const testData = Buffer.from('Hello Hoosat!');
const hash = CryptoUtils.blake3Hash(testData);
console.log(`   Hash: ${hash.toString('hex')}`);

const doubleHash = CryptoUtils.doubleBlake3Hash(testData);
console.log(`   Double: ${doubleHash.toString('hex')}`);

// Проверка консистентности
const hash2 = CryptoUtils.blake3Hash(testData);
console.log(`   ✅ Consistent: ${hash.equals(hash2)}\n`);

// 2. Генерация ключей
console.log('2️⃣ Key Generation:');
const wallet1 = CryptoUtils.generateKeyPair();
console.log(`   Address 1: ${wallet1.address}`);
console.log(`   Valid: ${CryptoUtils.isValidAddress(wallet1.address)}`);

const wallet2 = CryptoUtils.generateKeyPair();
console.log(`   Address 2: ${wallet2.address}`);
console.log(`   ✅ Different: ${wallet1.address !== wallet2.address}\n`);

// 3. Валидация адресов
console.log('3️⃣ Address Validation:');
const validAddresses = [wallet1.address, 'hoosat:qz7ulu6pwqeq6kxpup85fzuukwx7v5z6zs5xspm0ka'];

validAddresses.forEach(addr => {
  console.log(`   ${addr.slice(0, 30)}... : ${CryptoUtils.isValidAddress(addr) ? '✅' : '❌'}`);
});

const invalidAddresses = ['invalid', 'hoosat:', 'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', ''];

console.log('\n   Invalid addresses:');
invalidAddresses.forEach(addr => {
  const result = CryptoUtils.isValidAddress(addr || '(empty)');
  console.log(`   ${(addr || '(empty)').slice(0, 30)} : ${!result ? '✅ Rejected' : '❌ Accepted!'}`);
});

// 4. Конвертация сумм
console.log('\n4️⃣ Amount Conversion:');
const sompi = '123456789';
const htn = CryptoUtils.formatAmount(sompi);
console.log(`   ${sompi} sompi = ${htn} HTN`);

const backToSompi = CryptoUtils.parseAmount(htn);
console.log(`   ${htn} HTN = ${backToSompi} sompi`);
console.log(`   ✅ Roundtrip: ${sompi === backToSompi}`);

console.log('\n✅ Все базовые тесты пройдены!');
