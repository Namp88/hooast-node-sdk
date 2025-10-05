import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';
import { EventEmitter } from 'events';
import { NodeConfig } from '@models/node-config.model';
import { BaseResult } from '@models/result/base.result';
import { GetSelectedTipHash } from '@models/result/get-selected-tip-hash.result';
import { GetMempoolEntry } from '@models/result/get-mempool-entry.result';
import { GetBlock } from '@models/result/get-block.result';
import { GetBlocks } from '@models/result/get-blocks.result';
import { GetBlockCount } from '@models/result/get-block-count.result';
import { GetBlockDagInfo } from '@models/result/get-block-dag-info.result';
import { GetMempoolEntries } from '@models/result/get-mempool-entries.result';
import { GetUtxosByAddresses } from '@models/result/get-utxos-by-addresses.result';
import { GetVirtualSelectedParentBlueScore } from '@models/result/get-virtual-selected-parent-blue-score.result';
import { GetInfo } from '@models/result/get-info.result';
import { EstimateNetworkHashesPerSecond } from '@models/result/estimate-network-hashes-per-second.result';
import { GetBalanceByAddress } from '@models/result/get-balance-by-address.result';
import { GetBalancesByAddresses } from '@models/result/get-balances-by-addresses.result';
import { GetMempoolEntriesByAddresses } from '@models/result/get-mempool-entries-by-addresses.result';
import { GetCoinSupply } from '@models/result/get-coin-supply.result';
import { SubmitTransaction } from '@models/result/submit-transaction.result';
import { Transaction } from '@models/transaction/transaction.types';
import { StreamingManager } from '@streaming/streaming-manager';
import { CLIENT_DEFAULT_CONFIG } from '@constants/client-default-config.const';
import { NetworkService } from '@services/network.service';
import { BlockchainService } from '@services/blockchain.service';
import { MempoolService } from '@services/mempool.service';
import { AddressService } from '@services/address.service';
import { NodeInfoService } from '@services/node-info.service';
import { TransactionService } from '@services/transaction.service';
import { GetClientInfo } from '@models/result/get-client-info.result';
import { validateAddresses } from '@utils/validation.utils';

const GRPC_CONFIG = {
  MAX_MESSAGE_SIZE: 1024 * 1024 * 1024, // 1GB
} as const;

class HoosatNode extends EventEmitter {
  private readonly _host: string;
  private readonly _port: number;
  private readonly _timeout: number;

  private _client: any;
  private _streamingManager: StreamingManager | null = null;

  private _networkService: NetworkService | null = null;
  private _blockchainService: BlockchainService | null = null;
  private _mempoolService: MempoolService | null = null;
  private _addressService: AddressService | null = null;
  private _nodeInfoService: NodeInfoService | null = null;
  private _transactionService: TransactionService | null = null;

  /**
   * Creates a new HoosatNode instance
   * @param config - Node configuration options
   * @param config.host - Hostname or IP address of the Hoosat node (default: '127.0.0.1')
   * @param config.port - Port number of the Hoosat node (default: 42420)
   * @param config.timeout - Request timeout in milliseconds (default: 10000)
   */
  constructor(config: NodeConfig = {}) {
    super();

    this._host = config.host || CLIENT_DEFAULT_CONFIG.HOST;
    this._port = config.port || CLIENT_DEFAULT_CONFIG.PORT;
    this._timeout = config.timeout || CLIENT_DEFAULT_CONFIG.TIMEOUT;

    this._initializeClient();
    this._initializeServices();
    this._initializeStreaming();
  }

  /**
   * Initializes the gRPC client connection
   * @private
   */
  private _initializeClient(): void {
    try {
      const PROTO_PATH = join(__dirname, 'protos', 'messages.proto');

      const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [join(__dirname, 'protos')],
      });

      const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
      const protowire = protoDescriptor.protowire as any;

