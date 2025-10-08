/**
 * Event types emitted by HoosatEventManager
 */
export enum EventType {
  /** UTXO changes for subscribed addresses */
  UtxoChange = 'utxoChange',

  /** Streaming error occurred */
  Error = 'error',

  /** Disconnected from node */
  Disconnect = 'disconnect',

  /** Attempting to reconnect */
  Reconnecting = 'reconnecting',

  /** Successfully reconnected */
  Reconnected = 'reconnected',

  /** Max reconnection attempts reached */
  MaxReconnectAttemptsReached = 'maxReconnectAttemptsReached',
}

/**
 * Configuration for HoosatEventManager
 *
 * @example
 * ```typescript
 * const config: EventManagerConfig = {
 *   maxReconnectAttempts: 10,
 *   reconnectDelay: 3000,
 *   maxSubscribedAddresses: 500,
 *   debug: true
 * };
 * ```
 */
export interface EventManagerConfig {
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
 * Statistics about active event subscriptions
 *
 * @example
 * ```typescript
 * const stats = client.events.getStats();
 * console.log('Connected:', stats.isConnected);
 * console.log('UTXO subscriptions:', stats.utxoSubscriptions.length);
 * ```
 */
export interface EventManagerStats {
  /** Whether streaming connection is active */
  isConnected: boolean;

  /** Currently subscribed addresses for UTXO changes */
  utxoSubscriptions: string[];

  /** Current reconnection attempt count */
  reconnectAttempts: number;

  /** Maximum allowed reconnection attempts */
  maxReconnectAttempts: number;

  /** Last error message (if any) */
  lastError: string | null;
}

// Re-export UTXO types from streaming module for convenience
export type { UtxoChangeNotification, UtxoChanges, UtxoChangeEntry } from '@events/streams/utxo-change/utxo-change-stream.types';
