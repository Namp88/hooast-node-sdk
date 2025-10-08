import { EventEmitter } from 'node:events';
import { EventType, EventManagerConfig, EventManagerStats } from './event-manager.types';
import { UtxoChangeStream } from '@events/streams/utxo-change/utxo-change-stream';
import { UTXO_CHANGE_STREAM_EVENTS } from '@events/streams/utxo-change/utxo-change-stream.types';
import type { UtxoChangeNotification } from '@events/streams/utxo-change/utxo-change-stream.types';

/**
 * HoosatEventManager - Manages real-time event subscriptions from Hoosat nodes
 *
 * This class provides a unified interface for subscribing to various blockchain events
 * such as UTXO changes, block additions, and chain reorganizations. It handles connection
 * management, automatic reconnection, and event routing.
 *
 * **Currently Supported Events:**
 * - UTXO changes for monitored addresses
 *
 * **Planned Future Support:**
 * - Block addition notifications
 * - Virtual chain changes
 * - DAA score updates
 * - Block template updates (for miners)
 *
 * @example
 * ```typescript
 * const client = new HoosatClient({ host: '...', port: 42420 });
 *
 * // Subscribe to UTXO changes
 * await client.events.subscribeToUtxoChanges(['hoosat:qz7ulu...']);
 *
 * // Listen for events
 * client.events.on('utxoChange', (notification) => {
 *   console.log(`UTXOs changed for ${notification.address}`);
 *   console.log('Added:', notification.changes.added.length);
 *   console.log('Removed:', notification.changes.removed.length);
 * });
 *
 * // Error handling
 * client.events.on('error', (error) => {
 *   console.error('Streaming error:', error);
 * });
 *
 * // Reconnection events
 * client.events.on('disconnect', () => {
 *   console.log('Disconnected from node');
 * });
 *
 * client.events.on('reconnected', () => {
 *   console.log('Successfully reconnected');
 * });
 * ```
 *
 * @fires utxoChange - When UTXOs change for a subscribed address
 * @fires error - When a streaming error occurs
 * @fires disconnect - When disconnected from node
 * @fires reconnecting - When attempting to reconnect
 * @fires reconnected - When reconnection succeeds
 * @fires maxReconnectAttemptsReached - When max reconnection attempts reached
 */
export class HoosatEventManager extends EventEmitter {
  private readonly _config: Required<EventManagerConfig>;
  private readonly _grpcClient: any;

  // Stream managers (one per event type)
  private _utxoStreamManager: UtxoChangeStream | null = null;

  /**
   * Creates a new HoosatEventManager instance
   *
   * @param grpcClient - The gRPC client for node communication
   * @param config - Optional configuration for event management
   *
   * @example
   * ```typescript
   * const events = new HoosatEventManager(grpcClient, {
   *   maxReconnectAttempts: 10,
   *   reconnectDelay: 3000,
   *   debug: true
   * });
   * ```
   */
  constructor(grpcClient: any, config: EventManagerConfig = {}) {
    super();

    this._grpcClient = grpcClient;
    this._config = {
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 2000,
      maxSubscribedAddresses: config.maxSubscribedAddresses ?? 1000,
      debug: config.debug ?? false,
    };
  }

  // ==================== UTXO EVENTS ====================

  /**
   * Subscribe to UTXO changes for specified addresses
   *
   * This method monitors the blockchain for any changes to UTXOs associated with
   * the provided addresses. Events are emitted when UTXOs are added (received funds)
   * or removed (spent funds).
   *
   * @param addresses - Array of Hoosat addresses to monitor
   * @throws Error if addresses array is empty or invalid
   * @throws Error if subscription limit exceeded
   *
   * @example
   * ```typescript
   * await client.events.subscribeToUtxoChanges([
   *   'hoosat:qz7ulu8mmmul6hdcnssmjnt28h2xfer8dz9nfqamvvh86ngef4q8dvzxcjdqe',
   *   'hoosat:qyp4ka9p6mlc2gfrd08m5zau9q4jt4mj93k3gnq9f0x4zcwglmqkgxgjhqk7g'
   * ]);
   *
   * client.events.on('utxoChange', (notification) => {
   *   notification.changes.added.forEach(utxo => {
   *     console.log(`Received ${utxo.amount} sompi`);
   *   });
   *
   *   notification.changes.removed.forEach(utxo => {
   *     console.log(`Spent ${utxo.amount} sompi`);
   *   });
   * });
   * ```
   */
  async subscribeToUtxoChanges(addresses: string[]): Promise<void> {
    if (!addresses || addresses.length === 0) {
      throw new Error('At least one address is required for subscription');
    }

    if (addresses.length > this._config.maxSubscribedAddresses) {
      throw new Error(
        `Cannot subscribe to more than ${this._config.maxSubscribedAddresses} addresses. ` + `Requested: ${addresses.length}`
      );
    }

    // Initialize UTXO stream manager if not exists
    if (!this._utxoStreamManager) {
      this._utxoStreamManager = new UtxoChangeStream(this._grpcClient, {
        maxReconnectAttempts: this._config.maxReconnectAttempts,
        reconnectDelay: this._config.reconnectDelay,
        maxSubscribedAddresses: this._config.maxSubscribedAddresses,
        debug: this._config.debug,
      });

      // Forward events from UTXO stream manager to event manager
      this._setupUtxoEventForwarding();
    }

    // Subscribe to addresses
    await this._utxoStreamManager.subscribeToUtxoChanges(addresses);
  }

