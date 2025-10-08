import { EventEmitter } from 'events';
import { RequestType } from '@enums/request-type.enum';
import { HoosatUtils } from '@utils/utils';
import {
  UTXO_CHANGE_STREAM_EVENTS,
  UtxoChangeNotification,
  UtxoChanges,
  UtxoChangeEntry,
  UtxoChangeStreamConfig,
  UtxoChangeStreamStats,
} from '@events/streams/utxo-change/utxo-change-stream.types';

/** Default configuration values */
const DEFAULT_CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 5,
  BASE_RECONNECT_DELAY: 2000,
  MAX_SUBSCRIBED_ADDRESSES: 1000,
} as const;

/** Minimal gRPC client interface */
interface GrpcClient {
  MessageStream(): any;
}

/**
 * UtxoChangeStream handles real-time UTXO change notifications from Hoosat nodes
 *
 * This class manages gRPC streaming connections to receive live updates when UTXOs
 * are added or removed for subscribed addresses. Features include automatic reconnection
 * with exponential backoff, subscription management, and comprehensive error handling.
 *
 * @example
 * ```typescript
 * const manager = new UtxoChangeStream(grpcClient, {
 *   maxReconnectAttempts: 10,
 *   debug: true
 * });
 *
 * // Subscribe to UTXO changes
 * await manager.subscribeToUtxoChanges(['hoosat:qz7ulu...']);
 *
 * // Listen for events
 * manager.on(UTXO_STREAM_EVENTS.UTXO_CHANGED, (notification) => {
 *   console.log(`UTXO changed for ${notification.address}`);
 *   console.log('Added:', notification.changes.added.length);
 *   console.log('Removed:', notification.changes.removed.length);
 * });
 *
 * manager.on(UTXO_STREAM_EVENTS.RECONNECTED, () => {
 *   console.log('Stream reconnected');
 * });
 * ```
 *
 * @fires utxoChanged - When UTXOs change for a specific address
 * @fires utxosChanged - When any UTXOs change in the subscription
 * @fires error - When a streaming error occurs
 * @fires streamEnded - When the stream ends unexpectedly
 * @fires streamClosed - When the stream is closed
 * @fires reconnected - When reconnection succeeds
 * @fires maxReconnectAttemptsReached - When max reconnect attempts reached
 */
export class UtxoChangeStream extends EventEmitter {
  private readonly _maxReconnectAttempts: number;
  private readonly _reconnectDelay: number;
  private readonly _maxSubscribedAddresses: number;
  private readonly _debug: boolean;

  private _utxoStream: any = null;
  private _subscribedAddresses: Set<string> = new Set();
  private _client: GrpcClient;
  private _reconnectAttempts = 0;

