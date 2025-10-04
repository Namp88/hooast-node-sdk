// examples/network-hashrate.ts

import { HoosatNode } from '../src';

async function demonstrateNetworkHashrate() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  console.log('⚡ Получаем хешрейт сети...\n');

  try {
    // Базовый запрос хешрейта (последние 1000 блоков)
    const hashrateResult = await node.estimateNetworkHashesPerSecond();

    if (hashrateResult.ok && hashrateResult.result) {
      const rawHashrate = hashrateResult.result.networkHashesPerSecond;
      const hashrateNum = parseFloat(rawHashrate);

      console.log('✅ Хешрейт сети:');
      console.log(`   Raw: ${rawHashrate} H/s`);

      // Конвертируем в читаемые единицы
      const units = formatHashrate(hashrateNum);
      console.log(`   Читаемый: ${units.value} ${units.unit}`);

      // Сравнение с известными сетями
      console.log('\n📊 Сравнение с другими сетями:');
      const comparison = compareWithOtherNetworks(hashrateNum);
      comparison.forEach(item => {
        console.log(`   ${item.name}: ${item.comparison}`);
      });
    } else {
      console.error('❌ Ошибка получения хешрейта:', hashrateResult.error);
    }

    // Запрос с разными параметрами
    console.log('\n🔍 Анализ за разные периоды:');

    const periods = [
      { window: 1000, name: 'Последние 1000 блоков (~7 часов)' },
      { window: 2000, name: 'Последние 2000 блоков (~14 часов)' },
      { window: 4320, name: 'Последние 24 часа (~4320 блоков)' },
    ];

    for (const period of periods) {
      try {
        const result = await node.estimateNetworkHashesPerSecond(period.window);

        if (result.ok && result.result) {
          const hashrate = parseFloat(result.result.networkHashesPerSecond);
          const formatted = formatHashrate(hashrate);

          console.log(`   ${period.name}: ${formatted.value} ${formatted.unit}`);
        }
      } catch (error) {
        console.log(`   ${period.name}: ошибка`);
      }
    }
  } catch (error) {
    console.error('💥 Ошибка:', error);
  }
}

/**
 * Форматирует хешрейт в читаемые единицы
 */
function formatHashrate(hashesPerSecond: number): { value: string; unit: string } {
  const units = [
    { threshold: 1e18, name: 'EH/s', divisor: 1e18 },
    { threshold: 1e15, name: 'PH/s', divisor: 1e15 },
    { threshold: 1e12, name: 'TH/s', divisor: 1e12 },
    { threshold: 1e9, name: 'GH/s', divisor: 1e9 },
    { threshold: 1e6, name: 'MH/s', divisor: 1e6 },
    { threshold: 1e3, name: 'KH/s', divisor: 1e3 },
    { threshold: 0, name: 'H/s', divisor: 1 },
  ];

  for (const unit of units) {
    if (hashesPerSecond >= unit.threshold) {
      const value = (hashesPerSecond / unit.divisor).toFixed(2);
      return { value, unit: unit.name };
    }
  }

  return { value: hashesPerSecond.toString(), unit: 'H/s' };
}

/**
 * Сравнение с другими известными сетями (примерные значения)
 */
function compareWithOtherNetworks(hoosatHashrate: number): Array<{ name: string; comparison: string }> {
  const networks = [
    { name: 'Bitcoin', hashrate: 400e18 }, // ~400 EH/s
    { name: 'Ethereum (до PoS)', hashrate: 900e12 }, // ~900 TH/s
    { name: 'Litecoin', hashrate: 500e12 }, // ~500 TH/s
    { name: 'Dogecoin', hashrate: 200e12 }, // ~200 TH/s
  ];

  return networks.map(network => {
    const ratio = hoosatHashrate / network.hashrate;

    if (ratio >= 1) {
      return {
        name: network.name,
        comparison: `${ratio.toFixed(1)}x сильнее`,
      };
    } else if (ratio >= 0.1) {
      return {
        name: network.name,
        comparison: `${(ratio * 100).toFixed(1)}% от мощности`,
      };
    } else {
      return {
        name: network.name,
        comparison: `${(1 / ratio).toFixed(0)}x слабее`,
      };
    }
  });
}

/**
 * Мониторинг изменений хешрейта
 */
