import { HoosatNode } from '../src';
import { CryptoUtils, TransactionBuilder } from '../src/utils/crypto.utils';

/**
 * Полный пример отправки HTN с адреса
 * ИСПРАВЛЕННАЯ ВЕРСИЯ с правильным keyed blake3
 */
async function sendHTN() {
  const privateKeyHex = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';
  const wallet = CryptoUtils.importKeyPair(privateKeyHex);

  console.log('💼 Кошелек восстановлен:');
  console.log(`   Адрес: ${wallet.address}\n`);

  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  console.log('💰 Проверяем баланс...');
  const balanceResult = await node.getBalance(wallet.address);

  if (!balanceResult.ok || balanceResult.result.balance === '0') {
    console.log('❌ Недостаточно средств на адресе');
    return;
  }

  const balance = balanceResult.result.balance;
  console.log(`   Баланс: ${node.formatAmount(balance)} HTN\n`);

  console.log('📦 Получаем UTXOs...');
  const utxosResult = await node.getUtxosByAddresses([wallet.address]);

  if (!utxosResult.ok || utxosResult.result.utxos.length === 0) {
    console.log('❌ Нет доступных UTXOs');
    return;
  }

  const utxos = utxosResult.result.utxos;
  console.log(`   Найдено ${utxos.length} UTXO\n`);

  const recipientAddress = 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74';
  const amountToSend = '0.25';

  console.log('📤 Создаем транзакцию:');
  console.log(`   Отправить: ${amountToSend} HTN`);
  console.log(`   На адрес: ${recipientAddress}\n`);

  try {
    const transaction = await buildAndSignTransaction(wallet.privateKey, wallet.address, recipientAddress, amountToSend, utxos, node);

    console.log('✅ Транзакция создана и подписана!');
    console.log(`   TX ID: ${CryptoUtils.getTransactionId(transaction)}\n`);

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

async function buildAndSignTransaction(
  privateKey: Buffer,
  fromAddress: string,
  toAddress: string,
  amountHTN: string,
  utxos: any[],
  node: HoosatNode
) {
  const builder = new TransactionBuilder();

  const targetAmount = BigInt(node.parseAmount(amountHTN));
  const estimatedFee = BigInt(CryptoUtils.calculateFee(utxos.length, 2));

  const { selectedUtxos, totalInput } = selectUtxosForAmount(utxos, targetAmount + estimatedFee);

  if (selectedUtxos.length === 0) {
    throw new Error('Недостаточно средств для транзакции + комиссия');
  }

  console.log('   📊 Детали транзакции:');
  console.log(`      Отправить: ${node.formatAmount(targetAmount)} HTN`);
  console.log(`      Комиссия: ${node.formatAmount(estimatedFee)} HTN`);
  console.log(`      UTXOs: ${selectedUtxos.length}`);

  // КРИТИЧНО: Правильная структура scriptPublicKey из ответа ноды!
  selectedUtxos.forEach(utxo => {
    builder.addInput(
      {
        outpoint: utxo.outpoint,
        utxoEntry: {
          amount: utxo.utxoEntry.amount,
          scriptPublicKey: {
            version: utxo.utxoEntry.scriptPublicKey.version,
            script: utxo.utxoEntry.scriptPublicKey.scriptPublicKey, // ← ТУТ правильное поле!
          },
          blockDaaScore: utxo.utxoEntry.blockDaaScore,
          isCoinbase: utxo.utxoEntry.isCoinbase,
        },
      },
      privateKey
    );
  });

  builder.addOutput(toAddress, targetAmount.toString());

  const change = totalInput - targetAmount - estimatedFee;
  if (change > 0n) {
    builder.addOutput(fromAddress, change.toString());
    console.log(`      Сдача: ${node.formatAmount(change)} HTN`);
  }

  builder.setFee(estimatedFee.toString());
  builder.validate();

  return await builder.sign();
}

function selectUtxosForAmount(utxos: any[], targetAmount: bigint): { selectedUtxos: any[]; totalInput: bigint } {
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

sendHTN().catch(console.error);