  /**
   * Creates a new UtxoChangeStream instance
   *
   * @param client - The gRPC client instance for communication
   * @param config - Optional configuration for streaming behavior
   * @throws Error if client is not provided
   *
   * @example
   * ```typescript
   * const manager = new UtxoChangeStream(grpcClient, {
   *   maxReconnectAttempts: 10,
   *   reconnectDelay: 3000,
   *   maxSubscribedAddresses: 500,
   *   debug: true
   * });
   * ```
   */
  constructor(client: GrpcClient, config: UtxoChangeStreamConfig = {}) {
    super();

    if (!client) {
      throw new Error('gRPC client is required for UtxoChangeStream');
    }

    this._client = client;
    this._maxReconnectAttempts = config.maxReconnectAttempts ?? DEFAULT_CONFIG.MAX_RECONNECT_ATTEMPTS;
    this._reconnectDelay = config.reconnectDelay ?? DEFAULT_CONFIG.BASE_RECONNECT_DELAY;
    this._maxSubscribedAddresses = config.maxSubscribedAddresses ?? DEFAULT_CONFIG.MAX_SUBSCRIBED_ADDRESSES;
    this._debug = config.debug ?? false;
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Subscribes to UTXO changes for the specified addresses
   *
   * This method adds the provided addresses to the subscription list and establishes
   * a streaming connection if one doesn't exist. Already subscribed addresses are skipped.
   *
   * @param addresses - Array of Hoosat addresses to monitor for UTXO changes
   * @throws Error if addresses array is invalid or streaming connection fails
   *
   * @example
   * ```typescript
   * // Subscribe to multiple addresses
   * await manager.subscribeToUtxoChanges([
   *   'hoosat:qz7ulu...',
   *   'hoosat:qq8xdv...'
   * ]);
   *
   * // Add more addresses to existing subscription
   * await manager.subscribeToUtxoChanges(['hoosat:qr9xyz...']);
   * ```
   */
  async subscribeToUtxoChanges(addresses: string[]): Promise<void> {
    this._validateAddresses(addresses);

    // Check subscription limits
    const newAddresses = addresses.filter(addr => !this._subscribedAddresses.has(addr));
    const newSubscriptionCount = this._subscribedAddresses.size + newAddresses.length;

    if (newSubscriptionCount > this._maxSubscribedAddresses) {
      throw new Error(`Cannot subscribe to ${newSubscriptionCount} addresses. ` + `Maximum allowed: ${this._maxSubscribedAddresses}`);
    }

    // Add new addresses to subscription list
    addresses.forEach(addr => this._subscribedAddresses.add(addr));

    this._log(`Adding ${newAddresses.length} new addresses to subscription`);

    // Create streaming connection if it doesn't exist
    if (!this._utxoStream || this._utxoStream.destroyed) {
      try {
        await this._createUtxoStream();
        this._reconnectAttempts = 0;
      } catch (error) {
        // Remove the addresses we just added since connection failed
        newAddresses.forEach(addr => this._subscribedAddresses.delete(addr));
        throw new Error(`Failed to subscribe to UTXO changes: ${error}`);
      }
    } else if (newAddresses.length > 0) {
      // If connection exists and we have new addresses, send update
      try {
        await this._updateSubscription();
      } catch (error) {
        this._log(`Failed to update subscription: ${error}`);
      }
    }
  }

  /**
   * Unsubscribes from UTXO changes for specific addresses or all addresses
   *
   * @param addresses - Optional array of addresses to unsubscribe from.
   *                   If not provided, unsubscribes from all addresses and closes connection.
   *
   * @example
   * ```typescript
   * // Unsubscribe from specific addresses
   * await manager.unsubscribeFromUtxoChanges(['hoosat:qz7ulu...']);
   *
   * // Unsubscribe from all addresses and close connection
   * await manager.unsubscribeFromUtxoChanges();
   * ```
   */
  async unsubscribeFromUtxoChanges(addresses?: string[]): Promise<void> {
    if (addresses) {
      this._validateAddresses(addresses);

      // Remove specific addresses
      const removedAddresses = addresses.filter(addr => this._subscribedAddresses.has(addr));
      addresses.forEach(addr => this._subscribedAddresses.delete(addr));

      this._log(`Removed ${removedAddresses.length} addresses from subscription`);

      // Send unsubscribe message if connection is active
      if (this._utxoStream && !this._utxoStream.destroyed && removedAddresses.length > 0) {
        try {
          const unsubscribeMessage = {
            [RequestType.StopNotifyingUtxosChangedRequest]: {
              addresses: removedAddresses,
            },
          };
          this._utxoStream.write(unsubscribeMessage);
        } catch (error) {
          this._log(`Failed to send unsubscribe message: ${error}`);
        }
      }

      // Close connection if no more addresses
      if (this._subscribedAddresses.size === 0) {
        this._closeUtxoStream();
      }
    } else {
      // Unsubscribe from all addresses
      this._log('Unsubscribing from all addresses');
      this._subscribedAddresses.clear();
      this._closeUtxoStream();
    }
  }

  /**
   * Checks if the streaming connection is currently active
   *
   * @returns True if streaming connection is active, false otherwise
   *
   * @example
   * ```typescript
   * if (manager.isConnected()) {
   *   console.log('Streaming is active');
   * }
   * ```
   */
  isConnected(): boolean {
    return this._utxoStream && !this._utxoStream.destroyed;
  }

  /**
   * Gets the list of addresses currently subscribed for UTXO change notifications
   *
   * @returns Array of Hoosat addresses currently being monitored
   *
   * @example
   * ```typescript
   * const subscribed = manager.getSubscribedAddresses();
   * console.log(`Monitoring ${subscribed.length} addresses`);
   * ```
   */
  getSubscribedAddresses(): string[] {
    return Array.from(this._subscribedAddresses);
  }

  /**
   * Gets comprehensive statistics about the streaming connection
   *
   * @returns Object containing connection status, subscription info, and reconnection data
   *
   * @example
   * ```typescript
   * const stats = manager.getStreamStats();
   * console.log('Connected:', stats.isConnected);
   * console.log('Subscribed addresses:', stats.subscribedAddressCount);
   * console.log('Reconnect attempts:', stats.reconnectAttempts);
   * ```
   */
  getStreamStats(): UtxoChangeStreamStats {
    return {
      isConnected: this.isConnected(),
      subscribedAddressCount: this._subscribedAddresses.size,
      reconnectAttempts: this._reconnectAttempts,
      maxReconnectAttempts: this._maxReconnectAttempts,
      subscribedAddresses: this.getSubscribedAddresses(),
    };
  }

  /**
   * Manually triggers a reconnection attempt
   *
   * This method forces a reconnection even if automatic reconnection has failed
   * or if you want to refresh the connection manually.
   *
   * @throws Error if no addresses are subscribed or reconnection fails
   *
   * @example
   * ```typescript
   * try {
   *   await manager.forceReconnect();
   *   console.log('Reconnection successful');
   * } catch (error) {
   *   console.error('Reconnection failed:', error);
   * }
   * ```
   */
  async forceReconnect(): Promise<void> {
    if (this._subscribedAddresses.size === 0) {
      throw new Error('Cannot reconnect: No addresses are subscribed');
    }

    this._log('Forcing reconnection...');

    // Close existing connection
    this._closeUtxoStream();

    // Reset reconnection counter for manual reconnect
    this._reconnectAttempts = 0;

    try {
      await this._createUtxoStream();
      this._log('Manual reconnection successful');
      this.emit(UTXO_CHANGE_STREAM_EVENTS.RECONNECTED);
    } catch (error) {
      this._log(`Manual reconnection failed: ${error}`);
      throw new Error(`Manual reconnection failed: ${error}`);
    }
  }

  /**
   * Cleanly disconnects from streaming and removes all subscriptions
   *
   * This method should be called when the UtxoChangeStream is no longer needed
   * to ensure proper cleanup of resources and event listeners.
   *
   * @example
   * ```typescript
   * // Clean shutdown
   * process.on('SIGINT', () => {
   *   manager.disconnect();
   *   process.exit(0);
   * });
   *
   * // Or in React/Vue component cleanup
   * onUnmount(() => {
   *   manager.disconnect();
   * });
   * ```
   */
  disconnect(): void {
    this._log('Disconnecting stream manager');

    this._subscribedAddresses.clear();
    this._closeUtxoStream();
    this.removeAllListeners();
    this._reconnectAttempts = 0;

    this._log('Stream manager disconnected');
  }

  // ==================== PRIVATE METHODS ====================

  /** Validates addresses array */
  private _validateAddresses(addresses: string[]): void {
    if (!Array.isArray(addresses)) {
      throw new Error('Addresses must be an array');
    }

    if (addresses.length === 0) {
      throw new Error('Addresses array cannot be empty');
    }

    const invalidAddresses = addresses.filter(addr => !HoosatUtils.isValidAddress(addr));

    if (invalidAddresses.length > 0) {
      throw new Error(`Invalid Hoosat addresses: ${invalidAddresses.slice(0, 3).join(', ')}` + (invalidAddresses.length > 3 ? '...' : ''));
    }
  }

  /** Creates new UTXO streaming connection */
  private async _createUtxoStream(): Promise<void> {
    if (this._subscribedAddresses.size === 0) {
      throw new Error('Cannot create streaming connection: No addresses subscribed');
    }

    this._log('Creating UTXO stream connection');

    try {
      this._utxoStream = this._client.MessageStream();

      this._setupUtxoStreamHandlers();

      // Send initial subscription message
      const subscribeMessage = {
        [RequestType.NotifyUtxosChangedRequest]: {
          addresses: Array.from(this._subscribedAddresses),
        },
      };

      this._utxoStream.write(subscribeMessage);

      this._log(`Subscribed to UTXO changes for ${this._subscribedAddresses.size} addresses`);
    } catch (error) {
      this._log(`Failed to create UTXO stream: ${error}`);
      throw error;
    }
  }

  /** Sets up event handlers for UTXO stream */
  private _setupUtxoStreamHandlers(): void {
    this._utxoStream.on('data', (response: any) => {
      this._handleUtxoNotification(response);
    });

    this._utxoStream.on('error', (error: any) => {
      this._log(`Stream error: ${error}`);
      this.emit(UTXO_CHANGE_STREAM_EVENTS.ERROR, error);
      this._handleStreamingError();
    });

    this._utxoStream.on('end', () => {
      this._log('Stream connection ended');
      this.emit(UTXO_CHANGE_STREAM_EVENTS.STREAM_ENDED);
      this._handleStreamingError();
    });

    this._utxoStream.on('close', () => {
      this._log('Stream connection closed');
      this.emit(UTXO_CHANGE_STREAM_EVENTS.STREAM_CLOSED);
    });
  }

  /** Updates subscription for existing connection */
  private async _updateSubscription(): Promise<void> {
    if (!this._utxoStream || this._utxoStream.destroyed) {
      throw new Error('Cannot update subscription: No active connection');
    }

    const subscribeMessage = {
      [RequestType.NotifyUtxosChangedRequest]: {
        addresses: Array.from(this._subscribedAddresses),
      },
    };

    this._utxoStream.write(subscribeMessage);
    this._log(`Updated subscription for ${this._subscribedAddresses.size} addresses`);
  }

  /** Handles incoming UTXO notifications */
  private _handleUtxoNotification(response: any): void {
    if (response.utxosChangedNotification) {
      const notification = response.utxosChangedNotification;

      // Parse internal format
      const internalChanges: StreamingUtxoChanges = {
        added: notification.added || [],
        removed: notification.removed || [],
      };

      // Convert to public format
      const publicChanges: UtxoChanges = this._toPublicUtxoChanges(internalChanges);

      // Group by address
      const changesByAddress = this._groupUtxoChangesByAddress(internalChanges);

      // Emit address-specific events
      Object.entries(changesByAddress).forEach(([address, addressChanges]) => {
        this.emit(UTXO_CHANGE_STREAM_EVENTS.UTXO_CHANGED, {
          address,
          changes: this._toPublicUtxoChanges(addressChanges),
        } as UtxoChangeNotification);
      });

      // Emit general event
      this.emit(UTXO_CHANGE_STREAM_EVENTS.UTXOS_CHANGED, publicChanges);

      // Log activity
      const totalChanges = publicChanges.added.length + publicChanges.removed.length;
      if (totalChanges > 0) {
        this._log(`UTXO changes: +${publicChanges.added.length} -${publicChanges.removed.length}`);
      }
    }
  }

  /** Groups UTXO changes by address */
  private _groupUtxoChangesByAddress(changes: StreamingUtxoChanges): Record<string, StreamingUtxoChanges> {
    const grouped: Record<string, StreamingUtxoChanges> = {};

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

  /** Maps raw gRPC UTXO to internal format */
  private _mapUtxoEntry(utxo: any): StreamingUtxoEntry {
    return {
      outpoint: utxo.outpoint || {},
      amount: utxo.utxoEntry?.amount || '0',
      scriptPublicKey: utxo.utxoEntry?.scriptPublicKey,
      blockDaaScore: utxo.utxoEntry?.blockDaaScore,
      isCoinbase: utxo.utxoEntry?.isCoinbase || false,
    };
  }

  /** Converts internal UTXO entry to public format */
  private _toPublicUtxoEntry(entry: StreamingUtxoEntry): UtxoChangeEntry {
    return {
      outpoint: entry.outpoint,
      amount: entry.amount,
      scriptPublicKey: entry.scriptPublicKey,
      blockDaaScore: entry.blockDaaScore,
      isCoinbase: entry.isCoinbase ?? false,
    };
  }

  /** Converts internal UTXO changes to public format */
  private _toPublicUtxoChanges(changes: StreamingUtxoChanges): UtxoChanges {
    return {
      added: changes.added.map(e => this._toPublicUtxoEntry(e)),
      removed: changes.removed.map(e => this._toPublicUtxoEntry(e)),
    };
  }

  /** Handles stream errors with automatic reconnection */
  private _handleStreamingError(): void {
    // Don't reconnect if no addresses are subscribed
    if (this._subscribedAddresses.size === 0) {
      this._log('No addresses subscribed, skipping reconnection');
      return;
    }

    // Check if we've reached max reconnection attempts
    if (this._reconnectAttempts >= this._maxReconnectAttempts) {
      this._log(`Max reconnection attempts (${this._maxReconnectAttempts}) reached`);
      this.emit(UTXO_CHANGE_STREAM_EVENTS.MAX_RECONNECT_ATTEMPTS_REACHED);
      return;
    }

    this._reconnectAttempts++;

    // Calculate delay with exponential backoff
    const delay = this._reconnectDelay * Math.pow(2, this._reconnectAttempts - 1);
    const maxDelay = 30000; // Cap at 30 seconds
    const actualDelay = Math.min(delay, maxDelay);

    this._log(`Attempting to reconnect (${this._reconnectAttempts}/${this._maxReconnectAttempts}) ` + `in ${actualDelay}ms`);

    setTimeout(async () => {
      try {
        await this._createUtxoStream();
        this._log('Stream reconnected successfully');
        this.emit(UTXO_CHANGE_STREAM_EVENTS.RECONNECTED);
      } catch (error) {
        this._log(`Reconnection failed: ${error}`);
        this._handleStreamingError();
      }
    }, actualDelay);
  }

  /** Closes UTXO stream and cleans up resources */
  private _closeUtxoStream(): void {
    if (this._utxoStream) {
      try {
        this._utxoStream.end();
      } catch (error) {
        this._log(`Error closing stream: ${error}`);
      } finally {
        this._utxoStream = null;
      }
    }
  }

  /** Logs message if debug mode is enabled */
  private _log(message: string): void {
    if (this._debug) {
      console.log(`[UtxoStreamManager] ${message}`);
    }
  }
}

// Local types

/**
 * Internal gRPC UTXO notification types
 * These types represent the raw format from the Hoosat node
 * and are NOT exported to the public API
 */

/**
 * Internal gRPC UTXO changes format
 * Used for processing raw notifications from the node
 */
interface StreamingUtxoChanges {
  added: StreamingUtxoEntry[];
  removed: StreamingUtxoEntry[];
}

/**
 * Internal gRPC UTXO entry (raw from node)
 * This format is converted to public UtxoEntry before emitting events
 */
interface StreamingUtxoEntry {
  outpoint: {
    transactionId: string;
    index: number;
  };
  amount: string;
  scriptPublicKey?: any;
  blockDaaScore?: string;
  isCoinbase?: boolean; // Optional in gRPC response
}
