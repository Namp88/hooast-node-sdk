import { HoosatNode } from '../src';
import { HoosatUtils } from '../src/utils/utils';

async function demonstrateWalletBalances() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  console.log('💰 Демонстрация работы с балансами...\n');

  // ==================== 1. SINGLE BALANCE ====================

  console.log('📍 Проверяем баланс одного адреса:');

  try {
    const address = 'hoosat:qyp2uxq7rl0a95npw0yay62chv22l4f33hd8nween6g5jcge4lk57tqsfw88n2d';

    const balanceResult = await node.getBalance(address);

    if (balanceResult.ok && balanceResult.result) {
      const balance = balanceResult.result;

      console.log(`   Адрес: ${address.substring(0, 30)}...`);
      console.log(`   Баланс (raw): ${balance.balance} sompi`);
      console.log(`   Баланс (HTN): ${HoosatUtils.sompiToAmount(balance.balance)} HTN`);

      // Анализ баланса
      const balanceHTN = parseFloat(HoosatUtils.sompiToAmount(balance.balance));

      if (balanceHTN === 0) {
        console.log('   Статус: 🔴 Адрес пустой');
      } else if (balanceHTN < 1) {
        console.log('   Статус: 🟡 Малый баланс');
      } else if (balanceHTN < 100) {
        console.log('   Статус: 🟢 Нормальный баланс');
      } else {
        console.log('   Статус: 🟢 Крупный баланс');
      }
    } else {
      console.error('   ❌ Ошибка получения баланса:', balanceResult.error);

      if (balanceResult.error?.includes('utxoindex')) {
        console.log('   💡 Решение: Запустите ноду с флагом --utxoindex');
      }
    }
  } catch (error) {
    console.error('💥 Ошибка:', error);
  }

  // ==================== 2. MULTIPLE BALANCES ====================

  console.log('\n📍 Проверяем балансы нескольких адресов:');

  try {
    const addresses = [
      'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu',
      'hoosat:qqdythqca8axcrvl7k0ep62yyzprcv8qw4xvlyvwnq7srx3angqrk92n74kut',
    ];

    const balancesResult = await node.getBalances(addresses);

    if (balancesResult.ok && balancesResult.result) {
      const balances = balancesResult.result.balances;

      console.log(`   Получено балансов: ${balances.length}`);
      console.log('');

      let totalBalance = 0n;

      balances.forEach((balance, index) => {
        const balanceHTN = HoosatUtils.sompiToAmount(balance.balance);
        const shortAddress = balance.address.substring(0, 30) + '...';

        console.log(`   ${index + 1}. ${shortAddress}`);
        console.log(`      Баланс: ${balanceHTN} HTN`);

        totalBalance += BigInt(balance.balance);
      });

      console.log('');
      console.log(`   💎 Общий баланс: ${HoosatUtils.sompiToAmount(totalBalance.toString())} HTN`);

      // Статистика по балансам
      console.log('\n📊 Статистика:');

      const nonZeroBalances = balances.filter(b => b.balance !== '0');
      const emptyAddresses = balances.length - nonZeroBalances.length;

      console.log(`   Активные адреса: ${nonZeroBalances.length}/${balances.length}`);
      console.log(`   Пустые адреса: ${emptyAddresses}`);

      if (nonZeroBalances.length > 0) {
        const avgBalance = totalBalance / BigInt(nonZeroBalances.length);
        console.log(`   Средний баланс: ${HoosatUtils.sompiToAmount(avgBalance.toString())} HTN`);
      }
    } else {
      console.error('   ❌ Ошибка получения балансов:', balancesResult.error);
    }
  } catch (error) {
    console.error('💥 Ошибка:', error);
  }

  // ==================== 3. WALLET PORTFOLIO ====================

  console.log('\n📊 Анализ портфеля кошелька:');

  try {
    // Примерные адреса кошелька
    const walletAddresses = [
      'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu',
      'hoosat:qqdythqca8axcrvl7k0ep62yyzprcv8qw4xvlyvwnq7srx3angqrk92n74kut',
    ];

    const portfolio = await analyzeWalletPortfolio(node, walletAddresses);

    console.log(`   Всего адресов: ${portfolio.totalAddresses}`);
    console.log(`   Активных адресов: ${portfolio.activeAddresses}`);
    console.log(`   Общий баланс: ${portfolio.totalBalance} HTN`);
    console.log(`   Крупнейший адрес: ${portfolio.largestBalance} HTN`);
    console.log(`   Распределение: ${portfolio.distribution}`);
  } catch (error) {
    console.error('💥 Ошибка анализа портфеля:', error);
  }
}