  /**
   * Unsubscribe from UTXO changes
   *
   * @param addresses - Optional array of specific addresses to unsubscribe from.
   *                    If not provided, unsubscribes from all addresses.
   *
   * @example
   * ```typescript
   * // Unsubscribe from specific addresses
   * await client.events.unsubscribeFromUtxoChanges([
   *   'hoosat:qz7ulu...'
   * ]);
   *
   * // Unsubscribe from all addresses
   * await client.events.unsubscribeFromUtxoChanges();
   * ```
   */
  async unsubscribeFromUtxoChanges(addresses?: string[]): Promise<void> {
    if (!this._utxoStreamManager) {
      return; // Nothing to unsubscribe from
    }

    // UtxoChangeStream doesn't support partial unsubscribe
    // For now, we disconnect the entire stream
    // In the future, could enhance UtxoChangeStream to support selective unsubscribe

    if (addresses && addresses.length > 0) {
      // TODO: Implement selective unsubscribe in UtxoChangeStream
      // For now, warn and disconnect all
      if (this._config.debug) {
        console.warn('[HoosatEventManager] Selective unsubscribe not yet supported. Disconnecting all.');
      }
    }

    // Disconnect the stream (unsubscribes from all)
    this._utxoStreamManager.disconnect();
    this._utxoStreamManager = null;
  }

  /**
   * Setup event forwarding from UTXO stream manager
   * Converts internal stream events to public EventManager events
   * @private
   */
  private _setupUtxoEventForwarding(): void {
    if (!this._utxoStreamManager) return;

    // Forward UTXO change events with new event name
    this._utxoStreamManager.on(UTXO_CHANGE_STREAM_EVENTS.UTXO_CHANGED, (notification: UtxoChangeNotification) => {
      this.emit(EventType.UtxoChange, notification);
    });

    // Forward error events
    this._utxoStreamManager.on(UTXO_CHANGE_STREAM_EVENTS.ERROR, (error: Error) => {
      this.emit(EventType.Error, error);
    });

    // Forward stream ended as disconnect
    this._utxoStreamManager.on(UTXO_CHANGE_STREAM_EVENTS.STREAM_ENDED, () => {
      this.emit(EventType.Disconnect);
    });

    // Forward reconnection events
    this._utxoStreamManager.on(UTXO_CHANGE_STREAM_EVENTS.RECONNECTED, () => {
      this.emit(EventType.Reconnected);
    });

    // Forward max reconnect attempts reached
    this._utxoStreamManager.on(UTXO_CHANGE_STREAM_EVENTS.MAX_RECONNECT_ATTEMPTS_REACHED, () => {
      this.emit(EventType.MaxReconnectAttemptsReached);
    });

    // We can emit reconnecting event if we add attempt count to UtxoChangeStream
    // For now, just forward the reconnection start
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Unsubscribe from all active event subscriptions
   *
   * This method cleanly unsubscribes from all active event streams including
   * UTXO changes, block notifications, and chain updates.
   *
   * @example
   * ```typescript
   * // Cleanup all subscriptions
   * await client.events.unsubscribeFromAll();
   * ```
   */
  async unsubscribeFromAll(): Promise<void> {
    // Disconnect UTXO stream
    if (this._utxoStreamManager) {
      this._utxoStreamManager.disconnect();
      this._utxoStreamManager = null;
    }
  }

  /**
   * Get current event manager statistics
   *
   * Returns information about active subscriptions, connection status,
   * and reconnection attempts.
   *
   * @returns Current event manager statistics
   *
   * @example
   * ```typescript
   * const stats = client.events.getStats();
   * console.log('Connected:', stats.isConnected);
   * console.log('Monitoring addresses:', stats.utxoSubscriptions);
   * console.log('Reconnect attempts:', stats.reconnectAttempts);
   * ```
   */
  getStats(): EventManagerStats {
    const utxoStats = this._utxoStreamManager?.getStreamStats();

    return {
      isConnected: utxoStats?.isConnected ?? false,
      utxoSubscriptions: utxoStats?.subscribedAddresses ?? [],
      reconnectAttempts: utxoStats?.reconnectAttempts ?? 0,
      maxReconnectAttempts: this._config.maxReconnectAttempts,
      lastError: null, // Could be enhanced to track last error
    };
  }

  /**
   * Check if event manager is connected to node
   *
   * @returns True if connected, false otherwise
   *
   * @example
   * ```typescript
   * if (client.events.isConnected()) {
   *   console.log('Event streaming is active');
   * }
   * ```
   */
  isConnected(): boolean {
    return this._utxoStreamManager?.getStreamStats().isConnected ?? false;
  }

  /**
   * Cleanup and disconnect all event streams
   *
   * This method should be called when shutting down the application
   * to properly close all streaming connections and clean up resources.
   *
   * @example
   * ```typescript
   * // Shutdown cleanup
   * client.events.disconnect();
   * ```
   */
  disconnect(): void {
    // Disconnect UTXO stream
    if (this._utxoStreamManager) {
      this._utxoStreamManager.disconnect();
      this._utxoStreamManager = null;
    }

    // Remove all event listeners
    this.removeAllListeners();
  }
}
