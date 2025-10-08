import { EventManagerConfig } from '@events/event-manager.types';

/**
 * Configuration options for HoosatClient
 *
 * @example
 * ```typescript
 * const config: NodeConfig = {
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
 */
export interface HoosatClientConfig {
  host?: string;
  port?: number;
  timeout?: number;
  events?: EventManagerConfig;
}
