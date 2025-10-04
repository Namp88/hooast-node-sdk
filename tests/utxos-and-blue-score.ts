import { HoosatNode, HoosatUtils } from '../src';

async function demonstrateNewMethods() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  // ==================== 1. GET UTXOs ====================

  console.log('🔍 Получаем UTXOs для адресов...\n');

  const addresses = [
    'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu',
    'hoosat:qqdythqca8axcrvl7k0ep62yyzprcv8qw4xvlyvwnq7srx3angqrk92n74kut',
  ];

  try {
    const utxosResult = await node.getUtxosByAddresses(addresses);

    console.log(utxosResult.result.utxos);

    if (utxosResult.ok && utxosResult.result) {
      console.log(`✅ Найдено ${utxosResult.result.utxos.length} UTXO:`);

      // Группируем UTXO по адресам
      const utxosByAddress = utxosResult.result.utxos.reduce(
        (acc, utxo) => {
          if (!acc[utxo.address]) {
            acc[utxo.address] = [];
          }
          acc[utxo.address].push(utxo);
          return acc;
        },
        {} as Record<string, typeof utxosResult.result.utxos>
      );

      // Показываем статистику по каждому адресу
      Object.entries(utxosByAddress).forEach(([address, utxos]) => {
        console.log(`\n📍 ${address.substring(0, 20)}...:`);
        console.log(`   UTXO: ${utxos.length}`);

        const totalAmount = utxos.reduce((sum, utxo) => {
          return sum + BigInt(utxo.utxoEntry.amount);
        }, 0n);

        console.log(`   Баланс: ${HoosatUtils.formatAmount(totalAmount.toString())} HTN`);

        // Показываем первые 3 UTXO
        utxos.slice(0, 3).forEach((utxo, index) => {
          const amount = HoosatUtils.formatAmount(utxo.utxoEntry.amount);
          console.log(`   ${index + 1}. ${amount} HTN (${utxo.outpoint.transactionId.substring(0, 20)}...)`);
        });

        if (utxos.length > 3) {
          console.log(`   ... и ещё ${utxos.length - 3} UTXO`);
        }
      });
    } else {
      console.error('❌ Ошибка получения UTXO:', utxosResult.error);
    }
  } catch (error) {
    console.error('💥 Ошибка:', error);
  }

  // ==================== 2. GET BLUE SCORE ====================

  console.log('\n📊 Получаем Blue Score сети...\n');

  try {
    const blueScoreResult = await node.getVirtualSelectedParentBlueScore();

    if (blueScoreResult.ok && blueScoreResult.result) {
      console.log(`✅ Текущий Blue Score: ${blueScoreResult.result.blueScore}`);

      // Можно использовать для мониторинга прогресса сети
      const blueScore = parseInt(blueScoreResult.result.blueScore);
      console.log(`   Прогресс сети: ${blueScore.toLocaleString()} блоков`);
    } else {
      console.error('❌ Ошибка получения Blue Score:', blueScoreResult.error);
    }
  } catch (error) {
    console.error('💥 Ошибка:', error);
  }

  // ==================== 3. ПРАКТИЧЕСКИЙ ПРИМЕР ====================

  console.log('\n💡 Практический пример: подготовка транзакции\n');

  try {
    // Получаем UTXO для создания транзакции
    const walletAddress = 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu';
    const utxosResult = await node.getUtxosByAddresses([walletAddress]);

    if (utxosResult.ok && utxosResult.result) {
      const availableUtxos = utxosResult.result.utxos;

      if (availableUtxos.length === 0) {
        console.log('❌ Нет доступных UTXO для транзакции');
        return;
      }

      // Подсчитываем общий баланс
      const totalBalance = availableUtxos.reduce((sum, utxo) => {
        return sum + BigInt(utxo.utxoEntry.amount);
      }, 0n);

      console.log(`💰 Доступный баланс: ${HoosatUtils.formatAmount(totalBalance.toString())} HTN`);
      console.log(`🧾 Количество UTXO: ${availableUtxos.length}`);

      // Сортируем UTXO по размеру (от большего к меньшему)
      const sortedUtxos = availableUtxos.sort((a, b) => {
        const amountA = BigInt(a.utxoEntry.amount);
        const amountB = BigInt(b.utxoEntry.amount);
        return amountA > amountB ? -1 : 1;
      });

      console.log('\n🏆 Топ-3 крупнейших UTXO:');
      sortedUtxos.slice(0, 3).forEach((utxo, index) => {
        const amount = HoosatUtils.formatAmount(utxo.utxoEntry.amount);
        const isCoinbase = utxo.utxoEntry.isCoinbase ? ' (coinbase)' : '';
        console.log(`   ${index + 1}. ${amount} HTN${isCoinbase}`);
      });

      // Пример: отбираем UTXO для транзакции на 1 HTN
      const targetAmount = HoosatUtils.parseAmount('1.0'); // 1 HTN в sompi
      const selectedUtxos = selectUtxosForAmount(sortedUtxos, BigInt(targetAmount));

      if (selectedUtxos.length > 0) {
        const selectedAmount = selectedUtxos.reduce((sum, utxo) => {
          return sum + BigInt(utxo.utxoEntry.amount);
        }, 0n);

        console.log(`\n✅ Выбрано ${selectedUtxos.length} UTXO для транзакции на 1 HTN:`);
        console.log(`   Общая сумма: ${HoosatUtils.formatAmount(selectedAmount.toString())} HTN`);
        console.log(`   Сдача: ${HoosatUtils.formatAmount((selectedAmount - BigInt(targetAmount)).toString())} HTN`);
      } else {
        console.log('❌ Недостаточно средств для транзакции на 1 HTN');
      }
    }
  } catch (error) {
    console.error('💥 Ошибка в практическом примере:', error);
  }
}

/**
 * Простой алгоритм выбора UTXO для транзакции
 */
function selectUtxosForAmount(utxos: any[], targetAmount: bigint): any[] {
  const selected: any[] = [];
  let currentAmount = 0n;

  for (const utxo of utxos) {
    const utxoAmount = BigInt(utxo.utxoEntry.amount);
    selected.push(utxo);
    currentAmount += utxoAmount;

    // Если набрали достаточно - останавливаемся
    if (currentAmount >= targetAmount) {
      break;
    }
  }

  // Возвращаем только если набрали достаточно
  return currentAmount >= targetAmount ? selected : [];
}

// Запуск
demonstrateNewMethods().catch(console.error);
