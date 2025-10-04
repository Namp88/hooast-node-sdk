import { HoosatNode, HoosatUtils } from '../src';
import { UtxoChange, UtxoChanges, UtxoEntry } from '../src/models/streaming/streaming.types';

async function setupWalletMonitoring(): Promise<void> {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  // Адреса кошелька для мониторинга
  const walletAddresses: string[] = [
    'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu',
    'hoosat:qqdythqca8axcrvl7k0ep62yyzprcv8qw4xvlyvwnq7srx3angqrk92n74kut',
  ];

  try {
    // 📡 Подписываемся на изменения
    await node.subscribeToUtxoChanges(walletAddresses);
    console.log('✅ Подписка на UTXO изменения активна');

    // 💰 Слушаем изменения конкретного адреса (типизированный обработчик)
    node.on('utxoChanged', (change: UtxoChange) => {
      const { address, changes } = change;

      console.log(`\n💳 Изменения для ${address.substring(0, 20)}...:`);

      // Новые UTXO (входящие платежи)
      changes.added.forEach(utxo => {
        const amount: string = HoosatUtils.formatAmount(utxo.amount);
        console.log(`  ✅ Получено: ${amount} HTN`);
        console.log(`     TX: ${utxo.outpoint.transactionId.substring(0, 20)}...`);

        // 🔔 Показать уведомление пользователю
        showNotification(`Получен платёж: ${amount} HTN`);

        // 📱 Обновить баланс в UI
        updateWalletBalance(address);
      });

      // Потраченные UTXO (исходящие платежи)
      changes.removed.forEach((utxo: UtxoEntry) => {
        const amount: string = HoosatUtils.formatAmount(utxo.amount);
        console.log(`  ❌ Потрачено: ${amount} HTN`);
        console.log(`     TX: ${utxo.outpoint.transactionId.substring(0, 20)}...`);

        // 📱 Обновить баланс в UI
        updateWalletBalance(address);
      });
    });

    // 🌐 Слушаем все изменения в сети (типизированный обработчик)
    node.on('utxosChanged', (allChanges: UtxoChanges) => {
      const totalAdded: number = allChanges.added.length;
      const totalRemoved: number = allChanges.removed.length;

      if (totalAdded > 0 || totalRemoved > 0) {
        console.log(`📊 Сетевая активность: +${totalAdded} -${totalRemoved} UTXO`);
        updateNetworkStats(totalAdded, totalRemoved);
      }
    });

    // ⚠️ Обработка ошибок (типизированный обработчик)
    node.on('streamingError', (error: Error) => {
      console.error('❌ Ошибка подписки:', error.message);
      handleStreamingError(error);
    });

    // 🔄 События переподключения (типизированные обработчики)
    node.on('streamEnded', () => {
      console.log('🔄 Подключение прервано, переподключаемся...');
    });

    node.on('streamReconnected', () => {
      console.log('✅ Переподключение успешно!');
    });

    node.on('streamMaxReconnectAttemptsReached', () => {
      console.error('❌ Достигнуто максимальное количество попыток переподключения');
      handleMaxReconnectAttempts();
    });

    // Держим процесс живым
    console.log('🎯 Мониторинг запущен. Нажмите Ctrl+C для остановки');

    // Graceful shutdown
    setupGracefulShutdown(node);
  } catch (error) {
    console.error('💥 Ошибка настройки мониторинга:', error);
    throw error;
  }
}

// ==================== ТИПИЗИРОВАННЫЕ HELPER ФУНКЦИИ ====================

/**
 * Показать уведомление пользователю
 */
function showNotification(message: string): void {
  // Для браузера
  if (typeof window !== 'undefined' && 'Notification' in window) {
    new Notification('Hoosat Wallet', { body: message });
  }

  // Для Node.js можно использовать node-notifier
  console.log(`🔔 ${message}`);
}

/**
 * Обновление баланса в UI
 */
async function updateWalletBalance(address: string): Promise<void> {
  try {
    // Здесь можно обновить баланс в интерфейсе
    console.log(`🔄 Обновляем баланс для ${address.substring(0, 20)}...`);

    // Пример: запросить актуальный баланс
    // const balance = await node.getBalance(address);
    // updateUI(address, balance);
  } catch (error) {
    console.error(`❌ Ошибка обновления баланса для ${address}:`, error);
  }
}

/**
 * Обновление статистики сети
 */
function updateNetworkStats(added: number, removed: number): void {
  // Обновляем счётчики активности в UI
  console.log(`📈 Статистика обновлена: +${added} -${removed}`);

  // Здесь можно обновить графики, счётчики и т.д.
  const activityLevel: 'low' | 'medium' | 'high' = getActivityLevel(added + removed);
  console.log(`📊 Уровень активности сети: ${activityLevel}`);
}

/**
 * Определить уровень активности сети
 */
function getActivityLevel(totalChanges: number): 'low' | 'medium' | 'high' {
  if (totalChanges < 10) return 'low';
  if (totalChanges < 50) return 'medium';
  return 'high';
}

/**
 * Обработка ошибок streaming
 */
function handleStreamingError(error: Error): void {
  // Логирование ошибки
  console.error('Streaming error details:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });

  // Можно отправить ошибку в систему мониторинга
  // sendErrorToMonitoring(error);

  // Показать пользователю
  showNotification('Произошла ошибка соединения. Переподключаемся...');
}

/**
 * Обработка превышения лимита переподключений
 */
function handleMaxReconnectAttempts(): void {
  console.error('❌ Не удалось переподключиться к ноде');
  showNotification('Ошибка: Не удалось подключиться к ноде Hoosat');

  // Можно предложить пользователю выбрать другую ноду
  // showNodeSelectionDialog();
}

/**
 * Добавление новых адресов на лету
 */
async function addNewAddressToMonitoring(node: HoosatNode, newAddress: string): Promise<void> {
  try {
    // Валидация адреса
    if (!HoosatUtils.isValidAddress(newAddress)) {
      throw new Error(`Невалидный адрес: ${newAddress}`);
    }

    await node.subscribeToUtxoChanges([newAddress]);
    console.log(`✅ Добавлен мониторинг для ${newAddress.substring(0, 20)}...`);

    showNotification(`Добавлен мониторинг адреса: ${newAddress.substring(0, 20)}...`);
  } catch (error) {
    console.error('❌ Ошибка добавления адреса:', error);
    showNotification('Ошибка добавления адреса для мониторинга');
    throw error;
  }
}

/**
 * Настройка graceful shutdown
 */
function setupGracefulShutdown(node: HoosatNode): void {
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n🛑 Получен сигнал ${signal}. Останавливаем мониторинг...`);

    try {
      await node.unsubscribeFromUtxoChanges();
      node.disconnect();
      console.log('✅ Мониторинг остановлен успешно');
    } catch (error) {
      console.error('❌ Ошибка при остановке:', error);
    } finally {
      process.exit(0);
    }
  };

  // Обработка различных сигналов
  process.on('SIGINT', () => shutdown('SIGINT')); // Ctrl+C
  process.on('SIGTERM', () => shutdown('SIGTERM')); // Системный shutdown
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
}

// Запуск
if (require.main === module) {
  setupWalletMonitoring().catch((error: Error) => {
    console.error('💥 Критическая ошибка:', error);
    process.exit(1);
  });
}
