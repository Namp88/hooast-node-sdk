/**
 * Event names for UtxoStreamManager
 * Use these constants to listen to events in a type-safe way
 */
export const UTXO_STREAM_EVENTS = {
  /** Emitted when UTXOs change for a specific address */
  UTXO_CHANGED: 'utxoChanged',

  /** Emitted when any UTXOs change in the subscription */
  UTXOS_CHANGED: 'utxosChanged',

  /** Emitted when a streaming error occurs */
  ERROR: 'error',

  /** Emitted when the stream ends unexpectedly */
  STREAM_ENDED: 'streamEnded',

  /** Emitted when the stream is closed */
  STREAM_CLOSED: 'streamClosed',

  /** Emitted when reconnection succeeds */
  RECONNECTED: 'reconnected',

  /** Emitted when max reconnect attempts are reached */
  MAX_RECONNECT_ATTEMPTS_REACHED: 'maxReconnectAttemptsReached',
} as const;

/**
 * Type for UTXO stream event names
 * @example
 * ```typescript
 * const eventName: UtxoStreamEventName = 'utxoChanged';
 * ```
 */
export type UtxoStreamEventName = (typeof UTXO_STREAM_EVENTS)[keyof typeof UTXO_STREAM_EVENTS];

/**
 * Configuration options for UtxoStreamManager
 * @example
 * ```typescript
 * const config: UtxoStreamConfig = {
 *   maxReconnectAttempts: 10,
 *   reconnectDelay: 3000,
 *   maxSubscribedAddresses: 500,
 *   debug: true
 * };
 * ```
 */
export interface UtxoStreamConfig {
  /** Maximum number of reconnection attempts (default: 5) */
  maxReconnectAttempts?: number;

  /** Base delay between reconnection attempts in ms (default: 2000) */
  reconnectDelay?: number;

  /** Maximum number of addresses that can be subscribed (default: 1000) */
  maxSubscribedAddresses?: number;

  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Statistics about the UTXO streaming connection
 * @example
 * ```typescript
 * const stats = manager.getStreamStats();
 * console.log('Connected:', stats.isConnected);
 * console.log('Addresses:', stats.subscribedAddressCount);
 * ```
 */
export interface UtxoStreamStats {
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

/**
 * UTXO entry from streaming notification
 * @example
 * ```typescript
 * const utxo: UtxoEntry = {
 *   outpoint: {
 *     transactionId: 'abc123...',
 *     index: 0
 *   },
 *   amount: '100000000',
 *   isCoinbase: false
 * };
 * ```
 */
export interface UtxoChangeEntry {
  /** UTXO outpoint (transaction ID and output index) */
  outpoint: {
    transactionId: string;
    index: number;
  };

  /** Amount in sompi (smallest unit) */
  amount: string;

  /** Script public key (optional) */
  scriptPublicKey?: any;

  /** Block DAA score (optional) */
  blockDaaScore?: string;

  /** Whether this UTXO is from a coinbase transaction */
  isCoinbase: boolean;
}

/**
 * UTXO changes (added and removed)
 * @example
 * ```typescript
 * manager.on(UTXO_STREAM_EVENTS.UTXOS_CHANGED, (changes: UtxoChanges) => {
 *   console.log('Added:', changes.added.length);
 *   console.log('Removed:', changes.removed.length);
 * });
 * ```
 */
export interface UtxoChanges {
  /** UTXOs that were added */
  added: UtxoChangeEntry[];

  /** UTXOs that were removed */
  removed: UtxoChangeEntry[];
}

/**
 * UTXO change notification for a specific address
 * @example
 * ```typescript
 * manager.on(UTXO_STREAM_EVENTS.UTXO_CHANGED, (notification: UtxoChangeNotification) => {
 *   console.log(`Changes for ${notification.address}`);
 *   notification.changes.added.forEach(utxo => {
 *     console.log('New UTXO:', utxo.amount);
 *   });
 * });
 * ```
 */
export interface UtxoChangeNotification {
  /** Address that had UTXO changes */
  address: string;

  /** UTXO changes for this address */
  changes: UtxoChanges;
}