      this._client = new protowire.RPC(`${this._host}:${this._port}`, grpc.credentials.createInsecure(), {
        'grpc.max_send_message_length': GRPC_CONFIG.MAX_MESSAGE_SIZE,
        'grpc.max_receive_message_length': GRPC_CONFIG.MAX_MESSAGE_SIZE,
      });
    } catch (error) {
      throw new Error(`Failed to initialize gRPC client: ${error}`);
    }
  }

  /**
   * Initializes all service instances
   * @private
   */
  private _initializeServices(): void {
    this._networkService = new NetworkService(this._client, this._timeout);
    this._blockchainService = new BlockchainService(this._client, this._timeout);
    this._mempoolService = new MempoolService(this._client, this._timeout);
    this._addressService = new AddressService(this._client, this._timeout);
    this._nodeInfoService = new NodeInfoService(this._client, this._timeout);
    this._transactionService = new TransactionService(this._client, this._timeout);
  }

  /**
   * Initializes the streaming manager for real-time updates
   * @private
   */
  private _initializeStreaming(): void {
    this._streamingManager = new StreamingManager(this._client);

    // Proxy events from StreamingManager
    this._streamingManager.on('utxoChanged', change => this.emit('utxoChanged', change));
    this._streamingManager.on('utxosChanged', changes => this.emit('utxosChanged', changes));
    this._streamingManager.on('error', error => this.emit('streamingError', error));
    this._streamingManager.on('streamEnded', () => this.emit('streamEnded'));
    this._streamingManager.on('streamClosed', () => this.emit('streamClosed'));
    this._streamingManager.on('reconnected', () => this.emit('streamReconnected'));
    this._streamingManager.on('maxReconnectAttemptsReached', () => this.emit('streamMaxReconnectAttemptsReached'));
  }

  /**
   * Gets the current connection configuration
   */
  getClientInfo(): GetClientInfo {
    return {
      host: this._host,
      port: this._port,
      timeout: this._timeout,
    };
  }

  // ==================== NETWORK INFORMATION METHODS ====================

  /**
   * Gets the current network name that the node is running on
   */
  async getCurrentNetwork() {
    return this._networkService!.getCurrentNetwork();
  }

  /**
   * Gets the list of known peer addresses in the current network
   */
  async getPeerAddresses() {
    return this._networkService!.getPeerAddresses();
  }

  /**
   * Gets information about all currently connected peers
   */
  async getConnectedPeerInfo() {
    return this._networkService!.getConnectedPeerInfo();
  }

  // ==================== BLOCKCHAIN METHODS ====================

  /**
   * Gets the hash of the current virtual's selected parent (tip of the chain)
   */
  async getSelectedTipHash(): Promise<BaseResult<GetSelectedTipHash>> {
    return this._blockchainService!.getSelectedTipHash();
  }

  /**
   * Gets detailed information about a specific block by its hash
   *
   * @param blockHash - The hash of the block to retrieve (64-character hex string)
   * @param includeTransactions - Whether to include transaction data in the response (default: true)
   */
  async getBlock(blockHash: string, includeTransactions = true): Promise<BaseResult<GetBlock>> {
    return this._blockchainService!.getBlock(blockHash, includeTransactions);
  }

  /**
   * Gets multiple blocks starting from a specific hash up to the current virtual
   *
   * @param lowHash - The starting block hash (64-character hex string)
   * @param includeTransactions - Whether to include transaction data (default: false)
   */
  async getBlocks(lowHash: string, includeTransactions = false): Promise<BaseResult<GetBlocks>> {
    return this._blockchainService!.getBlocks(lowHash, includeTransactions);
  }

  /**
   * Gets the current number of blocks and headers in the node's DAG
   * Note: Block count may decrease as pruning occurs
   */
  async getBlockCount(): Promise<BaseResult<GetBlockCount>> {
    return this._blockchainService!.getBlockCount();
  }

  /**
   * Gets general information about the current state of the node's DAG (Directed Acyclic Graph)
   */
  async getBlockDagInfo(): Promise<BaseResult<GetBlockDagInfo>> {
    return this._blockchainService!.getBlockDagInfo();
  }

  // ==================== MEMPOOL METHODS ====================

  /**
   * Gets information about a specific transaction in the mempool
   *
   * @param txId - The transaction ID to look up (64-character hex string)
   * @param includeOrphanPool - Whether to include orphan pool in search (default: true)
   * @param filterTransactionPool - Whether to filter the transaction pool (default: false)
   */
  async getMempoolEntry(txId: string, includeOrphanPool = true, filterTransactionPool = false): Promise<BaseResult<GetMempoolEntry>> {
    return this._mempoolService!.getMempoolEntry(txId, includeOrphanPool, filterTransactionPool);
  }

  /**
   * Gets information about all transactions currently in the mempool
   *
   * @param includeOrphanPool - Whether to include orphan pool transactions (default: true)
   * @param filterTransactionPool - Whether to filter the transaction pool (default: false)
   */
  async getMempoolEntries(includeOrphanPool = true, filterTransactionPool = false): Promise<BaseResult<GetMempoolEntries>> {
    return this._mempoolService!.getMempoolEntries(includeOrphanPool, filterTransactionPool);
  }

  /**
   * Gets pending mempool transactions for specific addresses
   * Returns both sending and receiving transactions for each address
   *
   * @param addresses - Array of Hoosat addresses to check
   * @param includeOrphanPool - Whether to include orphan pool transactions (default: false)
   * @param filterTransactionPool - Whether to filter the transaction pool (default: false)
   */
  async getMempoolEntriesByAddresses(
    addresses: string[],
    includeOrphanPool = false,
    filterTransactionPool = false
  ): Promise<BaseResult<GetMempoolEntriesByAddresses>> {
    return this._mempoolService!.getMempoolEntriesByAddresses(addresses, includeOrphanPool, filterTransactionPool);
  }

  // ==================== ADDRESS & UTXO METHODS ====================

  /**
   * Gets all current UTXOs (Unspent Transaction Outputs) for multiple addresses
   * Requires the node to be started with --utxoindex flag
   *
   * @param addresses - Array of Hoosat addresses to get UTXOs for
   */
  async getUtxosByAddresses(addresses: string[]): Promise<BaseResult<GetUtxosByAddresses>> {
    return this._addressService!.getUtxosByAddresses(addresses);
  }

  /**
   * Gets the balance for a single Hoosat address
   * Requires the node to be started with --utxoindex flag
   *
   * @param address - The Hoosat address to check balance for
   */
  async getBalance(address: string): Promise<BaseResult<GetBalanceByAddress>> {
    return this._addressService!.getBalance(address);
  }

  /**
   * Gets balances for multiple Hoosat addresses in a single request
   * Requires the node to be started with --utxoindex flag
   *
   * @param addresses - Array of Hoosat addresses to check balances for
   */
  async getBalances(addresses: string[]): Promise<BaseResult<GetBalancesByAddresses>> {
    return this._addressService!.getBalances(addresses);
  }

  // ==================== NODE INFORMATION METHODS ====================

  /**
   * Gets general information about the node including version, sync status, and capabilities
   */
  async getInfo(): Promise<BaseResult<GetInfo>> {
    return this._nodeInfoService!.getInfo();
  }

  /**
   * Gets the current blue score of the virtual's selected parent
   * The blue score represents the number of blue blocks in the selected chain
   */
  async getVirtualSelectedParentBlueScore(): Promise<BaseResult<GetVirtualSelectedParentBlueScore>> {
    return this._nodeInfoService!.getVirtualSelectedParentBlueScore();
  }

  /**
   * Estimates the network hash rate (hashes per second) over a specified window
   *
   * @param windowSize - Number of blocks to use for estimation (default: 1000, range: 1-10000)
   * @param startHash - Optional starting block hash for calculation
   */
  async estimateNetworkHashesPerSecond(windowSize = 1000, startHash?: string): Promise<BaseResult<EstimateNetworkHashesPerSecond>> {
    return this._nodeInfoService!.estimateNetworkHashesPerSecond(windowSize, startHash);
  }

  /**
   * Gets information about the coin supply including circulating and maximum supply
   */
  async getCoinSupply(): Promise<BaseResult<GetCoinSupply>> {
    return this._nodeInfoService!.getCoinSupply();
  }

  // ==================== TRANSACTION METHODS ====================

  /**
   * Submits a signed transaction to the mempool for broadcast to the network
   *
   * @param transaction - The signed transaction object
   * @param allowOrphan - Whether to allow orphan transactions (default: false)
   */
  async submitTransaction(transaction: Transaction, allowOrphan = false): Promise<BaseResult<SubmitTransaction>> {
    return this._transactionService!.submitTransaction(transaction, allowOrphan);
  }

  // ==================== STREAMING METHODS ====================

  /**
   * Subscribes to real-time UTXO changes for specific addresses
   * When UTXOs are added or removed for these addresses, events will be emitted
   *
   * @param addresses - Array of Hoosat addresses to monitor
   * @throws Error if addresses are invalid or streaming fails
   *
   * @example
   * ```typescript
   * await node.subscribeToUtxoChanges(['hoosat:...', 'hoosat:...']);
   *
   * node.on('utxoChanged', (change) => {
   *   console.log(`UTXO change for ${change.address}`);
   *   console.log('Added UTXOs:', change.changes.added.length);
   *   console.log('Removed UTXOs:', change.changes.removed.length);
   * });
   * ```
   */
  async subscribeToUtxoChanges(addresses: string[]): Promise<void> {
    validateAddresses(addresses);
    return this._streamingManager!.subscribeToUtxoChanges(addresses);
  }

  /**
   * Unsubscribes from UTXO changes for specific addresses or all addresses
   *
   * @param addresses - Optional array of addresses to unsubscribe from. If not provided, unsubscribes from all
   * @throws Error if unsubscription fails
   *
   * @example
   * ```typescript
   * // Unsubscribe from specific addresses
   * await node.unsubscribeFromUtxoChanges(['hoosat:...']);
   *
   * // Unsubscribe from all addresses
   * await node.unsubscribeFromUtxoChanges();
   * ```
   */
  async unsubscribeFromUtxoChanges(addresses?: string[]): Promise<void> {
    if (addresses) {
      validateAddresses(addresses);
    }
    return this._streamingManager!.unsubscribeFromUtxoChanges(addresses);
  }

  /**
   * Checks if the streaming connection is currently active
   *
   * @returns True if streaming is connected, false otherwise
   *
   * @example
   * ```typescript
   * if (node.isStreamingConnected()) {
   *   console.log('Streaming is active');
   * } else {
   *   console.log('Streaming is disconnected');
   * }
   * ```
   */
  isStreamingConnected(): boolean {
    return this._streamingManager!.isConnected();
  }

  /**
   * Gets the list of addresses currently subscribed for UTXO changes
   *
   * @returns Array of subscribed addresses
   *
   * @example
   * ```typescript
   * const subscribed = node.getSubscribedAddresses();
   * console.log('Monitoring', subscribed.length, 'addresses');
   * ```
   */
  getSubscribedAddresses(): string[] {
    return this._streamingManager!.getSubscribedAddresses();
  }

  /**
   * Cleanly disconnects from the node and stops all streaming
   * Should be called when the node instance is no longer needed
   *
   * @example
   * ```typescript
   * // Clean shutdown
   * process.on('SIGINT', () => {
   *   node.disconnect();
   *   process.exit(0);
   * });
   * ```
   */
  disconnect(): void {
    if (this._streamingManager) {
      this._streamingManager.disconnect();
    }

    this.removeAllListeners();
  }
}

export default HoosatNode;
