import { EventEmitter } from 'events';
import { UtxoChange, UtxoEntry, UtxoChanges } from '@models/streaming/streaming.types';
import { RequestType } from '@enums/request-type.enum';

// ==================== CONSTANTS ====================

/** Streaming configuration constants */
const STREAMING_CONFIG = {
  /** Maximum number of reconnection attempts before giving up */
  MAX_RECONNECT_ATTEMPTS: 5,
  /** Initial delay between reconnection attempts in milliseconds */
  BASE_RECONNECT_DELAY: 2000,
  /** Maximum addresses that can be subscribed at once */
  MAX_SUBSCRIBED_ADDRESSES: 1000,
} as const;

/** Streaming event names for type safety */
export const STREAMING_EVENTS = {
  UTXO_CHANGED: 'utxoChanged',
  UTXOS_CHANGED: 'utxosChanged',
  ERROR: 'error',
  STREAM_ENDED: 'streamEnded',
  STREAM_CLOSED: 'streamClosed',
  RECONNECTED: 'reconnected',
  MAX_RECONNECT_ATTEMPTS_REACHED: 'maxReconnectAttemptsReached',
} as const;

// ==================== INTERFACES ====================

/** Configuration options for StreamingManager */
export interface StreamingManagerConfig {
  /** Maximum number of reconnection attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Base delay between reconnection attempts in ms (default: 2000) */
  reconnectDelay?: number;
  /** Maximum number of addresses that can be subscribed (default: 1000) */
  maxSubscribedAddresses?: number;
}

/** Statistics about the streaming connection */
export interface StreamingStats {
  /** Whether the streaming connection is active */
  isConnected: boolean;
  /** Number of currently subscribed addresses */
  subscribedAddressCount: number;
  /** Current reconnection attempt count */
  reconnectAttempts: number;
  /** Maximum allowed reconnection attempts */
  maxReconnectAttempts: number;
  /** List of subscribed addresses */
  subscribedAddresses: string[];
}

// ==================== MAIN CLASS ====================

/**
 * StreamingManager handles real-time UTXO change notifications from Hoosat nodes
 *
 * This class manages WebSocket-like streaming connections to receive live updates
 * when UTXOs are added or removed for subscribed addresses. It includes automatic
 * reconnection with exponential backoff and proper error handling.
 *
 * @example
 * ```typescript
 * const streamingManager = new StreamingManager(grpcClient);
 *
 * // Subscribe to UTXO changes
 * await streamingManager.subscribeToUtxoChanges(['hoosat:...']);
 *
 * // Listen for events
 * streamingManager.on('utxoChanged', (change) => {
 *   console.log(`UTXO change for ${change.address}`);
 *   console.log('Added:', change.changes.added.length);
 *   console.log('Removed:', change.changes.removed.length);
 * });
 *
 * streamingManager.on('reconnected', () => {
 *   console.log('Streaming reconnected successfully');
 * });
 * ```
 *
 * @fires StreamingManager#utxoChanged - When UTXOs change for a specific address
 * @fires StreamingManager#utxosChanged - When any UTXOs change in the subscription
 * @fires StreamingManager#error - When a streaming error occurs
 * @fires StreamingManager#streamEnded - When the stream ends unexpectedly
 * @fires StreamingManager#streamClosed - When the stream is closed
 * @fires StreamingManager#reconnected - When reconnection succeeds
 * @fires StreamingManager#maxReconnectAttemptsReached - When max reconnect attempts reached
 */
export class StreamingManager extends EventEmitter {
  private streamingCall: any = null;
  private subscribedAddresses: Set<string> = new Set();
  private client: any;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectDelay: number;
  private readonly maxSubscribedAddresses: number;

