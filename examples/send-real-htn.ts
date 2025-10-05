import { HoosatNode } from '../src';
import { CryptoUtils, TransactionBuilder } from '../src/utils/crypto.utils';

/**
 * Полный пример отправки HTN с адреса
 * Все что нужно - это privateKey от адреса
 */
async function sendHTN() {
  // 1️⃣ Восстанавливаем кошелек из приватного ключа
  const privateKeyHex = '4ca34b781f6eaeee59be8d9629516d9b1d16e587e57890d1b381c72fcb8a9e4a'; // Сохраненный при генерации
  const wallet = CryptoUtils.importKeyPair(privateKeyHex);

  console.log('💼 Кошелек восстановлен:');
  console.log(`   Адрес: ${wallet.address}\n`);

  // 2️⃣ Подключаемся к ноде
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  // 3️⃣ Проверяем баланс
  console.log('💰 Проверяем баланс...');
  const balanceResult = await node.getBalance(wallet.address);

  if (!balanceResult.ok || balanceResult.result.balance === '0') {
    console.log('❌ Недостаточно средств на адресе');
    return;
  }

  const balance = balanceResult.result.balance;
  console.log(`   Баланс: ${node.formatAmount(balance)} HTN\n`);

  // 4️⃣ Получаем UTXOs для создания транзакции
  console.log('📦 Получаем UTXOs...');
  const utxosResult = await node.getUtxosByAddresses([wallet.address]);

  if (!utxosResult.ok || utxosResult.result.utxos.length === 0) {
    console.log('❌ Нет доступных UTXOs');
    return;
  }

  const utxos = utxosResult.result.utxos;
  console.log(`   Найдено ${utxos.length} UTXO\n`);

  // 5️⃣ Параметры отправки
  const recipientAddress = 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74'; // Куда отправляем
  const amountToSend = '0.25'; // Сколько HTN отправить

  console.log('📤 Создаем транзакцию:');
  console.log(`   Отправить: ${amountToSend} HTN`);
  console.log(`   На адрес: ${recipientAddress}\n`);

  try {
    // 6️⃣ Создаем и подписываем транзакцию
    const transaction = await buildAndSignTransaction(wallet.privateKey, wallet.address, recipientAddress, amountToSend, utxos, node);

    console.log('✅ Транзакция создана и подписана!');
    console.log(`   TX ID: ${CryptoUtils.getTransactionId(transaction)}\n`);

    // 7️⃣ Отправляем в сеть
    console.log('🌐 Отправляем в сеть...');
    const submitResult = await node.submitTransaction(transaction);

    if (submitResult.ok) {
      console.log('✅ Транзакция отправлена успешно!');
      console.log(`   TX ID: ${submitResult.result.transactionId}`);
      console.log(`   Explorer: https://explorer.hoosat.fi/tx/${submitResult.result.transactionId}`);
    } else {
      console.error('❌ Ошибка отправки:', submitResult.error);
    }
  } catch (error) {
    console.error('💥 Ошибка:', error);
  }
}

/**
 * Создание и подписание транзакции
 */
async function buildAndSignTransaction(
  privateKey: Buffer,
  fromAddress: string,
  toAddress: string,
  amountHTN: string,
  utxos: any[],
  node: HoosatNode
) {
  const builder = new TransactionBuilder();

  // Конвертируем сумму в sompi
  const targetAmount = BigInt(node.parseAmount(amountHTN));

  // Оцениваем комиссию
  const estimatedFee = BigInt(CryptoUtils.calculateFee(utxos.length, 2)); // 2 outputs (получатель + сдача)

  // Выбираем UTXOs
  const { selectedUtxos, totalInput } = selectUtxosForAmount(utxos, targetAmount + estimatedFee);

  if (selectedUtxos.length === 0) {
    throw new Error('Недостаточно средств для транзакции + комиссия');
  }

  console.log('   📊 Детали транзакции:');
  console.log(`      Отправить: ${node.formatAmount(targetAmount)} HTN`);
  console.log(`      Комиссия: ${node.formatAmount(estimatedFee)} HTN`);
  console.log(`      UTXOs: ${selectedUtxos.length}`);

  // Добавляем inputs
  selectedUtxos.forEach(utxo => {
    builder.addInput(
      {
        outpoint: utxo.outpoint,
        utxoEntry: {
          amount: utxo.utxoEntry.amount,
          scriptPublicKey: utxo.utxoEntry.scriptPublicKey.scriptPublicKey,
          blockDaaScore: utxo.utxoEntry.blockDaaScore,
          isCoinbase: utxo.utxoEntry.isCoinbase,
        },
      },
      privateKey
    );
  });

  // Output для получателя
  builder.addOutput(toAddress, targetAmount.toString());

  // Сдача (change) возвращаем себе
  const change = totalInput - targetAmount - estimatedFee;
  if (change > 0n) {
    builder.addOutput(fromAddress, change.toString());
    console.log(`      Сдача: ${node.formatAmount(change)} HTN`);
  }

  // Устанавливаем комиссию
  builder.setFee(estimatedFee.toString());

  // Валидируем перед подписью
  builder.validate();

  // Подписываем
  return await builder.sign();
}

/**
 * Выбор UTXOs для суммы
 */
function selectUtxosForAmount(utxos: any[], targetAmount: bigint): { selectedUtxos: any[]; totalInput: bigint } {
  // Сортируем от большего к меньшему
  const sorted = [...utxos].sort((a, b) => {
    const amountA = BigInt(a.utxoEntry.amount);
    const amountB = BigInt(b.utxoEntry.amount);
    return amountA > amountB ? -1 : 1;
  });

  const selected: any[] = [];
  let totalInput = 0n;

  for (const utxo of sorted) {
    const amount = BigInt(utxo.utxoEntry.amount);
    selected.push(utxo);
    totalInput += amount;

    if (totalInput >= targetAmount) {
      break;
    }
  }

  return { selectedUtxos: selected, totalInput };
}

// Запуск
sendHTN().catch(console.error);
