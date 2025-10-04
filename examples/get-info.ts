import { HoosatNode } from '../src';

async function demonstrateGetInfo() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  console.log('📡 Получаем информацию о ноде...\n');

  try {
    const infoResult = await node.getInfo();

    if (infoResult.ok && infoResult.result) {
      const info = infoResult.result;

      console.log('✅ Информация о ноде:');
      console.log(`   Версия сервера: ${info.serverVersion}`);
      console.log(`   P2P ID: ${info.p2pId.substring(0, 20)}...`);
      console.log(`   Синхронизирована: ${info.isSynced ? '✅' : '❌'}`);
      console.log(`   UTXO индекс: ${info.isUtxoIndexed ? '✅ Доступен' : '❌ Недоступен'}`);
      console.log(`   Mempool: ${info.mempoolSize} транзакций`);

      // Проверяем готовность ноды для работы
      console.log('\n🔍 Проверяем состояние ноды:');

      if (!info.isSynced) {
        console.log('⚠️  Нода не синхронизирована - некоторые данные могут быть неактуальными');
      }

      if (!info.isUtxoIndexed) {
        console.log('⚠️  UTXO индекс недоступен - функции getBalance(), getUtxos() работать не будут');
        console.log('    Запустите ноду с флагом --utxoindex');
      }

      if (info.isSynced && info.isUtxoIndexed) {
        console.log('✅ Нода полностью готова к работе!');
      }

      // Анализ версии
      console.log('\n📋 Анализ версии:');
      const version = parseVersion(info.serverVersion);
      console.log(`   Версия: ${version.major}.${version.minor}.${version.patch}`);

      if (version.major < 1) {
        console.log('⚠️  Нода использует pre-release версию');
      }

      // Анализ mempool
      console.log('\n💾 Анализ mempool:');
      const mempoolSize = parseInt(info.mempoolSize);

      if (mempoolSize === 0) {
        console.log('🟢 Mempool пуст - сеть спокойная');
      } else if (mempoolSize < 100) {
        console.log(`🟡 Mempool: ${mempoolSize} транзакций - нормальная активность`);
      } else if (mempoolSize < 1000) {
        console.log(`🟠 Mempool: ${mempoolSize} транзакций - высокая активность`);
      } else {
        console.log(`🔴 Mempool: ${mempoolSize} транзакций - очень высокая активность`);
        console.log('    Транзакции могут обрабатываться медленнее обычного');
      }
    } else {
      console.error('❌ Ошибка получения информации о ноде:', infoResult.error);
    }
  } catch (error) {
    console.error('💥 Ошибка подключения к ноде:', error);
    console.log('\n🔧 Возможные причины:');
    console.log('   • Нода не запущена');
    console.log('   • Неправильный хост или порт');
    console.log('   • Сетевые проблемы');
    console.log('   • Фаервол блокирует соединение');
  }
}

/**
 * Утилита для парсинга версии
 */
function parseVersion(versionString: string): { major: number; minor: number; patch: number } {
  // Примеры: "v1.2.3", "1.2.3-beta", "v0.12.5+commit.abc123"
  const match = versionString.match(/v?(\d+)\.(\d+)\.(\d+)/);

  if (match) {
    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3]),
    };
  }

  return { major: 0, minor: 0, patch: 0 };
}

/**
 * Проверка совместимости SDK с нодой
 */
