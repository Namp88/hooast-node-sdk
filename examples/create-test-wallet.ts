import { CryptoUtils } from '../src/utils/crypto.utils';
import * as fs from 'fs';

console.log('📝 Создание тестового кошелька\n');

const wallet = CryptoUtils.generateKeyPair();

console.log('✅ Кошелек создан:');
console.log(`Address: ${wallet.address}`);
console.log(`Private Key: ${wallet.privateKey.toString('hex')}\n`);

// Сохраняем в файл .env
const envContent = `TEST_WALLET_ADDRESS=${wallet.address}
TEST_WALLET_PRIVATE_KEY=${wallet.privateKey.toString('hex')}
`;

fs.writeFileSync('.env.test', envContent);

console.log('✅ Сохранено в .env.test');
console.log('\n📋 СЛЕДУЮЩИЕ ШАГИ:');
console.log('1. Отправь немного HTN на адрес:');
console.log(`   ${wallet.address}`);
console.log('2. Дождись подтверждения транзакции');
console.log('3. Запусти: npm run test:real-tx\n');
