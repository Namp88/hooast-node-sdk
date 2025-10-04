import { HoosatNode } from '../src';

async function demonstrateNewFeatures() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  console.log('🚀 Демонстрация новых функций SDK...\n');

  // ==================== 1. COIN SUPPLY ====================

  console.log('💰 Получаем информацию об эмиссии...');

  try {
    const supplyResult = await node.getCoinSupply();

    if (supplyResult.ok && supplyResult.result) {
      const supply = supplyResult.result;

      console.log('✅ Информация об эмиссии:');
      console.log(`   Максимальная эмиссия: ${node.formatAmount(supply.maxSupply)} HTN`);
      console.log(`   В обращении: ${node.formatAmount(supply.circulatingSupply)} HTN`);

      // Расчет процента выпуска
      const circulatingBig = BigInt(supply.circulatingSupply);
      const maxBig = BigInt(supply.maxSupply);
      const percentage = (Number(circulatingBig * 100n) / Number(maxBig)).toFixed(2);

      console.log(`   Выпущено: ${percentage}% от максимума`);

      // Оставшиеся к выпуску
      const remaining = maxBig - circulatingBig;
      console.log(`   Осталось к выпуску: ${node.formatAmount(remaining.toString())} HTN`);

      // Анализ инфляции
      console.log('\n📊 Анализ эмиссии:');
      const percentageNum = parseFloat(percentage);

      if (percentageNum < 50) {
        console.log('   🟢 Ранняя стадия - много монет еще будет выпущено');
      } else if (percentageNum < 80) {
        console.log('   🟡 Средняя стадия - инфляция замедляется');
      } else if (percentageNum < 95) {
        console.log('   🟠 Поздняя стадия - низкая инфляция');
      } else {
        console.log('   🔴 Финальная стадия - почти все монеты выпущены');
      }
    } else {
      console.error('❌ Ошибка получения данных об эмиссии:', supplyResult.error);
    }
  } catch (error) {
    console.error('💥 Ошибка:', error);
  }

  // ==================== 2. PENDING TRANSACTIONS ====================

  console.log('\n⏰ Проверяем pending транзакции...');

  try {
    const addresses = [
      'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu',
      'hoosat:qqdythqca8axcrvl7k0ep62yyzprcv8qw4xvlyvwnq7srx3angqrk92n74kut',
    ];

    const pendingResult = await node.getMempoolEntriesByAddresses(addresses);

    if (pendingResult.ok && pendingResult.result) {
      const entries = pendingResult.result.entries;

      console.log(`✅ Проверено адресов: ${entries.length}`);

      let totalPending = 0;

      entries.forEach(entry => {
        const sendingCount = entry.sending.length;
        const receivingCount = entry.receiving.length;
        const totalForAddress = sendingCount + receivingCount;

        if (totalForAddress > 0) {
          console.log(`\n📍 ${entry.address.substring(0, 30)}...:`);

          if (sendingCount > 0) {
            console.log(`   📤 Исходящих: ${sendingCount}`);

            entry.sending.forEach((tx, index) => {
              const fee = node.formatAmount(tx.fee);
              const status = tx.isOrphan ? ' (orphan)' : '';
              console.log(`      ${index + 1}. ${tx.transaction.transactionId.substring(0, 20)}... (комиссия: ${fee} HTN)${status}`);
            });
          }

          if (receivingCount > 0) {
            console.log(`   📥 Входящих: ${receivingCount}`);

            entry.receiving.forEach((tx, index) => {
              const status = tx.isOrphan ? ' (orphan)' : '';
              console.log(`      ${index + 1}. ${tx.transaction.transactionId.substring(0, 20)}...${status}`);
            });
          }
        }

        totalPending += totalForAddress;
      });

      if (totalPending === 0) {
        console.log('✅ Pending транзакций не найдено');
      } else {
        console.log(`\n📊 Всего pending транзакций: ${totalPending}`);
      }
    } else {
      console.error('❌ Ошибка получения pending транзакций:', pendingResult.error);
    }
  } catch (error) {
    console.error('💥 Ошибка:', error);
  }

  // ==================== 3. NETWORK STATISTICS ====================

  console.log('\n📈 Общая статистика сети:');

  try {
    // Собираем разную статистику
    const [supplyResult, infoResult, hashrateResult] = await Promise.all([
      node.getCoinSupply(),
      node.getInfo(),
      node.estimateNetworkHashesPerSecond().catch(() => null),
    ]);

    console.log('✅ Сводная статистика:');

    if (infoResult.ok && infoResult.result) {
      console.log(`   📦 Версия ноды: ${infoResult.result.serverVersion}`);
      console.log(`   💾 Mempool: ${infoResult.result.mempoolSize} транзакций`);
    }

    if (hashrateResult?.ok && hashrateResult.result) {
      const hashrate = parseFloat(hashrateResult.result.networkHashesPerSecond);
      const hashrateGH = (hashrate / 1e9).toFixed(2);
      console.log(`   ⚡ Хешрейт: ${hashrateGH} GH/s`);
    }
  } catch (error) {
    console.error('💥 Ошибка получения статистики:', error);
  }
}

