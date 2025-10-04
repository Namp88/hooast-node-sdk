import { HoosatNode } from '../src';
import { Transaction, TransactionInput, TransactionOutput } from '../src/models/transaction/transaction.types';

async function demonstrateTransactionSending() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  console.log('💸 Демонстрация отправки транзакций...\n');

  // ==================== 1. SIMPLE TRANSACTION EXAMPLE ====================

  console.log('📤 Создаем простую транзакцию:');

  try {
    // ВАЖНО: Это упрощенный пример. В реальности нужны дополнительные шаги:
    // 1. Получение UTXO с помощью getUtxosByAddresses()
    // 2. Создание и подпись транзакции
    // 3. Расчет правильных комиссий

    const exampleTransaction: Transaction = {
      version: 1,
      inputs: [
        {
          previousOutpoint: {
            transactionId: 'a1b2c3d4e5f6789...', // ID предыдущей транзакции
            index: 0, // Индекс output'а
          },
          signatureScript: '304502210...', // Подпись (создается кошельком)
          sequence: '18446744073709551615',
        },
      ],
      outputs: [
        {
          amount: node.parseAmount('10.5'), // 10.5 HTN в sompi
          scriptPublicKey: {
            version: 0,
            scriptPublicKey: '76a914...', // Адрес получателя в script форме
          },
        },
        {
          amount: node.parseAmount('89.4'), // Сдача
          scriptPublicKey: {
            version: 0,
            scriptPublicKey: '76a914...', // Адрес отправителя (сдача)
          },
        },
      ],
      lockTime: '0',
      subnetworkId: '0000000000000000000000000000000000000000',
    };

    console.log('   Отправляем транзакцию...');

    const submitResult = await node.submitTransaction(exampleTransaction);

    if (submitResult.ok && submitResult.result) {
      console.log('✅ Транзакция отправлена успешно!');
      console.log(`   Transaction ID: ${submitResult.result.transactionId}`);
      console.log(`   Explore: https://explorer.hoosat.fi/tx/${submitResult.result.transactionId}`);

      // Мониторинг статуса транзакции
      await monitorTransactionStatus(node, submitResult.result.transactionId);
    } else {
      console.error('❌ Ошибка отправки транзакции:', submitResult.error);
      handleTransactionError(submitResult.error);
    }
  } catch (error) {
    console.error('💥 Ошибка:', error);
  }
}

/**
 * Полный процесс создания и отправки транзакции
 */
async function createAndSendTransaction(
  node: HoosatNode,
  fromAddress: string,
  toAddress: string,
  amount: string // в HTN
): Promise<string | null> {
  try {
    console.log(`💸 Отправка ${amount} HTN с ${fromAddress.substring(0, 20)}... на ${toAddress.substring(0, 20)}...`);

    // Шаг 1: Получаем доступные UTXO
    console.log('1️⃣ Получаем доступные UTXO...');
    const utxosResult = await node.getUtxosByAddresses([fromAddress]);

    if (!utxosResult.ok || !utxosResult.result) {
      throw new Error(`Ошибка получения UTXO: ${utxosResult.error}`);
    }

    const availableUtxos = utxosResult.result.utxos;
    if (availableUtxos.length === 0) {
      throw new Error('Нет доступных UTXO для транзакции');
    }

    // Шаг 2: Выбираем UTXO для транзакции
    console.log('2️⃣ Выбираем UTXO для транзакции...');
    const targetAmountSompi = BigInt(node.parseAmount(amount));
    const selectedUtxos = selectUtxosForAmount(availableUtxos, targetAmountSompi);

    if (selectedUtxos.length === 0) {
      throw new Error('Недостаточно средств для транзакции');
    }

    const totalInputAmount = selectedUtxos.reduce((sum, utxo) => {
      return sum + BigInt(utxo.utxoEntry.amount);
    }, 0n);

    console.log(`   Выбрано ${selectedUtxos.length} UTXO на сумму ${node.formatAmount(totalInputAmount.toString())} HTN`);

    // Шаг 3: Создаем inputs
    console.log('3️⃣ Создаем transaction inputs...');
    const inputs: TransactionInput[] = selectedUtxos.map(utxo => ({
      previousOutpoint: utxo.outpoint,
      signatureScript: '', // Подпись будет добавлена кошельком
      sequence: '18446744073709551615',
    }));

    // Шаг 4: Создаем outputs
    console.log('4️⃣ Создаем transaction outputs...');
    const fee = 1000n; // Примерная комиссия в sompi
    const changeAmount = totalInputAmount - targetAmountSompi - fee;

    const outputs: TransactionOutput[] = [
      // Output для получателя
      {
        amount: targetAmountSompi.toString(),
        scriptPublicKey: {
          version: 0,
          scriptPublicKey: addressToScript(toAddress), // Конвертация адреса в script
        },
      },
    ];

    // Добавляем сдачу если нужно
    if (changeAmount > 0n) {
      outputs.push({
        amount: changeAmount.toString(),
        scriptPublicKey: {
          version: 0,
          scriptPublicKey: addressToScript(fromAddress),
        },
      });
    }

    // Шаг 5: Создаем транзакцию
    console.log('5️⃣ Создаем транзакцию...');
    const transaction: Transaction = {
      version: 1,
      inputs,
      outputs,
      lockTime: '0',
      subnetworkId: '0000000000000000000000000000000000000000',
    };

    console.log('   ⚠️  ВНИМАНИЕ: В реальности транзакция должна быть подписана!');
    console.log('   Подпись обычно происходит в кошельке с приватными ключами');

    // Шаг 6: Отправляем транзакцию
    console.log('6️⃣ Отправляем транзакцию...');
    const submitResult = await node.submitTransaction(transaction);

    if (submitResult.ok && submitResult.result) {
      const txId = submitResult.result.transactionId;
      console.log('✅ Транзакция отправлена!');
      console.log(`   TX ID: ${txId}`);
      console.log(`   Сумма: ${amount} HTN`);
      console.log(`   Комиссия: ${node.formatAmount(fee.toString())} HTN`);

      return txId;
    } else {
      throw new Error(`Ошибка отправки: ${submitResult.error}`);
    }
  } catch (error) {
    console.error('💥 Ошибка создания транзакции:', error);
    return null;
  }
}