async function checkCompatibility(node: HoosatNode): Promise<boolean> {
  try {
    const infoResult = await node.getInfo();

    if (!infoResult.ok || !infoResult.result) {
      console.error('❌ Не удалось получить информацию о ноде');
      return false;
    }

    const info = infoResult.result;

    // Проверяем минимальные требования
    const checks = [
      {
        name: 'Синхронизация',
        passed: info.isSynced,
        message: 'Нода должна быть синхронизирована',
      },
      {
        name: 'UTXO индекс',
        passed: info.isUtxoIndexed,
        message: 'Для работы с балансами нужен UTXO индекс',
      },
      {
        name: 'Версия',
        passed: !info.serverVersion.includes('unknown'),
        message: 'Неизвестная версия ноды',
      },
    ];

    console.log('\n🔍 Проверка совместимости:');

    let allPassed = true;
    for (const check of checks) {
      const status = check.passed ? '✅' : '❌';
      console.log(`   ${status} ${check.name}`);

      if (!check.passed) {
        console.log(`      ${check.message}`);
        allPassed = false;
      }
    }

    if (allPassed) {
      console.log('\n✅ SDK полностью совместим с нодой!');
    } else {
      console.log('\n⚠️  Обнаружены проблемы совместимости');
    }

    return allPassed;
  } catch (error) {
    console.error('💥 Ошибка проверки совместимости:', error);
    return false;
  }
}

/**
 * Мониторинг состояния ноды
 */
async function monitorNodeHealth(node: HoosatNode): Promise<void> {
  console.log('📊 Запуск мониторинга ноды...\n');

  setInterval(async () => {
    try {
      const infoResult = await node.getInfo();

      if (infoResult.ok && infoResult.result) {
        const info = infoResult.result;
        const timestamp = new Date().toLocaleTimeString();

        console.log(`[${timestamp}] Статус: ${info.isSynced ? '🟢' : '🔴'} | Mempool: ${info.mempoolSize}`);

        // Предупреждения
        const mempoolSize = parseInt(info.mempoolSize);
        if (mempoolSize > 2000) {
          console.log(`⚠️  [${timestamp}] Высокая загрузка mempool: ${mempoolSize} транзакций`);
        }

        if (!info.isSynced) {
          console.log(`❌ [${timestamp}] Нода потеряла синхронизацию!`);
        }
      } else {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`❌ [${timestamp}] Ошибка получения статуса ноды`);
      }
    } catch (error) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(`💥 [${timestamp}] Ошибка подключения к ноде`);
    }
  }, 10000); // Каждые 10 секунд
}

// Функция для быстрой проверки ноды
async function quickHealthCheck(host: string, port: number): Promise<void> {
  console.log(`🏥 Быстрая проверка ноды ${host}:${port}...\n`);

  const node = new HoosatNode({ host, port, timeout: 5000 });

  const startTime = Date.now();

  try {
    const infoResult = await node.getInfo();
    const responseTime = Date.now() - startTime;

    if (infoResult.ok && infoResult.result) {
      const info = infoResult.result;

      console.log('✅ Нода отвечает');
      console.log(`⏱️  Время ответа: ${responseTime}ms`);
      console.log(`📦 Версия: ${info.serverVersion}`);
      console.log(`🔄 Синхронизация: ${info.isSynced ? 'Да' : 'Нет'}`);
      console.log(`💾 Mempool: ${info.mempoolSize} транзакций`);

      // Рейтинг здоровья
      let healthScore = 0;
      if (info.isSynced) healthScore += 40;
      if (info.isUtxoIndexed) healthScore += 30;
      if (responseTime < 1000) healthScore += 20;
      if (parseInt(info.mempoolSize) < 500) healthScore += 10;

      console.log(`🏥 Здоровье ноды: ${healthScore}/100`);

      if (healthScore >= 80) {
        console.log('🟢 Отличное состояние');
      } else if (healthScore >= 60) {
        console.log('🟡 Удовлетворительное состояние');
      } else {
        console.log('🔴 Требует внимания');
      }
    } else {
      console.log('❌ Нода недоступна');
    }
  } catch (error) {
    console.log(`❌ Ошибка подключения: ${error}`);
  }
}

// Экспорты
export { demonstrateGetInfo, checkCompatibility, monitorNodeHealth, quickHealthCheck };

// Запуск примера
if (require.main === module) {
  demonstrateGetInfo()
    .then(() => {
      console.log('\n🔄 Запуск проверки совместимости...');

      const node = new HoosatNode({
        host: '54.38.176.95',
        port: 42420,
      });

      return checkCompatibility(node);
    })
    .catch(console.error);
}
