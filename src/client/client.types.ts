import { EventManagerConfig } from '@events/event-manager.types';

/**
 * Configuration for a single Hoosat node
 *
 * Used in multi-node setups to define individual node parameters.
 *
 * @property host - Node hostname or IP address
 * @property port - Node port number
 * @property timeout - Request timeout for this specific node (optional)
 * @property primary - Mark this node as primary (preferred node, optional)
 * @property name - Human-readable node name for logging (optional)
 *
 * @example
 * ```typescript
 * const nodeConfig: NodeConfig = {
 *   host: '54.38.176.95',
 *   port: 42420,
 *   primary: true,
 *   name: 'Primary Node (France)'
 * };
 * ```
 */
export interface NodeConfig {
  host: string;
  port: number;
  timeout?: number;
  primary?: boolean;
  name?: string;
}

/**
 * Configuration for multi-node setup with automatic failover
 *
 * Defines parameters for high-availability deployment with multiple Hoosat nodes.
 *
 * @property nodes - Array of node configurations
 * @property healthCheckInterval - Interval for health checks in ms (default: 30000)
 * @property retryAttempts - Number of retry attempts per request (default: 3)
 * @property retryDelay - Delay between retry attempts in ms (default: 1000)
 * @property requireUtxoIndex - Only use nodes with UTXO index enabled (default: true)
 * @property requireSynced - Only use fully synced nodes (default: true)
 * @property debug - Enable debug logging for node management (default: false)
 *
 * @example
 * ```typescript
 * const multiNodeConfig: MultiNodeConfig = {
 *   nodes: [
 *     { host: '54.38.176.95', port: 42420, primary: true, name: 'Primary' },
 *     { host: 'backup.example.com', port: 42420, name: 'Backup' }
 *   ],
 *   healthCheckInterval: 30000,
 *   retryAttempts: 3,
 *   retryDelay: 1000,
 *   requireUtxoIndex: true,
 *   requireSynced: true,
 *   debug: true
 * };
 * ```
 */
export interface MultiNodeConfig {
  nodes: NodeConfig[];
  healthCheckInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
  requireUtxoIndex?: boolean;
  requireSynced?: boolean;
  debug?: boolean;
}

/**
 * Configuration options for HoosatClient
 *
 * Single node configuration:
 * @example
 * ```typescript
 * const config: HoosatClientConfig = {
 *   host: '54.38.176.95',
 *   port: 42420,
 *   timeout: 15000,
 *   events: {
 *     maxReconnectAttempts: 10,
 *     reconnectDelay: 3000,
 *     debug: true
 *   }
 * };
 * ```
 *
 * Multi-node configuration with failover:
 * @example
 * ```typescript
 * const config: HoosatClientConfig = {
 *   nodes: [
 *     { host: '54.38.176.95', port: 42420, primary: true, name: 'Primary Node' },
 *     { host: '10.0.0.2', port: 42420, name: 'Backup Node 1' },
 *     { host: '10.0.0.3', port: 42420, name: 'Backup Node 2' }
 *   ],
 *   healthCheckInterval: 30000,
 *   retryAttempts: 3,
 *   requireUtxoIndex: true,
 *   requireSynced: true
 * };
 * ```
 */
export interface HoosatClientConfig {
  host?: string;
  port?: number;
  timeout?: number;
  nodes?: NodeConfig[];
  healthCheckInterval?: number;
  retryAttempts?: number;
  retryDelay?: number;
  requireUtxoIndex?: boolean;
  requireSynced?: boolean;
  events?: EventManagerConfig;
  debug?: boolean;
}