/**
 * Простой алгоритм выбора UTXO для транзакции
 */
function selectUtxosForAmount(utxos: any[], targetAmount: bigint): any[] {
  // Сортируем UTXO от большего к меньшему
  const sortedUtxos = utxos.sort((a, b) => {
    const amountA = BigInt(a.utxoEntry.amount);
    const amountB = BigInt(b.utxoEntry.amount);
    return amountA > amountB ? -1 : 1;
  });

  const selected: any[] = [];
  let currentAmount = 0n;

  for (const utxo of sortedUtxos) {
    const utxoAmount = BigInt(utxo.utxoEntry.amount);
    selected.push(utxo);
    currentAmount += utxoAmount;

    // Добавляем примерную комиссию к целевой сумме
    const targetWithFee = targetAmount + 1000n; // +1000 sompi комиссия

    if (currentAmount >= targetWithFee) {
      break;
    }
  }

  return currentAmount >= targetAmount ? selected : [];
}

/**
 * Конвертация адреса в script (упрощенная версия)
 */
function addressToScript(address: string): string {
  // ВНИМАНИЕ: Это заглушка! В реальности нужна правильная реализация
  // которая конвертирует hoosat: адрес в script public key
  console.log('⚠️  ЗАГЛУШКА: addressToScript() должна быть реализована');
  return '76a914' + '0'.repeat(40) + '88ac'; // Пример P2PKH script
}

/**
 * Мониторинг статуса транзакции
 */
async function monitorTransactionStatus(node: HoosatNode, txId: string): Promise<void> {
  console.log('\n🔍 Мониторинг статуса транзакции...');

  const maxAttempts = 10;
  let attempts = 0;

  const checkStatus = async (): Promise<void> => {
    try {
      attempts++;

      // Проверяем в mempool
      const mempoolResult = await node.getMempoolEntry(txId);

      if (mempoolResult.ok && mempoolResult.result?.transaction) {
        console.log(`[${attempts}] 🟡 Транзакция в mempool (ожидает подтверждения)`);

        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // Проверяем каждые 5 секунд
        } else {
          console.log('⏰ Время ожидания истекло. Транзакция все еще в mempool');
        }
        return;
      }

      // Если не в mempool, возможно уже подтверждена
      console.log(`[${attempts}] ✅ Транзакция подтверждена или не найдена в mempool`);
    } catch (error) {
      console.log(`[${attempts}] ❌ Ошибка проверки статуса: ${error}`);

      if (attempts < maxAttempts) {
        setTimeout(checkStatus, 5000);
      }
    }
  };

  // Начинаем мониторинг через 2 секунды
  setTimeout(checkStatus, 2000);
}

/**
 * Обработка ошибок отправки транзакций
 */
function handleTransactionError(error: string | null): void {
  if (!error) return;

  console.log('\n🔧 Анализ ошибки:');

  if (error.includes('insufficient funds')) {
    console.log('   💰 Недостаточно средств - проверьте баланс');
  } else if (error.includes('fee too low')) {
    console.log('   💸 Комиссия слишком мала - увеличьте fee');
  } else if (error.includes('invalid signature')) {
    console.log('   ✍️  Неправильная подпись - проверьте подписание');
  } else if (error.includes('double spend')) {
    console.log('   🔄 Попытка двойного расходования - UTXO уже использованы');
  } else if (error.includes('orphan')) {
    console.log('   👶 Orphan транзакция - родительская транзакция не найдена');
  } else {
    console.log(`   ❓ Неизвестная ошибка: ${error}`);
  }
}

/**
 * Расчет оптимальной комиссии
 */
async function calculateOptimalFee(node: HoosatNode, transactionSize: number): Promise<bigint> {
  try {
    // Получаем текущие транзакции в mempool для анализа комиссий
    const mempoolResult = await node.getMempoolEntries();

    if (mempoolResult.ok && mempoolResult.result) {
      const entries = mempoolResult.result.entries;

      if (entries.length === 0) {
        // Mempool пуст - минимальная комиссия
        return 100n; // 100 sompi
      }

      // Анализируем комиссии в mempool
      const fees = entries.map(entry => BigInt(entry.fee || '0'));
      fees.sort((a, b) => (a > b ? 1 : -1));

      // Берем медианную комиссию
      const medianFee = fees[Math.floor(fees.length / 2)];

      // Возвращаем медианную комиссию, но не меньше минимума
      return medianFee > 100n ? medianFee : 100n;
    }
  } catch (error) {
    console.log('Ошибка расчета комиссии, используем минимальную');
  }

  return 100n; // Минимальная комиссия по умолчанию
}

// Экспорты
export { demonstrateTransactionSending, createAndSendTransaction, monitorTransactionStatus, calculateOptimalFee };

// Запуск примера
if (require.main === module) {
  console.log('⚠️  ВНИМАНИЕ: Это демонстрационный код!');
  console.log('   В реальности транзакции должны быть правильно подписаны');
  console.log('   и адреса корректно сконвертированы в scripts.\n');

  demonstrateTransactionSending().catch(console.error);
}
