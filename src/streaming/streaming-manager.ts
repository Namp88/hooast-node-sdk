import { EventEmitter } from 'events';
import { UtxoChange, UtxoEntry } from '@models/streaming/streaming.types';
import { RequestType } from '@enums/request-type.enum';

export class StreamingManager extends EventEmitter {
  private streamingCall: any = null;
  private subscribedAddresses: Set<string> = new Set();
  private client: any;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;

  constructor(client: any) {
    super();
    this.client = client;
  }

  /**
   * Подписаться на изменения UTXO для адресов
   */
  async subscribeToUtxoChanges(addresses: string[]): Promise<void> {
    // Добавляем новые адреса в список подписок
    addresses.forEach(addr => this.subscribedAddresses.add(addr));

    // Если streaming уже активен - не создаваем новый
    if (this.streamingCall && !this.streamingCall.destroyed) {
      return;
    }

    try {
      await this._createStreamingConnection();
      this.reconnectAttempts = 0; // Сбрасываем счётчик при успешном подключении
    } catch (error) {
      throw new Error(`Failed to subscribe to UTXO changes: ${error}`);
    }
  }

  /**
   * Отписаться от изменений UTXO
   */
  async unsubscribeFromUtxoChanges(addresses?: string[]): Promise<void> {
    if (addresses) {
      // Убираем конкретные адреса
      addresses.forEach(addr => this.subscribedAddresses.delete(addr));

      // Отправляем запрос на отписку
      if (this.streamingCall && !this.streamingCall.destroyed) {
        const unsubscribeMessage = {
          [RequestType.StopNotifyingUtxosChangedRequest]: {
            addresses: addresses,
          },
        };
        this.streamingCall.write(unsubscribeMessage);
      }
    } else {
      // Отписываемся от всех
      this.subscribedAddresses.clear();
      this._closeStreamingConnection();
    }
  }

  /**
   * Создание streaming соединения
   */
  private async _createStreamingConnection(): Promise<void> {
    this.streamingCall = this.client.MessageStream();

    this.streamingCall.on('data', (response: any) => {
      this._handleStreamingMessage(response);
    });

    this.streamingCall.on('error', (error: any) => {
      console.error('Streaming error:', error);
      this.emit('error', error);
      this._handleStreamingError();
    });

    this.streamingCall.on('end', () => {
      console.log('Streaming connection ended');
      this.emit('streamEnded');
      this._handleStreamingError();
    });

    this.streamingCall.on('close', () => {
      console.log('Streaming connection closed');
      this.emit('streamClosed');
    });

    // Отправляем запрос на подписку
    const subscribeMessage = {
      [RequestType.NotifyUtxosChangedRequest]: {
        addresses: Array.from(this.subscribedAddresses),
      },
    };

    this.streamingCall.write(subscribeMessage);
    console.log(`✅ Subscribed to UTXO changes for ${this.subscribedAddresses.size} addresses`);
  }

  /**
   * Обработка входящих сообщений
   */
  private _handleStreamingMessage(response: any): void {
    if (response.utxosChangedNotification) {
      const notification = response.utxosChangedNotification;

      const changes = {
        added: notification.added || [],
        removed: notification.removed || [],
      };

      // Группируем по адресам
      const changesByAddress = this._groupUtxoChangesByAddress(changes);

      // Эмитим события для каждого адреса
      Object.entries(changesByAddress).forEach(([address, addressChanges]) => {
        this.emit('utxoChanged', {
          address,
          changes: addressChanges,
        } as UtxoChange);
      });

      // Общее событие со всеми изменениями
      this.emit('utxosChanged', changes);
    }
  }

  /**
   * Группировка изменений по адресам
   */
  private _groupUtxoChangesByAddress(changes: any): { [address: string]: any } {
    const grouped: { [address: string]: any } = {};

    // Обрабатываем добавленные UTXO
    changes.added.forEach((utxo: any) => {
      const address = utxo.address;
      if (!grouped[address]) {
        grouped[address] = { added: [], removed: [] };
      }
      grouped[address].added.push(this._mapUtxoEntry(utxo));
    });

    // Обрабатываем потраченные UTXO
    changes.removed.forEach((utxo: any) => {
      const address = utxo.address;
      if (!grouped[address]) {
        grouped[address] = { added: [], removed: [] };
      }
      grouped[address].removed.push(this._mapUtxoEntry(utxo));
    });

    return grouped;
  }

  /**
   * Маппинг UTXO entry в стандартизированный формат
   */
  private _mapUtxoEntry(utxo: any): UtxoEntry {
    return {
      outpoint: utxo.outpoint,
      amount: utxo.utxoEntry.amount,
      scriptPublicKey: utxo.utxoEntry.scriptPublicKey,
      blockDaaScore: utxo.utxoEntry.blockDaaScore,
      isCoinbase: utxo.utxoEntry.isCoinbase,
    };
  }

  /**
   * Обработка ошибок streaming соединения
   */
  private _handleStreamingError(): void {
    if (this.subscribedAddresses.size === 0) {
      return; // Нет смысла переподключаться если никто не подписан
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);

    setTimeout(async () => {
      try {
        await this._createStreamingConnection();
        console.log('✅ Streaming reconnected successfully');
        this.emit('reconnected');
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this._handleStreamingError(); // Рекурсивно пытаемся снова
      }
    }, delay);
  }

  /**
   * Закрытие streaming соединения
   */
  private _closeStreamingConnection(): void {
    if (this.streamingCall) {
      this.streamingCall.end();
      this.streamingCall = null;
    }
  }

  /**
   * Получить статус соединения
   */
  isConnected(): boolean {
    return this.streamingCall && !this.streamingCall.destroyed;
  }

  /**
   * Получить список подписанных адресов
   */
  getSubscribedAddresses(): string[] {
    return Array.from(this.subscribedAddresses);
  }

  /**
   * Полное отключение
   */
  disconnect(): void {
    this.subscribedAddresses.clear();
    this._closeStreamingConnection();
    this.removeAllListeners();
    this.reconnectAttempts = 0;
  }
}