  /**
   * Creates a new StreamingManager instance
   *
   * @param client - The gRPC client instance for communication
   * @param config - Optional configuration for streaming behavior
   *
   * @example
   * ```typescript
   * const streamingManager = new StreamingManager(grpcClient, {
   *   maxReconnectAttempts: 10,
   *   reconnectDelay: 3000,
   *   maxSubscribedAddresses: 500
   * });
   * ```
   */
  constructor(client: any, config: StreamingManagerConfig = {}) {
    super();

    if (!client) {
      throw new Error('gRPC client is required for StreamingManager');
    }

    this.client = client;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? STREAMING_CONFIG.MAX_RECONNECT_ATTEMPTS;
    this.reconnectDelay = config.reconnectDelay ?? STREAMING_CONFIG.BASE_RECONNECT_DELAY;
    this.maxSubscribedAddresses = config.maxSubscribedAddresses ?? STREAMING_CONFIG.MAX_SUBSCRIBED_ADDRESSES;
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Subscribes to UTXO changes for the specified addresses
   *
   * This method adds the provided addresses to the subscription list and establishes
   * a streaming connection if one doesn't exist. If addresses are already subscribed,
   * they won't be duplicated.
   *
   * @param addresses - Array of Hoosat addresses to monitor for UTXO changes
   * @throws Error if addresses array is invalid or streaming connection fails
   *
   * @example
   * ```typescript
   * // Subscribe to multiple addresses
   * await streamingManager.subscribeToUtxoChanges([
   *   'hoosat:qz7ulu...',
   *   'hoosat:qq8xdv...'
   * ]);
   *
   * // Add more addresses to existing subscription
   * await streamingManager.subscribeToUtxoChanges(['hoosat:qr9xyz...']);
   * ```
   */
  async subscribeToUtxoChanges(addresses: string[]): Promise<void> {
    this._validateAddresses(addresses);

    // Check subscription limits
    const newSubscriptionCount = this.subscribedAddresses.size + addresses.filter(addr => !this.subscribedAddresses.has(addr)).length;

    if (newSubscriptionCount > this.maxSubscribedAddresses) {
      throw new Error(`Cannot subscribe to ${newSubscriptionCount} addresses. ` + `Maximum allowed: ${this.maxSubscribedAddresses}`);
    }

    // Add new addresses to subscription list
    const newAddresses = addresses.filter(addr => !this.subscribedAddresses.has(addr));
    addresses.forEach(addr => this.subscribedAddresses.add(addr));

    console.log(`📡 Adding ${newAddresses.length} new addresses to subscription`);

    // Create streaming connection if it doesn't exist
    if (!this.streamingCall || this.streamingCall.destroyed) {
      try {
        await this._createStreamingConnection();
        this.reconnectAttempts = 0;
      } catch (error) {
        // Remove the addresses we just added since connection failed
        newAddresses.forEach(addr => this.subscribedAddresses.delete(addr));
        throw new Error(`Failed to subscribe to UTXO changes: ${error}`);
      }
    } else if (newAddresses.length > 0) {
      // If connection exists and we have new addresses, send update
      try {
        await this._updateSubscription();
      } catch (error) {
        console.error('Failed to update subscription:', error);
        // Don't throw here, existing connection might still work
      }
    }
  }

  /**
   * Unsubscribes from UTXO changes for specific addresses or all addresses
   *
   * @param addresses - Optional array of specific addresses to unsubscribe from.
   *                   If not provided, unsubscribes from all addresses and closes connection.
   * @throws Error if unsubscription message fails to send
   *
   * @example
   * ```typescript
   * // Unsubscribe from specific addresses
   * await streamingManager.unsubscribeFromUtxoChanges(['hoosat:qz7ulu...']);
   *
   * // Unsubscribe from all addresses and close connection
   * await streamingManager.unsubscribeFromUtxoChanges();
   * ```
   */
  async unsubscribeFromUtxoChanges(addresses?: string[]): Promise<void> {
    if (addresses) {
      this._validateAddresses(addresses);

      // Remove specific addresses
      const removedAddresses = addresses.filter(addr => this.subscribedAddresses.has(addr));
      addresses.forEach(addr => this.subscribedAddresses.delete(addr));

      console.log(`📡 Removed ${removedAddresses.length} addresses from subscription`);

      // Send unsubscribe message if connection is active
      if (this.streamingCall && !this.streamingCall.destroyed && removedAddresses.length > 0) {
        try {
          const unsubscribeMessage = {
            [RequestType.StopNotifyingUtxosChangedRequest]: {
              addresses: removedAddresses,
            },
          };
          this.streamingCall.write(unsubscribeMessage);
        } catch (error) {
          console.error('Failed to send unsubscribe message:', error);
          // Don't throw, as local state is already updated
        }
      }

      // Close connection if no more addresses
      if (this.subscribedAddresses.size === 0) {
        this._closeStreamingConnection();
      }
    } else {
      // Unsubscribe from all addresses
      console.log('📡 Unsubscribing from all addresses');
      this.subscribedAddresses.clear();
      this._closeStreamingConnection();
    }
  }

  /**
   * Checks if the streaming connection is currently active and healthy
   *
   * @returns True if streaming connection is active, false otherwise
   *
   * @example
   * ```typescript
   * if (streamingManager.isConnected()) {
   *   console.log('Streaming is active');
   * } else {
   *   console.log('Streaming is disconnected');
   *   // Maybe try to reconnect or show offline status
   * }
   * ```
   */
  isConnected(): boolean {
    return this.streamingCall && !this.streamingCall.destroyed;
  }

  /**
   * Gets the list of addresses currently subscribed for UTXO change notifications
   *
   * @returns Array of Hoosat addresses currently being monitored
   *
   * @example
   * ```typescript
   * const subscribed = streamingManager.getSubscribedAddresses();
   * console.log(`Monitoring ${subscribed.length} addresses:`);
   * subscribed.forEach(addr => console.log(`  - ${addr}`));
   * ```
   */
  getSubscribedAddresses(): string[] {
    return Array.from(this.subscribedAddresses);
  }

  /**
   * Gets comprehensive statistics about the streaming connection
   *
   * @returns Object containing connection status, subscription info, and reconnection data
   *
   * @example
   * ```typescript
   * const stats = streamingManager.getStreamingStats();
   * console.log('Connection Status:', stats.isConnected);
   * console.log('Subscribed Addresses:', stats.subscribedAddressCount);
   * console.log('Reconnect Attempts:', stats.reconnectAttempts);
   * ```
   */
  getStreamingStats(): StreamingStats {
    return {
      isConnected: this.isConnected(),
      subscribedAddressCount: this.subscribedAddresses.size,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      subscribedAddresses: this.getSubscribedAddresses(),
    };
  }

  /**
   * Manually triggers a reconnection attempt
   *
   * This method can be used to force a reconnection if the automatic
   * reconnection has failed or if you want to refresh the connection.
   *
   * @throws Error if no addresses are subscribed or reconnection fails
   *
   * @example
   * ```typescript
   * try {
   *   await streamingManager.forceReconnect();
   *   console.log('Reconnection successful');
   * } catch (error) {
   *   console.error('Reconnection failed:', error);
   * }
   * ```
   */
  async forceReconnect(): Promise<void> {
    if (this.subscribedAddresses.size === 0) {
      throw new Error('Cannot reconnect: No addresses are subscribed');
    }

    console.log('🔄 Forcing reconnection...');

    // Close existing connection
    this._closeStreamingConnection();

    // Reset reconnection counter for manual reconnect
    this.reconnectAttempts = 0;

    try {
      await this._createStreamingConnection();
      console.log('✅ Manual reconnection successful');
      this.emit(STREAMING_EVENTS.RECONNECTED);
    } catch (error) {
      console.error('❌ Manual reconnection failed:', error);
      throw new Error(`Manual reconnection failed: ${error}`);
    }
  }

  /**
   * Cleanly disconnects from streaming and removes all subscriptions
   *
   * This method should be called when the StreamingManager is no longer needed
   * to ensure proper cleanup of resources and event listeners.
   *
   * @example
   * ```typescript
   * // Clean shutdown
   * process.on('SIGINT', () => {
   *   streamingManager.disconnect();
   *   process.exit(0);
   * });
   *
   * // Or when component unmounts
   * useEffect(() => {
   *   return () => {
   *     streamingManager.disconnect();
   *   };
   * }, []);
   * ```
   */
  disconnect(): void {
    console.log('📡 Disconnecting streaming manager...');

    this.subscribedAddresses.clear();
    this._closeStreamingConnection();
    this.removeAllListeners();
    this.reconnectAttempts = 0;

    console.log('✅ Streaming manager disconnected');
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Validates an array of Hoosat addresses
   * @private
   */
  private _validateAddresses(addresses: string[]): void {
    if (!Array.isArray(addresses)) {
      throw new Error('Addresses must be an array');
    }

    if (addresses.length === 0) {
      throw new Error('Addresses array cannot be empty');
    }

    const invalidAddresses = addresses.filter(addr => !addr || typeof addr !== 'string' || !addr.startsWith('hoosat:'));

    if (invalidAddresses.length > 0) {
      throw new Error(
        `Invalid Hoosat addresses detected: ${invalidAddresses.slice(0, 3).join(', ')}` + (invalidAddresses.length > 3 ? '...' : '')
      );
    }
  }

  /**
   * Creates a new streaming connection to the Hoosat node
   * @private
   */
  private async _createStreamingConnection(): Promise<void> {
    if (this.subscribedAddresses.size === 0) {
      throw new Error('Cannot create streaming connection: No addresses subscribed');
    }

    console.log('📡 Creating streaming connection...');

    try {
      this.streamingCall = this.client.MessageStream();

      this._setupStreamingEventHandlers();

      // Send initial subscription message
      const subscribeMessage = {
        [RequestType.NotifyUtxosChangedRequest]: {
          addresses: Array.from(this.subscribedAddresses),
        },
      };

      this.streamingCall.write(subscribeMessage);

      console.log(`✅ Subscribed to UTXO changes for ${this.subscribedAddresses.size} addresses`);
    } catch (error) {
      console.error('❌ Failed to create streaming connection:', error);
      throw error;
    }
  }

  /**
   * Sets up event handlers for the streaming connection
   * @private
   */
  private _setupStreamingEventHandlers(): void {
    this.streamingCall.on('data', (response: any) => {
      this._handleStreamingMessage(response);
    });

    this.streamingCall.on('error', (error: any) => {
      console.error('❌ Streaming error:', error);
      this.emit(STREAMING_EVENTS.ERROR, error);
      this._handleStreamingError();
    });

    this.streamingCall.on('end', () => {
      console.log('🔚 Streaming connection ended');
      this.emit(STREAMING_EVENTS.STREAM_ENDED);
      this._handleStreamingError();
    });

    this.streamingCall.on('close', () => {
      console.log('🔒 Streaming connection closed');
      this.emit(STREAMING_EVENTS.STREAM_CLOSED);
    });
  }

  /**
   * Updates the subscription for an existing connection
   * @private
   */
  private async _updateSubscription(): Promise<void> {
    if (!this.streamingCall || this.streamingCall.destroyed) {
      throw new Error('Cannot update subscription: No active connection');
    }

    const subscribeMessage = {
      [RequestType.NotifyUtxosChangedRequest]: {
        addresses: Array.from(this.subscribedAddresses),
      },
    };

    this.streamingCall.write(subscribeMessage);
    console.log(`📡 Updated subscription for ${this.subscribedAddresses.size} addresses`);
  }

  /**
   * Handles incoming streaming messages and emits appropriate events
   * @private
   */
  private _handleStreamingMessage(response: any): void {
    if (response.utxosChangedNotification) {
      const notification = response.utxosChangedNotification;

      const changes: UtxoChanges = {
        added: notification.added || [],
        removed: notification.removed || [],
      };

      // Group changes by address and emit individual events
      const changesByAddress = this._groupUtxoChangesByAddress(changes);

      Object.entries(changesByAddress).forEach(([address, addressChanges]) => {
        this.emit(STREAMING_EVENTS.UTXO_CHANGED, {
          address,
          changes: addressChanges,
        } as UtxoChange);
      });

      // Emit general event with all changes
      this.emit(STREAMING_EVENTS.UTXOS_CHANGED, changes);

      // Log activity for debugging
      const totalChanges = changes.added.length + changes.removed.length;
      if (totalChanges > 0) {
        console.log(`📊 UTXO changes: +${changes.added.length} -${changes.removed.length}`);
      }
    }
  }

  /**
   * Groups UTXO changes by address for easier processing
   * @private
   */
  private _groupUtxoChangesByAddress(changes: UtxoChanges): { [address: string]: UtxoChanges } {
    const grouped: { [address: string]: UtxoChanges } = {};

    // Process added UTXOs
    changes.added.forEach((utxo: any) => {
      const address = utxo.address;
      if (!grouped[address]) {
        grouped[address] = { added: [], removed: [] };
      }
      grouped[address].added.push(this._mapUtxoEntry(utxo));
    });

    // Process removed UTXOs
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
   * Maps raw UTXO data to standardized UtxoEntry format
   * @private
   */
  private _mapUtxoEntry(utxo: any): UtxoEntry {
    return {
      outpoint: utxo.outpoint || {},
      amount: utxo.utxoEntry?.amount || '0',
      scriptPublicKey: utxo.utxoEntry?.scriptPublicKey,
      blockDaaScore: utxo.utxoEntry?.blockDaaScore,
      isCoinbase: utxo.utxoEntry?.isCoinbase || false,
    };
  }

  /**
   * Handles streaming connection errors with automatic reconnection
   * @private
   */
  private _handleStreamingError(): void {
    // Don't reconnect if no addresses are subscribed
    if (this.subscribedAddresses.size === 0) {
      console.log('📡 No addresses subscribed, skipping reconnection');
      return;
    }

    // Check if we've reached max reconnection attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`❌ Max reconnection attempts (${this.maxReconnectAttempts}) reached`);
      this.emit(STREAMING_EVENTS.MAX_RECONNECT_ATTEMPTS_REACHED);
      return;
    }

    this.reconnectAttempts++;

    // Calculate delay with exponential backoff
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    const maxDelay = 30000; // Cap at 30 seconds
    const actualDelay = Math.min(delay, maxDelay);

    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) ` + `in ${actualDelay}ms...`);

    setTimeout(async () => {
      try {
        await this._createStreamingConnection();
        console.log('✅ Streaming reconnected successfully');
        this.emit(STREAMING_EVENTS.RECONNECTED);
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this._handleStreamingError(); // Recursively try again
      }
    }, actualDelay);
  }

  /**
   * Closes the streaming connection and cleans up resources
   * @private
   */
  private _closeStreamingConnection(): void {
    if (this.streamingCall) {
      try {
        this.streamingCall.end();
      } catch (error) {
        console.error('Error closing streaming connection:', error);
      } finally {
        this.streamingCall = null;
      }
    }
  }
}
