import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';
import { NodeConfig } from '@client/client.types';

const GRPC_CONFIG = {
  MAX_MESSAGE_SIZE: 1024 * 1024 * 1024, // 1GB
} as const;

/**
 * Health status information for a Hoosat node
 *
 * @property isHealthy - Overall health status (meets all requirements)
 * @property isSynced - Whether the node is fully synchronized with the network
 * @property isUtxoIndexed - Whether the node has UTXO index enabled (--utxoindex flag)
 * @property lastCheck - Timestamp of the last health check (milliseconds)
 * @property consecutiveFailures - Number of consecutive failed health checks
 */
export interface NodeHealth {
  isHealthy: boolean;
  isSynced: boolean;
  isUtxoIndexed: boolean;
  lastCheck: number;
  consecutiveFailures: number;
}

/**
 * Complete status information for a Hoosat node
 *
 * Includes configuration, gRPC client, and health status.
 * Returned by `HoosatClient.getNodesStatus()` in multi-node mode.
 *
 * @property config - Node configuration (host, port, name, etc.)
 * @property client - gRPC client instance for this node
 * @property health - Current health status of the node
 */
export interface NodeStatus {
  config: NodeConfig;
  client: any;
  health: NodeHealth;
}

/**
 * NodeManager handles multiple Hoosat nodes with automatic failover
 *
 * Features:
 * - Automatic failover when primary node fails
 * - Health checking with sync and UTXO index validation
 * - Round-robin fallback through all nodes
 * - Request retry with automatic node switching
 */
export class NodeManager {
  private nodes: NodeStatus[] = [];
  private currentNodeIndex: number = 0;
  private healthCheckInterval?: NodeJS.Timeout;
  private readonly requireUtxoIndex: boolean;
  private readonly requireSynced: boolean;
  private readonly healthCheckIntervalMs: number;
  private readonly debug: boolean;

  constructor(
    nodeConfigs: NodeConfig[],
    options: {
      requireUtxoIndex?: boolean;
      requireSynced?: boolean;
      healthCheckInterval?: number;
      debug?: boolean;
    } = {}
  ) {
    this.requireUtxoIndex = options.requireUtxoIndex ?? true;
    this.requireSynced = options.requireSynced ?? true;
    this.healthCheckIntervalMs = options.healthCheckInterval ?? 30000;
    this.debug = options.debug ?? false;

    // Sort nodes: primary first, then others
    const sortedConfigs = [...nodeConfigs].sort((a, b) => {
      if (a.primary && !b.primary) return -1;
      if (!a.primary && b.primary) return 1;
      return 0;
    });

    // Initialize nodes
    for (const config of sortedConfigs) {
      try {
        const client = this.createGrpcClient(config);
        this.nodes.push({
          config,
          client,
          health: {
            isHealthy: false,
            isSynced: false,
            isUtxoIndexed: false,
            lastCheck: 0,
            consecutiveFailures: 0,
          },
        });

        this.log(`Initialized node: ${config.name || `${config.host}:${config.port}`}`);
      } catch (error) {
        this.log(`Failed to initialize node ${config.host}:${config.port}: ${error}`, 'error');
      }
    }

    if (this.nodes.length === 0) {
      throw new Error('No nodes could be initialized');
    }

    // Start health checking
    this.startHealthChecking();
  }

