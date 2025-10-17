import { EventManagerConfig } from '@events/event-manager.types';

/**
 * Configuration for a single Hoosat node
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