/**
 * Мониторинг pending транзакций для кошелька
 */
async function monitorPendingTransactions(node: HoosatNode, addresses: string[]): Promise<void> {
  console.log('🔄 Запуск мониторинга pending транзакций...\n');

  let previousCounts = new Map<string, number>();

  setInterval(async () => {
    try {
      const pendingResult = await node.getMempoolEntriesByAddresses(addresses);

      if (pendingResult.ok && pendingResult.result) {
        const timestamp = new Date().toLocaleTimeString();

        pendingResult.result.entries.forEach(entry => {
          const currentCount = entry.sending.length + entry.receiving.length;
          const previousCount = previousCounts.get(entry.address) || 0;

          if (currentCount !== previousCount) {
            const shortAddress = entry.address.substring(0, 20) + '...';

            if (currentCount > previousCount) {
              console.log(`[${timestamp}] 📤 ${shortAddress}: новая pending транзакция (${currentCount})`);
            } else if (currentCount < previousCount) {
              console.log(`[${timestamp}] ✅ ${shortAddress}: транзакция подтверждена (${currentCount})`);
            }

            previousCounts.set(entry.address, currentCount);
          }
        });
      }
    } catch (error) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] Ошибка мониторинга pending транзакций`);
    }
  }, 15000); // Каждые 15 секунд
}

/**
 * Анализ комиссий в mempool
 */
async function analyzeMempoolFees(node: HoosatNode, addresses: string[]): Promise<void> {
  try {
    const pendingResult = await node.getMempoolEntriesByAddresses(addresses);

    if (!pendingResult.ok || !pendingResult.result) {
      throw new Error(`Ошибка получения pending транзакций: ${pendingResult.error}`);
    }

    console.log('💸 Анализ комиссий:');

    const allFees: number[] = [];

    pendingResult.result.entries.forEach(entry => {
      entry.sending.forEach(tx => {
        const feeHTN = parseFloat(node.formatAmount(tx.fee));
        allFees.push(feeHTN);
      });
    });

    if (allFees.length === 0) {
      console.log('   Нет исходящих pending транзакций');
      return;
    }

    allFees.sort((a, b) => a - b);

    const minFee = allFees[0];
    const maxFee = allFees[allFees.length - 1];
    const avgFee = allFees.reduce((a, b) => a + b, 0) / allFees.length;
    const medianFee = allFees[Math.floor(allFees.length / 2)];

    console.log(`   Транзакций: ${allFees.length}`);
    console.log(`   Мин. комиссия: ${minFee.toFixed(8)} HTN`);
    console.log(`   Макс. комиссия: ${maxFee.toFixed(8)} HTN`);
    console.log(`   Средняя: ${avgFee.toFixed(8)} HTN`);
    console.log(`   Медиана: ${medianFee.toFixed(8)} HTN`);
  } catch (error) {
    console.error('Ошибка анализа комиссий:', error);
  }
}

/**
 * Сравнение с другими сетями по эмиссии
 */
async function compareEmissionModels(node: HoosatNode): Promise<void> {
  try {
    const supplyResult = await node.getCoinSupply();

    if (!supplyResult.ok || !supplyResult.result) {
      throw new Error('Не удалось получить данные об эмиссии');
    }

    const supply = supplyResult.result;
    const maxSupplyHTN = parseFloat(node.formatAmount(supply.maxSupply));
    const circulatingHTN = parseFloat(node.formatAmount(supply.circulatingSupply));

    console.log('📊 Сравнение эмиссионных моделей:');

    const networks = [
      { name: 'Bitcoin', maxSupply: 21_000_000, type: 'Дефляционная' },
      { name: 'Ethereum', maxSupply: null, type: 'Инфляционная' },
      { name: 'Litecoin', maxSupply: 84_000_000, type: 'Дефляционная' },
      { name: 'Dogecoin', maxSupply: null, type: 'Инфляционная' },
    ];

    console.log(`   Hoosat: ${maxSupplyHTN.toLocaleString()} HTN (дефляционная)`);

    networks.forEach(network => {
      if (network.maxSupply) {
        const ratio = maxSupplyHTN / network.maxSupply;
        console.log(`   ${network.name}: ${network.maxSupply.toLocaleString()} (${ratio.toFixed(1)}x меньше Hoosat)`);
      } else {
        console.log(`   ${network.name}: Без лимита (${network.type})`);
      }
    });
  } catch (error) {
    console.error('Ошибка сравнения эмиссий:', error);
  }
}

// Экспорты
export { demonstrateNewFeatures, monitorPendingTransactions, analyzeMempoolFees, compareEmissionModels };

// Запуск примера
if (require.main === module) {
  demonstrateNewFeatures().catch(console.error);
}
