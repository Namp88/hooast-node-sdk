import { HoosatNode } from '../src';
import { CryptoUtils, TransactionBuilder } from '../src/utils/crypto.utils';

async function testRealTransaction() {
  console.log('🌐 Тест с реальной нодой\n');

  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  // 1. Проверка ноды
  console.log('1️⃣ Проверка подключения к ноде...');
  const info = await node.getInfo();

  if (!info.ok) {
    console.error('❌ Нода недоступна:', info.error);
    return;
  }

  console.log(`   ✅ Подключено к ${info.result.serverVersion}`);
  console.log(`   Synced: ${info.result.isSynced}`);
  console.log(`   UTXO Indexed: ${info.result.isUtxoIndexed}\n`);

  if (!info.result.isUtxoIndexed) {
    console.log('⚠️  UTXO индекс недоступен - запусти с --utxoindex\n');
    return;
  }

  // 2. Создаем тестовый кошелек
  console.log('2️⃣ Генерируем тестовый кошелек...');
  const testWallet = CryptoUtils.generateKeyPair();
  console.log(`   Address: ${testWallet.address}\n`);

  // 3. Проверяем баланс
  console.log('3️⃣ Проверяем баланс...');
  const balance = await node.getBalance(testWallet.address);

  if (balance.ok) {
    console.log(`   Balance: ${node.formatAmount(balance.result.balance)} HTN\n`);
  } else {
    console.log(`   ⚠️  Ошибка: ${balance.error}\n`);
  }

  // 4. Получаем UTXOs (если есть)
  console.log('4️⃣ Получаем UTXOs...');
  const utxos = await node.getUtxosByAddresses([testWallet.address]);

  if (utxos.ok && utxos.result.utxos.length > 0) {
    console.log(`   ✅ Найдено ${utxos.result.utxos.length} UTXO\n`);

    // 5. Создаем РЕАЛЬНУЮ транзакцию
    console.log('5️⃣ Создаем транзакцию...');
    const utxo = utxos.result.utxos[0];
    const recipient = CryptoUtils.generateKeyPair();

    const amount = BigInt(utxo.utxoEntry.amount);
    const sendAmount = amount / 2n; // Половину отправляем
    const fee = 1000n;
    const change = amount - sendAmount - fee;

    try {
      const tx = await new TransactionBuilder()
        .addInput(
          {
            outpoint: utxo.outpoint,
            utxoEntry: {
              amount: utxo.utxoEntry.amount,
              scriptPublicKey: utxo.utxoEntry.scriptPublicKey.scriptPublicKey,
              blockDaaScore: utxo.utxoEntry.blockDaaScore,
              isCoinbase: utxo.utxoEntry.isCoinbase,
            },
          },
          testWallet.privateKey
        )
        .addOutput(recipient.address, sendAmount.toString())
        .addOutput(testWallet.address, change.toString())
        .sign();

      console.log('   ✅ Транзакция подписана!');
      console.log(`   TX ID: ${CryptoUtils.getTransactionId(tx)}\n`);

      // ВНИМАНИЕ: НЕ отправляем в сеть автоматически!
      console.log('⚠️  Транзакция НЕ отправлена (тестовый режим)');
      console.log('   Для отправки раскомментируй код ниже:\n');

      // const result = await node.submitTransaction(tx);
      // if (result.ok) {
      //   console.log('✅ Транзакция отправлена:', result.result.transactionId);
      // }
    } catch (error) {
      console.error('❌ Ошибка создания транзакции:', error);
    }
  } else {
    console.log('   ℹ️  UTXO не найдены\n');
    console.log('   Для полного теста отправь немного HTN на адрес:');
    console.log(`   ${testWallet.address}\n`);
  }

  console.log('✅ Тест с реальной нодой завершен!');
}

testRealTransaction().catch(console.error);
