import { CryptoUtils } from '../src/utils/crypto.utils';

console.log('🔍 Сравнение с HTND\n');

// Известные тестовые данные из HTND
const knownTests = [
  {
    name: 'Blake3 Hash',
    input: Buffer.from('test'),
    expectedHash: '', // Нужно получить из HTND
  },
  {
    name: 'Address from known pubkey',
    publicKey: '', // Hex pubkey из HTND
    expectedAddress: 'hoosat:...', // Из HTND
  },
];

// TODO: Добавь реальные тестовые векторы из HTND
console.log('⚠️  Нужны тестовые векторы из HTND для сравнения');
console.log('   Запусти HTND wallet и получи:');
console.log('   1. Известный публичный ключ -> адрес');
console.log('   2. Известную транзакцию -> signature hash');
console.log('   3. Известную подпись -> проверь валидность\n');