/**
 * Анализ портфеля кошелька
 */
async function analyzeWalletPortfolio(node: HoosatNode, addresses: string[]) {
  const balancesResult = await node.getBalances(addresses);

  if (!balancesResult.ok || !balancesResult.result) {
    throw new Error(`Ошибка получения балансов: ${balancesResult.error}`);
  }

  const balances = balancesResult.result.balances;

  // Подсчет статистики
  let totalBalance = 0n;
  let largestBalance = 0n;
  let activeAddresses = 0;

  balances.forEach(balance => {
    const amount = BigInt(balance.balance);
    totalBalance += amount;

    if (amount > 0n) {
      activeAddresses++;
      if (amount > largestBalance) {
        largestBalance = amount;
      }
    }
  });

  // Анализ распределения
  let distribution = 'Равномерное';
  if (activeAddresses > 0) {
    const avgBalance = totalBalance / BigInt(activeAddresses);
    const ratio = Number(largestBalance) / Number(avgBalance);

    if (ratio > 10) {
      distribution = 'Концентрированное';
    } else if (ratio > 3) {
      distribution = 'Неравномерное';
    }
  }

  return {
    totalAddresses: addresses.length,
    activeAddresses,
    totalBalance: HoosatUtils.sompiToAmount(totalBalance.toString()),
    largestBalance: HoosatUtils.sompiToAmount(largestBalance.toString()),
    distribution,
  };
}

/**
 * Мониторинг изменений балансов
 */
async function monitorBalanceChanges(node: HoosatNode, addresses: string[]): Promise<void> {
  console.log('🔄 Запуск мониторинга балансов...\n');

  let previousBalances = new Map<string, string>();

  // Получаем начальные балансы
  const initialResult = await node.getBalances(addresses);
  if (initialResult.ok && initialResult.result) {
    initialResult.result.balances.forEach(balance => {
      previousBalances.set(balance.address, balance.balance);
    });
  }

  setInterval(async () => {
    try {
      const currentResult = await node.getBalances(addresses);

      if (currentResult.ok && currentResult.result) {
        const timestamp = new Date().toLocaleTimeString();

        currentResult.result.balances.forEach(balance => {
          const previousBalance = previousBalances.get(balance.address) || '0';

          if (balance.balance !== previousBalance) {
            const change = BigInt(balance.balance) - BigInt(previousBalance);
            const changeHTN = HoosatUtils.sompiToAmount(change.toString());
            const direction = change > 0n ? '📈' : '📉';
            const shortAddress = balance.address.substring(0, 20) + '...';

            console.log(`[${timestamp}] ${direction} ${shortAddress}: ${changeHTN > '0' ? '+' : ''}${changeHTN} HTN`);

            previousBalances.set(balance.address, balance.balance);
          }
        });
      }
    } catch (error) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] Ошибка мониторинга балансов`);
    }
  }, 10000); // Каждые 10 секунд
}

/**
 * Проверка готовности ноды для работы с балансами
 */
async function checkBalanceFeatureAvailability(node: HoosatNode): Promise<boolean> {
  try {
    const infoResult = await node.getInfo();

    if (!infoResult.ok || !infoResult.result) {
      console.error('❌ Не удалось получить информацию о ноде');
      return false;
    }

    if (!infoResult.result.isUtxoIndexed) {
      console.error('❌ UTXO индекс недоступен');
      console.log('💡 Запустите ноду с флагом: --utxoindex');
      return false;
    }

    if (!infoResult.result.isSynced) {
      console.warn('⚠️  Нода не синхронизирована - балансы могут быть неактуальными');
    }

    console.log('✅ Функции работы с балансами доступны');
    return true;
  } catch (error) {
    console.error('💥 Ошибка проверки:', error);
    return false;
  }
}

// Экспорты
export { demonstrateWalletBalances, analyzeWalletPortfolio, monitorBalanceChanges, checkBalanceFeatureAvailability };

// Запуск примера
if (require.main === module) {
  checkBalanceFeatureAvailability(
    new HoosatNode({
      host: '54.38.176.95',
      port: 42420,
    })
  )
    .then(isAvailable => {
      if (isAvailable) {
        return demonstrateWalletBalances();
      } else {
        console.log('⚠️  Функции балансов недоступны');
      }
    })
    .catch(console.error);
}