async function monitorHashrateChanges(node: HoosatNode): Promise<void> {
  console.log('📈 Мониторинг изменений хешрейта...\n');

  let previousHashrate: number | null = null;

  setInterval(async () => {
    try {
      const result = await node.estimateNetworkHashesPerSecond(1000); // Последние ~7 часов

      if (result.ok && result.result) {
        const currentHashrate = parseFloat(result.result.networkHashesPerSecond);
        const formatted = formatHashrate(currentHashrate);
        const timestamp = new Date().toLocaleTimeString();

        let changeIndicator = '';
        if (previousHashrate !== null) {
          const change = ((currentHashrate - previousHashrate) / previousHashrate) * 100;

          if (Math.abs(change) > 5) {
            // Изменение больше 5%
            const direction = change > 0 ? '📈' : '📉';
            changeIndicator = ` ${direction} ${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
          }
        }

        console.log(`[${timestamp}] Хешрейт: ${formatted.value} ${formatted.unit}${changeIndicator}`);

        previousHashrate = currentHashrate;
      }
    } catch (error) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[${timestamp}] Ошибка получения хешрейта`);
    }
  }, 30000); // Каждые 30 секунд
}

/**
 * Анализ силы сети
 */
async function analyzeNetworkSecurity(node: HoosatNode): Promise<void> {
  console.log('🛡️ Анализ безопасности сети...\n');

  try {
    const hashrateResult = await node.estimateNetworkHashesPerSecond(4320); // 24 часа

    if (hashrateResult.ok && hashrateResult.result) {
      const hashrate = parseFloat(hashrateResult.result.networkHashesPerSecond);
      const formatted = formatHashrate(hashrate);

      console.log(`Средний хешрейт за 24 часа: ${formatted.value} ${formatted.unit}`);

      // Оценка безопасности
      const securityLevel = getSecurityLevel(hashrate);
      console.log(`Уровень безопасности: ${securityLevel.emoji} ${securityLevel.description}`);

      // Расчет стоимости атаки 51%
      const attackCost = calculateAttackCost(hashrate);
      console.log(`Стоимость атаки 51%: ~$${attackCost.toLocaleString()} в час`);

      // Анализ стабильности
      console.log('\n📊 Анализ стабильности:');
      const periods = [1000, 2000, 3000, 4320];
      const hashrates: number[] = [];

      for (const period of periods) {
        const result = await node.estimateNetworkHashesPerSecond(period);
        if (result.ok && result.result) {
          hashrates.push(parseFloat(result.result.networkHashesPerSecond));
        }
      }

      if (hashrates.length === periods.length) {
        const variance = calculateVariance(hashrates);
        const stability = variance < 0.1 ? 'Высокая' : variance < 0.3 ? 'Средняя' : 'Низкая';
        console.log(`   Стабильность хешрейта: ${stability} (дисперсия: ${(variance * 100).toFixed(1)}%)`);
      }
    }
  } catch (error) {
    console.error('Ошибка анализа:', error);
  }
}

/**
 * Определение уровня безопасности сети
 */
function getSecurityLevel(hashrate: number): { emoji: string; description: string } {
  if (hashrate > 100e12) {
    // > 100 TH/s
    return { emoji: '🟢', description: 'Очень высокий - сеть хорошо защищена' };
  } else if (hashrate > 10e12) {
    // > 10 TH/s
    return { emoji: '🟡', description: 'Высокий - сеть достаточно защищена' };
  } else if (hashrate > 1e12) {
    // > 1 TH/s
    return { emoji: '🟠', description: 'Средний - требует мониторинга' };
  } else {
    return { emoji: '🔴', description: 'Низкий - сеть уязвима для атак' };
  }
}

/**
 * Примерный расчет стоимости атаки 51%
 */
function calculateAttackCost(hashrate: number): number {
  // Упрощенный расчет: нужно 51% хешрейта + стоимость электричества
  const attackHashrate = hashrate * 0.51;
  const powerConsumptionWatts = (attackHashrate / 1e12) * 3000; // ~3kW на TH/s
  const electricityCostPerKWh = 0.05; // $0.05 за kWh
  const hourlyCost = (powerConsumptionWatts / 1000) * electricityCostPerKWh;

  return Math.round(hourlyCost);
}

/**
 * Расчет дисперсии массива значений
 */
function calculateVariance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance) / mean; // Коэффициент вариации
}

// Экспорты
export { demonstrateNetworkHashrate, monitorHashrateChanges, analyzeNetworkSecurity };

// Запуск примера
if (require.main === module) {
  demonstrateNetworkHashrate().catch(console.error);
}