  /**
   * Creates a gRPC client for a node
   */
  private createGrpcClient(config: NodeConfig): any {
    const PROTO_PATH = join(__dirname, '..', 'protos', 'messages.proto');

    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
      includeDirs: [join(__dirname, '..', 'protos')],
    });

    const protoDescriptor = grpc.loadPackageDefinition(packageDefinition) as any;

    return new protoDescriptor.protowire.RPC(
      `${config.host}:${config.port}`,
      grpc.credentials.createInsecure(),
      {
        'grpc.max_receive_message_length': GRPC_CONFIG.MAX_MESSAGE_SIZE,
        'grpc.max_send_message_length': GRPC_CONFIG.MAX_MESSAGE_SIZE,
      }
    );
  }

  /**
   * Gets the current active node client
   */
  getCurrentClient(): any {
    return this.nodes[this.currentNodeIndex].client;
  }

  /**
   * Gets the current active node configuration
   */
  getCurrentNode(): NodeConfig {
    return this.nodes[this.currentNodeIndex].config;
  }

  /**
   * Gets all nodes status
   */
  getNodesStatus(): Array<{ config: NodeConfig; health: NodeHealth }> {
    return this.nodes.map((node) => ({
      config: node.config,
      health: { ...node.health },
    }));
  }

  /**
   * Switches to the next healthy node
   */
  async switchToNextNode(): Promise<boolean> {
    const startIndex = this.currentNodeIndex;
    let attempts = 0;

    while (attempts < this.nodes.length) {
      this.currentNodeIndex = (this.currentNodeIndex + 1) % this.nodes.length;
      attempts++;

      const node = this.nodes[this.currentNodeIndex];
      const nodeName = node.config.name || `${node.config.host}:${node.config.port}`;

      this.log(`Attempting to switch to node: ${nodeName}`);

      // Check node health before switching
      const isHealthy = await this.checkNodeHealth(this.currentNodeIndex);

      if (isHealthy) {
        this.log(`Successfully switched to node: ${nodeName}`);
        return true;
      }

      this.log(`Node ${nodeName} is not healthy, trying next...`, 'warn');
    }

    // If we've tried all nodes and none are healthy, return to original
    this.currentNodeIndex = startIndex;
    this.log('All nodes are unhealthy, staying on current node', 'error');
    return false;
  }

  /**
   * Checks health of a specific node
   */
  private async checkNodeHealth(nodeIndex: number): Promise<boolean> {
    const node = this.nodes[nodeIndex];
    const nodeName = node.config.name || `${node.config.host}:${node.config.port}`;

    try {
      // Make a health check request
      const result = await this.makeRequest(node.client, 'getInfoRequest', {});

      if (!result || !result.getInfoResponse) {
        throw new Error('Invalid response from node');
      }

      const info = result.getInfoResponse;
      const isSynced = info.isSynced === true;
      const isUtxoIndexed = info.isUtxoIndexed === true;

      // Update health status
      node.health.isSynced = isSynced;
      node.health.isUtxoIndexed = isUtxoIndexed;
      node.health.lastCheck = Date.now();
      node.health.consecutiveFailures = 0;

      // Check if node meets requirements
      const meetsRequirements =
        (!this.requireSynced || isSynced) && (!this.requireUtxoIndex || isUtxoIndexed);

      node.health.isHealthy = meetsRequirements;

      if (!meetsRequirements) {
        const reasons = [];
        if (this.requireSynced && !isSynced) reasons.push('not synced');
        if (this.requireUtxoIndex && !isUtxoIndexed) reasons.push('no UTXO index');
        this.log(`Node ${nodeName} doesn't meet requirements: ${reasons.join(', ')}`, 'warn');
      } else {
        this.log(`Node ${nodeName} is healthy`);
      }

      return meetsRequirements;
    } catch (error) {
      node.health.isHealthy = false;
      node.health.consecutiveFailures++;
      node.health.lastCheck = Date.now();

      this.log(`Health check failed for node ${nodeName}: ${error}`, 'error');
      return false;
    }
  }

  /**
   * Makes a request to a node
   */
  private makeRequest(client: any, command: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Health check timeout'));
      }, 5000);

      try {
        const call = client.MessageStream();
        let responseReceived = false;

        call.on('data', (response: any) => {
          if (!responseReceived) {
            responseReceived = true;
            clearTimeout(timeout);
            call.end();
            resolve(response);
          }
        });

        call.on('error', (error: any) => {
          clearTimeout(timeout);
          reject(error);
        });

        call.on('end', () => {
          clearTimeout(timeout);
          if (!responseReceived) {
            reject(new Error('Stream ended without response'));
          }
        });

        const message: any = {};
        message[command] = params;
        call.write(message);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Starts periodic health checking
   */
  private startHealthChecking(): void {
    // Do initial health check
    this.checkAllNodesHealth();

    // Setup periodic health checking
    this.healthCheckInterval = setInterval(() => {
      this.checkAllNodesHealth();
    }, this.healthCheckIntervalMs);
  }

  /**
   * Checks health of all nodes
   */
  private async checkAllNodesHealth(): Promise<void> {
    const checks = this.nodes.map((_, index) => this.checkNodeHealth(index));
    await Promise.allSettled(checks);

    // Log health summary
    const healthyCount = this.nodes.filter((n) => n.health.isHealthy).length;
    this.log(`Health check complete: ${healthyCount}/${this.nodes.length} nodes healthy`);
  }

  /**
   * Stops health checking and closes connections
   */
  disconnect(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }

    for (const node of this.nodes) {
      try {
        node.client.close();
      } catch (error) {
        this.log(`Error closing node connection: ${error}`, 'error');
      }
    }

    this.log('NodeManager disconnected');
  }

  /**
   * Logs message if debug is enabled
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.debug) return;

    const timestamp = new Date().toISOString();
    const prefix = `[NodeManager ${timestamp}]`;

    switch (level) {
      case 'error':
        console.error(`${prefix} ERROR:`, message);
        break;
      case 'warn':
        console.warn(`${prefix} WARN:`, message);
        break;
      default:
        console.log(`${prefix} INFO:`, message);
    }
  }
}
