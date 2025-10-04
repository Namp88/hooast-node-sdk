import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';
import { EventEmitter } from 'events';

import { NodeConfig } from '@models/node-config.model';
import { RequestType } from '@enums/request-type.enum';
import { BaseResult } from '@models/result/base.result';
import { ErrorResponse } from '@models/response/error.response';

import { GetCurrentNetworkResponse } from '@models/response/get-current-network.response';
import { GetPeerAddressesResponse } from '@models/response/get-peer-addresses.response';
import { GetSelectedTipHashResponse } from '@models/response/get-selected-tip-hash.response';
import { GetMempoolEntryResponse } from '@models/response/get-mempool-entry.response';
import { GetConnectedPeerInfoResponse } from '@models/response/get-connected-peer-info.response';
import { GetBlockResponse } from '@models/response/get-block.response';
import { GetBlocksResponse } from '@models/response/get-blocks.response';
import { GetBlockCountResponse } from '@models/response/get-block-count.response';
import { GetBlockDagInfoResponse } from '@models/response/get-block-dag-info.response';
import { GetMempoolEntriesResponse } from '@models/response/get-mempool-entries.response';
import { GetUtxosByAddressesResponse } from '@models/response/get-utxos-by-addresses.response';
import { GetVirtualSelectedParentBlueScoreResponse } from '@models/response/get-virtual-selected-parent-blue-score.response';
import { GetInfoResponse } from '@models/response/get-info.response';
import { EstimateNetworkHashesPerSecondResponse } from '@models/response/estimate-network-hashes-per-second.response';
import { GetBalanceByAddressResponse } from '@models/response/get-balance-by-address.response';
import { GetBalancesByAddressesResponse } from '@models/response/get-balances-by-addresses.response';
import { GetMempoolEntriesByAddressesResponse } from '@models/response/get-mempool-entries-by-addresses.response';
import { GetCoinSupplyResponse } from '@models/response/get-coin-supply.response';
import { SubmitTransactionResponse } from '@models/response/submit-transaction.response';

import { GetCurrentNetwork } from '@models/result/get-current-network.result';
import { GetPeerAddresses, GetPeerAddressItem } from '@models/result/get-peer-addresses.result';
import { GetSelectedTipHash } from '@models/result/get-selected-tip-hash.result';
import { GetMempoolEntry } from '@models/result/get-mempool-entry.result';
import { GetConnectedPeerInfo } from '@models/result/get-connected-peer-info.result';
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

import { StreamingManager } from './streaming/streaming-manager';

// ==================== CONSTANTS ====================

/** Default configuration values for node connection */
const DEFAULT_CONFIG = {
  HOST: '127.0.0.1',
  PORT: 42420,
  TIMEOUT: 10000,
} as const;

/** Validation constants */
const VALIDATION = {
  ADDRESS_PREFIX: 'hoosat:',
  MIN_ADDRESS_LENGTH: 10,
  HEX_HASH_LENGTH: 64,
  MAX_ADDRESSES_BATCH: 1000,
  MIN_WINDOW_SIZE: 1,
  MAX_WINDOW_SIZE: 10000,
} as const;

/** gRPC configuration */
const GRPC_CONFIG = {
  MAX_MESSAGE_SIZE: 1024 * 1024 * 1024, // 1GB
} as const;

// ==================== VALIDATION UTILITIES ====================

/**
 * Validates a Hoosat address format
 * @param address - The address to validate
 * @returns True if valid, false otherwise
 */
function isValidAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }
  return address.startsWith(VALIDATION.ADDRESS_PREFIX) && address.length > VALIDATION.MIN_ADDRESS_LENGTH;
}

/**
 * Validates a hexadecimal hash
 * @param hash - The hash to validate
 * @returns True if valid, false otherwise
 */
function isValidHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') {
    return false;
  }
  return /^[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validates an array of addresses
 * @param addresses - Array of addresses to validate
 * @throws Error if validation fails
 */
function validateAddresses(addresses: string[]): void {
  if (!Array.isArray(addresses)) {
    throw new Error('Addresses must be an array');
  }

  if (addresses.length === 0) {
    throw new Error('Addresses array cannot be empty');
  }

  if (addresses.length > VALIDATION.MAX_ADDRESSES_BATCH) {
    throw new Error(`Too many addresses. Maximum ${VALIDATION.MAX_ADDRESSES_BATCH} allowed`);
  }

  const invalidAddresses = addresses.filter(addr => !isValidAddress(addr));
  if (invalidAddresses.length > 0) {
    throw new Error(`Invalid addresses: ${invalidAddresses.slice(0, 3).join(', ')}${invalidAddresses.length > 3 ? '...' : ''}`);
  }
}

/**
 * Validates a transaction ID
 * @param txId - Transaction ID to validate
 * @throws Error if validation fails
 */
function validateTransactionId(txId: string): void {
  if (!txId || typeof txId !== 'string') {
    throw new Error('Transaction ID must be a non-empty string');
  }

  if (!isValidHash(txId)) {
    throw new Error('Transaction ID must be a valid 64-character hexadecimal hash');
  }
}

/**
 * Validates a block hash
 * @param hash - Block hash to validate
 * @throws Error if validation fails
 */
function validateBlockHash(hash: string): void {
  if (!hash || typeof hash !== 'string') {
    throw new Error('Block hash must be a non-empty string');
  }

  if (!isValidHash(hash)) {
    throw new Error('Block hash must be a valid 64-character hexadecimal hash');
  }
}

/**
 * Validates window size parameter
 * @param windowSize - Window size to validate
 * @throws Error if validation fails
 */
function validateWindowSize(windowSize: number): void {
  if (!Number.isInteger(windowSize) || windowSize < VALIDATION.MIN_WINDOW_SIZE || windowSize > VALIDATION.MAX_WINDOW_SIZE) {
    throw new Error(`Window size must be an integer between ${VALIDATION.MIN_WINDOW_SIZE} and ${VALIDATION.MAX_WINDOW_SIZE}`);
  }
}

// ==================== MAIN CLASS ====================

/**
 * HoosatNode - TypeScript SDK for communicating with Hoosat nodes via gRPC
 *
 * @example
 * ```typescript
 * const node = new HoosatNode({
 *   host: '127.0.0.1',
 *   port: 42420
 * });
 *
 * const info = await node.getInfo();
 * const balance = await node.getBalance('hoosat:...');
 * ```
 */
class HoosatNode extends EventEmitter {
  private readonly _host: string;
  private readonly _port: number;
  private readonly _timeout: number;

  private _client: any;
  private _streamingManager: StreamingManager | null = null;

  /**
   * Creates a new HoosatNode instance
   * @param config - Node configuration options
   * @param config.host - Hostname or IP address of the Hoosat node (default: '127.0.0.1')
   * @param config.port - Port number of the Hoosat node (default: 42420)
   * @param config.timeout - Request timeout in milliseconds (default: 10000)
   *
   * @example
   * ```typescript
   * const node = new HoosatNode({
   *   host: '54.38.176.95',
   *   port: 42420,
   *   timeout: 15000
   * });
   * ```
   */
  constructor(config: NodeConfig = {}) {
    super();

    this._host = config.host || DEFAULT_CONFIG.HOST;
    this._port = config.port || DEFAULT_CONFIG.PORT;
    this._timeout = config.timeout || DEFAULT_CONFIG.TIMEOUT;

    this._initializeClient();
    this._initializeStreaming();
  }

  // ==================== PRIVATE INITIALIZATION METHODS ====================

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
   * Initializes the streaming manager for real-time updates
   * @private
   */
  private _initializeStreaming(): void {
    this._streamingManager = new StreamingManager(this._client);

    // Proxy events from StreamingManager with proper typing
    this._streamingManager.on('utxoChanged', change => {
      this.emit('utxoChanged', change);
    });

    this._streamingManager.on('utxosChanged', changes => {
      this.emit('utxosChanged', changes);
    });

    this._streamingManager.on('error', error => {
      this.emit('streamingError', error);
    });

    this._streamingManager.on('streamEnded', () => {
      this.emit('streamEnded');
    });

    this._streamingManager.on('streamClosed', () => {
      this.emit('streamClosed');
    });

    this._streamingManager.on('reconnected', () => {
      this.emit('streamReconnected');
    });

    this._streamingManager.on('maxReconnectAttemptsReached', () => {
      this.emit('streamMaxReconnectAttemptsReached');
    });
  }

  // ==================== PRIVATE CORE METHODS ====================

  /**
   * Makes a request to the Hoosat node
   * @private
   * @param command - The RPC command to execute
   * @param params - Parameters for the command
   * @returns Promise with the response
   */
  private async _request<T = any>(command: RequestType, params: any = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request ${command} timed out after ${this._timeout}ms`));
      }, this._timeout);

      try {
        const call = this._client.MessageStream();
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
          reject(new Error(`gRPC error: ${error.message || error}`));
        });

        call.on('end', () => {
          clearTimeout(timeout);
          if (!responseReceived) {
            reject(new Error(`Stream ended without response for ${command}`));
          }
        });

        const message: any = {};
        message[command] = params;
        call.write(message);
      } catch (error) {
        clearTimeout(timeout);
        reject(new Error(`Failed to send request: ${error}`));
      }
    });
  }

  /**
   * Builds a standardized result object
   * @private
   * @param error - Error from the response
   * @param model - The result data
   * @returns Standardized result object
   */
  private _buildResult<T>(error: ErrorResponse | null, model: T): BaseResult<T> {
    const extractedError = error ? error.message : null;

    return {
      ok: !Boolean(extractedError),
      result: Boolean(extractedError) ? null : model,
      error: extractedError,
    };
  }

  // ==================== NETWORK INFORMATION METHODS ====================

  /**
   * Gets the current network name that the node is running on
   *
   * @returns Promise resolving to network information
   * @throws Error if the request fails
   *
   * @example
   * ```typescript
   * const networkResult = await node.getCurrentNetwork();
   * if (networkResult.ok) {
   *   console.log('Network:', networkResult.result.currentNetwork); // "mainnet", "testnet", etc.
   * }
   * ```
   */
  async getCurrentNetwork(): Promise<BaseResult<GetCurrentNetwork>> {
    try {
      const { getCurrentNetworkResponse } = await this._request<GetCurrentNetworkResponse>(RequestType.GetCurrentNetworkRequest, {});

      const result: GetCurrentNetwork = {
        currentNetwork: getCurrentNetworkResponse.currentNetwork,
      };

      return this._buildResult(getCurrentNetworkResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to get current network: ${error}` }, {} as GetCurrentNetwork);
    }
  }

  /**
   * Gets the list of known peer addresses in the current network
   *
   * @returns Promise resolving to peer addresses information
   * @throws Error if the request fails
   *
   * @example
   * ```typescript
   * const peersResult = await node.getPeerAddresses();
   * if (peersResult.ok) {
   *   console.log('Known peers:', peersResult.result.addresses.length);
   *   console.log('Banned peers:', peersResult.result.bannedAddresses.length);
   * }
   * ```
   */
  async getPeerAddresses(): Promise<BaseResult<GetPeerAddresses>> {
    try {
      const { getPeerAddressesResponse } = await this._request<GetPeerAddressesResponse>(RequestType.GetPeerAddressesRequest, {});

      const parseAddress = (addr: string): GetPeerAddressItem => {
        const isIPv6 = addr.startsWith('[');
        const [host, port] = isIPv6 ? [addr.substring(1, addr.lastIndexOf(']')), addr.split(':').pop()] : addr.split(':');

        return {
          address: addr,
          isIPv6,
          host,
          port: parseInt(port || '0'),
        };
      };

      const result: GetPeerAddresses = {
        addresses: getPeerAddressesResponse.addresses?.map(a => parseAddress(a.Addr)) || [],
        bannedAddresses: getPeerAddressesResponse.bannedAddresses?.map(a => parseAddress(a.Addr)) || [],
      };

      return this._buildResult(getPeerAddressesResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to get peer addresses: ${error}` }, {} as GetPeerAddresses);
    }
  }

  /**
   * Gets information about all currently connected peers
   *
   * @returns Promise resolving to connected peer information
   * @throws Error if the request fails
   *
   * @example
   * ```typescript
   * const peersResult = await node.getConnectedPeerInfo();
   * if (peersResult.ok) {
   *   peersResult.result.peers.forEach(peer => {
   *     console.log(`Peer: ${peer.address} (${peer.userAgent})`);
   *   });
   * }
   * ```
   */
  async getConnectedPeerInfo(): Promise<BaseResult<GetConnectedPeerInfo>> {
    try {
      const { getConnectedPeerInfoResponse } = await this._request<GetConnectedPeerInfoResponse>(
        RequestType.GetConnectedPeerInfoRequest,
        {}
      );

      const result: GetConnectedPeerInfo = {
        peers: getConnectedPeerInfoResponse.infos,
      };

      return this._buildResult(getConnectedPeerInfoResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to get connected peer info: ${error}` }, {} as GetConnectedPeerInfo);
    }
  }

  // ==================== BLOCKCHAIN METHODS ====================

  /**
   * Gets the hash of the current virtual's selected parent (tip of the chain)
   *
   * @returns Promise resolving to the selected tip hash
   * @throws Error if the request fails
   *
   * @example
   * ```typescript
   * const tipResult = await node.getSelectedTipHash();
   * if (tipResult.ok) {
   *   console.log('Current tip:', tipResult.result.selectedTipHash);
   * }
   * ```
   */
  async getSelectedTipHash(): Promise<BaseResult<GetSelectedTipHash>> {
    try {
      const { getSelectedTipHashResponse } = await this._request<GetSelectedTipHashResponse>(RequestType.GetSelectedTipHashRequest, {});

      const result: GetSelectedTipHash = {
        selectedTipHash: getSelectedTipHashResponse.selectedTipHash,
      };

      return this._buildResult(getSelectedTipHashResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to get selected tip hash: ${error}` }, {} as GetSelectedTipHash);
    }
  }

  /**
   * Gets detailed information about a specific block by its hash
   *
   * @param blockHash - The hash of the block to retrieve (64-character hex string)
   * @param includeTransactions - Whether to include transaction data in the response (default: true)
   * @returns Promise resolving to block information
   * @throws Error if the block hash is invalid or request fails
   *
   * @example
   * ```typescript
   * const blockResult = await node.getBlock('a1b2c3d4...', true);
   * if (blockResult.ok) {
   *   const block = blockResult.result;
   *   console.log('Block transactions:', block.transactions.length);
   *   console.log('Block timestamp:', block.header.timestamp);
   * }
   * ```
   */
  async getBlock(blockHash: string, includeTransactions = true): Promise<BaseResult<GetBlock>> {
    try {
      validateBlockHash(blockHash);

      const { getBlockResponse } = await this._request<GetBlockResponse>(RequestType.GetBlockRequest, {
        hash: blockHash,
        includeTransactions,
      });

      const result: GetBlock = getBlockResponse.block;

      return this._buildResult(getBlockResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to get block: ${error}` }, {} as GetBlock);
    }
  }

  /**
   * Gets multiple blocks starting from a specific hash up to the current virtual
   *
   * @param lowHash - The starting block hash (64-character hex string)
   * @param includeTransactions - Whether to include transaction data (default: false)
   * @returns Promise resolving to blocks information
   * @throws Error if the hash is invalid or request fails
   *
   * @example
   * ```typescript
   * const blocksResult = await node.getBlocks('a1b2c3d4...', false);
   * if (blocksResult.ok) {
   *   console.log('Retrieved blocks:', blocksResult.result.blocks.length);
   *   console.log('Block hashes:', blocksResult.result.blockHashes);
   * }
   * ```
   */
  async getBlocks(lowHash: string, includeTransactions = false): Promise<BaseResult<GetBlocks>> {
    try {
      validateBlockHash(lowHash);

      const { getBlocksResponse } = await this._request<GetBlocksResponse>(RequestType.GetBlocksRequest, {
        lowHash,
        includeBlocks: true,
        includeTransactions,
      });

      const result: GetBlocks = {
        blocks: getBlocksResponse.blocks,
        blockHashes: getBlocksResponse.blockHashes,
      };

      return this._buildResult(getBlocksResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to get blocks: ${error}` }, {} as GetBlocks);
    }
  }

  /**
   * Gets the current number of blocks and headers in the node's DAG
   * Note: Block count may decrease as pruning occurs
   *
   * @returns Promise resolving to block and header counts
   * @throws Error if the request fails
   *
   * @example
   * ```typescript
   * const countResult = await node.getBlockCount();
   * if (countResult.ok) {
   *   console.log('Blocks:', countResult.result.blockCount);
   *   console.log('Headers:', countResult.result.headerCount);
   * }
   * ```
   */
  async getBlockCount(): Promise<BaseResult<GetBlockCount>> {
    try {
      const { getBlockCountResponse } = await this._request<GetBlockCountResponse>(RequestType.GetBlockCountRequest, {});

      const result: GetBlockCount = {
        blockCount: getBlockCountResponse.blockCount,
        headerCount: getBlockCountResponse.headerCount,
      };

      return this._buildResult(getBlockCountResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to get block count: ${error}` }, {} as GetBlockCount);
    }
  }

  /**
   * Gets general information about the current state of the node's DAG (Directed Acyclic Graph)
   *
   * @returns Promise resolving to BlockDAG information
   * @throws Error if the request fails
   *
   * @example
   * ```typescript
   * const dagResult = await node.getBlockDagInfo();
   * if (dagResult.ok) {
   *   const dag = dagResult.result;
   *   console.log('Network:', dag.networkName);
   *   console.log('Difficulty:', dag.difficulty);
   *   console.log('DAA Score:', dag.virtualDaaScore);
   * }
   * ```
   */
  async getBlockDagInfo(): Promise<BaseResult<GetBlockDagInfo>> {
    try {
      const { getBlockDagInfoResponse } = await this._request<GetBlockDagInfoResponse>(RequestType.GetBlockDagInfoRequest, {});
      const { error, ...model } = getBlockDagInfoResponse;

      const result: GetBlockDagInfo = model;

      return this._buildResult(getBlockDagInfoResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to get block DAG info: ${error}` }, {} as GetBlockDagInfo);
    }
  }

  // ==================== MEMPOOL METHODS ====================

  /**
   * Gets information about a specific transaction in the mempool
   *
   * @param txId - The transaction ID to look up (64-character hex string)
   * @param includeOrphanPool - Whether to include orphan pool in search (default: true)
   * @param filterTransactionPool - Whether to filter the transaction pool (default: false)
   * @returns Promise resolving to mempool entry information
   * @throws Error if the transaction ID is invalid or request fails
   *
   * @example
   * ```typescript
   * const entryResult = await node.getMempoolEntry('a1b2c3d4...', true);
   * if (entryResult.ok && entryResult.result.transaction) {
   *   console.log('TX ID:', entryResult.result.transaction.transactionId);
   *   console.log('Fee:', entryResult.result.fee);
   *   console.log('Is Orphan:', entryResult.result.isOrphan);
   * }
   * ```
   */
  async getMempoolEntry(txId: string, includeOrphanPool = true, filterTransactionPool = false): Promise<BaseResult<GetMempoolEntry>> {
    try {
      validateTransactionId(txId);

      const { getMempoolEntryResponse } = await this._request<GetMempoolEntryResponse>(RequestType.GetMempoolEntryRequest, {
        txId,
        includeOrphanPool,
        filterTransactionPool,
      });

      const result: GetMempoolEntry = {
        transaction: getMempoolEntryResponse?.entry?.transaction ?? null,
        fee: getMempoolEntryResponse?.entry?.fee ?? null,
        mass: getMempoolEntryResponse?.entry?.mass ?? null,
        isOrphan: getMempoolEntryResponse?.entry?.isOrphan ?? false,
      };

      return this._buildResult(getMempoolEntryResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to get mempool entry: ${error}` }, {} as GetMempoolEntry);
    }
  }

  /**
   * Gets information about all transactions currently in the mempool
   *
   * @param includeOrphanPool - Whether to include orphan pool transactions (default: true)
   * @param filterTransactionPool - Whether to filter the transaction pool (default: false)
   * @returns Promise resolving to all mempool entries
   * @throws Error if the request fails
   *
   * @example
   * ```typescript
   * const entriesResult = await node.getMempoolEntries(true);
   * if (entriesResult.ok) {
   *   console.log('Mempool size:', entriesResult.result.entries.length);
   *   const totalFees = entriesResult.result.entries.reduce((sum, entry) =>
   *     sum + BigInt(entry.fee || '0'), 0n);
   *   console.log('Total fees:', totalFees);
   * }
   * ```
   */
  async getMempoolEntries(includeOrphanPool = true, filterTransactionPool = false): Promise<BaseResult<GetMempoolEntries>> {
    try {
      const { getMempoolEntriesResponse } = await this._request<GetMempoolEntriesResponse>(RequestType.GetMempoolEntriesRequest, {
        includeOrphanPool,
        filterTransactionPool,
      });

      const result: GetMempoolEntries = {
        entries: getMempoolEntriesResponse.entries,
      };

      return this._buildResult(getMempoolEntriesResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to get mempool entries: ${error}` }, {} as GetMempoolEntries);
    }
  }

  /**
   * Gets pending mempool transactions for specific addresses
   * Returns both sending and receiving transactions for each address
   *
   * @param addresses - Array of Hoosat addresses to check
   * @param includeOrphanPool - Whether to include orphan pool transactions (default: false)
   * @param filterTransactionPool - Whether to filter the transaction pool (default: false)
   * @returns Promise resolving to mempool entries grouped by address
   * @throws Error if addresses are invalid or request fails
   *
   * @example
   * ```typescript
   * const pendingResult = await node.getMempoolEntriesByAddresses(['hoosat:...', 'hoosat:...']);
   * if (pendingResult.ok) {
   *   pendingResult.result.entries.forEach(entry => {
   *     console.log(`Address: ${entry.address}`);
   *     console.log(`Sending: ${entry.sending.length}, Receiving: ${entry.receiving.length}`);
   *   });
   * }
   * ```
   */
  async getMempoolEntriesByAddresses(
    addresses: string[],
    includeOrphanPool = false,
    filterTransactionPool = false
  ): Promise<BaseResult<GetMempoolEntriesByAddresses>> {
    try {
      validateAddresses(addresses);

      const { getMempoolEntriesByAddressesResponse } = await this._request<GetMempoolEntriesByAddressesResponse>(
        RequestType.GetMempoolEntriesByAddressesRequest,
        {
          addresses,
          includeOrphanPool,
          filterTransactionPool,
        }
      );

      const result: GetMempoolEntriesByAddresses = {
        entries: getMempoolEntriesByAddressesResponse.entries || [],
      };

      return this._buildResult(getMempoolEntriesByAddressesResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to get mempool entries by addresses: ${error}` }, {} as GetMempoolEntriesByAddresses);
    }
  }

  // ==================== ADDRESS & UTXO METHODS ====================

  /**
   * Gets all current UTXOs (Unspent Transaction Outputs) for multiple addresses
   * Requires the node to be started with --utxoindex flag
   *
   * @param addresses - Array of Hoosat addresses to get UTXOs for
   * @returns Promise resolving to UTXO information
   * @throws Error if addresses are invalid or UTXO index is not available
   *
   * @example
   * ```typescript
   * const utxosResult = await node.getUtxosByAddresses(['hoosat:...', 'hoosat:...']);
   * if (utxosResult.ok) {
   *   const totalAmount = utxosResult.result.utxos.reduce((sum, utxo) =>
   *     sum + BigInt(utxo.utxoEntry.amount), 0n);
   *   console.log('Total UTXO value:', totalAmount);
   * }
   * ```
   */
  async getUtxosByAddresses(addresses: string[]): Promise<BaseResult<GetUtxosByAddresses>> {
    try {
      validateAddresses(addresses);

      const { getUtxosByAddressesResponse } = await this._request<GetUtxosByAddressesResponse>(RequestType.GetUtxosByAddressesRequest, {
        addresses,
      });

      const result: GetUtxosByAddresses = {
        utxos: getUtxosByAddressesResponse.entries || [],
      };

      return this._buildResult(getUtxosByAddressesResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to get UTXOs by addresses: ${error}` }, {} as GetUtxosByAddresses);
    }
  }

  /**
   * Gets the balance for a single Hoosat address
   * Requires the node to be started with --utxoindex flag
   *
   * @param address - The Hoosat address to check balance for
   * @returns Promise resolving to balance information in sompi (smallest unit)
   * @throws Error if address is invalid or UTXO index is not available
   *
   * @example
   * ```typescript
   * const balanceResult = await node.getBalance('hoosat:...');
   * if (balanceResult.ok) {
   *   console.log('Balance (sompi):', balanceResult.result.balance);
   *   console.log('Balance (HTN):', node.formatAmount(balanceResult.result.balance));
   * }
   * ```
   */
  async getBalance(address: string): Promise<BaseResult<GetBalanceByAddress>> {
    try {
      if (!isValidAddress(address)) {
        throw new Error('Invalid Hoosat address format');
      }

      const { getBalanceByAddressResponse } = await this._request<GetBalanceByAddressResponse>(RequestType.GetBalanceByAddressRequest, {
        address,
      });

      const result: GetBalanceByAddress = {
        balance: getBalanceByAddressResponse.balance,
      };

      return this._buildResult(getBalanceByAddressResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to get balance: ${error}` }, {} as GetBalanceByAddress);
    }
  }

  /**
   * Gets balances for multiple Hoosat addresses in a single request
   * Requires the node to be started with --utxoindex flag
   *
   * @param addresses - Array of Hoosat addresses to check balances for
   * @returns Promise resolving to balance information for each address
   * @throws Error if addresses are invalid or UTXO index is not available
   *
   * @example
   * ```typescript
   * const balancesResult = await node.getBalances(['hoosat:...', 'hoosat:...']);
   * if (balancesResult.ok) {
   *   const totalBalance = balancesResult.result.balances.reduce((sum, item) =>
   *     sum + BigInt(item.balance), 0n);
   *   console.log('Total portfolio value:', node.formatAmount(totalBalance));
   * }
   * ```
   */
  async getBalances(addresses: string[]): Promise<BaseResult<GetBalancesByAddresses>> {
    try {
      validateAddresses(addresses);

      const { getBalancesByAddressesResponse } = await this._request<GetBalancesByAddressesResponse>(
        RequestType.GetBalancesByAddressesRequest,
        { addresses }
      );

      const result: GetBalancesByAddresses = {
        balances: getBalancesByAddressesResponse.entries.map(entry => ({
          address: entry.address,
          balance: entry.balance,
        })),
      };

      return this._buildResult(getBalancesByAddressesResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to get balances: ${error}` }, {} as GetBalancesByAddresses);
    }
  }

  // ==================== NODE INFORMATION METHODS ====================

  /**
   * Gets general information about the node including version, sync status, and capabilities
   *
   * @returns Promise resolving to node information
   * @throws Error if the request fails
   *
   * @example
   * ```typescript
   * const infoResult = await node.getInfo();
   * if (infoResult.ok) {
   *   const info = infoResult.result;
   *   console.log('Version:', info.serverVersion);
   *   console.log('Synced:', info.isSynced);
   *   console.log('UTXO Indexed:', info.isUtxoIndexed);
   *   console.log('Mempool size:', info.mempoolSize);
   * }
   * ```
   */
  async getInfo(): Promise<BaseResult<GetInfo>> {
    try {
      const { getInfoResponse } = await this._request<GetInfoResponse>(RequestType.GetInfoRequest, {});

      const result: GetInfo = {
        p2pId: getInfoResponse.p2pId,
        mempoolSize: getInfoResponse.mempoolSize,
        serverVersion: getInfoResponse.serverVersion,
        isUtxoIndexed: getInfoResponse.isUtxoIndexed,
        isSynced: getInfoResponse.isSynced,
      };

      return this._buildResult(getInfoResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to get node info: ${error}` }, {} as GetInfo);
    }
  }

  /**
   * Gets the current blue score of the virtual's selected parent
   * The blue score represents the number of blue blocks in the selected chain
   *
   * @returns Promise resolving to blue score information
   * @throws Error if the request fails
   *
   * @example
   * ```typescript
   * const blueScoreResult = await node.getVirtualSelectedParentBlueScore();
   * if (blueScoreResult.ok) {
   *   console.log('Current blue score:', blueScoreResult.result.blueScore);
   * }
   * ```
   */
  async getVirtualSelectedParentBlueScore(): Promise<BaseResult<GetVirtualSelectedParentBlueScore>> {
    try {
      const { getVirtualSelectedParentBlueScoreResponse } = await this._request<GetVirtualSelectedParentBlueScoreResponse>(
        RequestType.GetVirtualSelectedParentBlueScoreRequest,
        {}
      );

      const result: GetVirtualSelectedParentBlueScore = {
        blueScore: getVirtualSelectedParentBlueScoreResponse.blueScore,
      };

      return this._buildResult(getVirtualSelectedParentBlueScoreResponse.error, result);
    } catch (error) {
      return this._buildResult(
        { message: `Failed to get virtual selected parent blue score: ${error}` },
        {} as GetVirtualSelectedParentBlueScore
      );
    }
  }

  /**
   * Estimates the network hash rate (hashes per second) over a specified window
   *
   * @param windowSize - Number of blocks to use for estimation (default: 1000, range: 1-10000)
   * @param startHash - Optional starting block hash for calculation
   * @returns Promise resolving to network hash rate information
   * @throws Error if window size is invalid or request fails
   *
   * @example
   * ```typescript
   * const hashrateResult = await node.estimateNetworkHashesPerSecond(2000);
   * if (hashrateResult.ok) {
   *   const hashrate = parseFloat(hashrateResult.result.networkHashesPerSecond);
   *   const hashrateGH = (hashrate / 1e9).toFixed(2);
   *   console.log(`Network hashrate: ${hashrateGH} GH/s`);
   * }
   * ```
   */
  async estimateNetworkHashesPerSecond(windowSize = 1000, startHash?: string): Promise<BaseResult<EstimateNetworkHashesPerSecond>> {
    try {
      validateWindowSize(windowSize);

      const params: any = { windowSize };
      if (startHash) {
        validateBlockHash(startHash);
        params.startHash = startHash;
      }

      const { estimateNetworkHashesPerSecondResponse } = await this._request<EstimateNetworkHashesPerSecondResponse>(
        RequestType.EstimateNetworkHashesPerSecondRequest,
        params
      );

      const result: EstimateNetworkHashesPerSecond = {
        networkHashesPerSecond: estimateNetworkHashesPerSecondResponse.networkHashesPerSecond,
      };

      return this._buildResult(estimateNetworkHashesPerSecondResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to estimate network hashes per second: ${error}` }, {} as EstimateNetworkHashesPerSecond);
    }
  }

  /**
   * Gets information about the coin supply including circulating and maximum supply
   *
   * @returns Promise resolving to coin supply information
   * @throws Error if the request fails
   *
   * @example
   * ```typescript
   * const supplyResult = await node.getCoinSupply();
   * if (supplyResult.ok) {
   *   const supply = supplyResult.result;
   *   console.log('Circulating:', node.formatAmount(supply.circulatingSupply), 'HTN');
   *   console.log('Max supply:', node.formatAmount(supply.maxSupply), 'HTN');
   *
   *   const percentage = (BigInt(supply.circulatingSupply) * 100n) / BigInt(supply.maxSupply);
   *   console.log('Issued:', percentage.toString(), '%');
   * }
   * ```
   */
  async getCoinSupply(): Promise<BaseResult<GetCoinSupply>> {
    try {
      const { getCoinSupplyResponse } = await this._request<GetCoinSupplyResponse>(RequestType.GetCoinSupplyRequest, {});

      const result: GetCoinSupply = {
        circulatingSupply: getCoinSupplyResponse.circulatingSompi,
        maxSupply: getCoinSupplyResponse.maxSompi,
      };

      return this._buildResult(getCoinSupplyResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to get coin supply: ${error}` }, {} as GetCoinSupply);
    }
  }

  // ==================== TRANSACTION METHODS ====================

  /**
   * Submits a signed transaction to the mempool for broadcast to the network
   *
   * @param transaction - The signed transaction object
   * @param allowOrphan - Whether to allow orphan transactions (default: false)
   * @returns Promise resolving to transaction submission result
   * @throws Error if transaction is invalid or submission fails
   *
   * @example
   * ```typescript
   * const transaction = {
   *   version: 1,
   *   inputs: [...],
   *   outputs: [...],
   *   lockTime: '0',
   *   subnetworkId: '0000000000000000000000000000000000000000'
   * };
   *
   * const submitResult = await node.submitTransaction(transaction);
   * if (submitResult.ok) {
   *   console.log('Transaction submitted:', submitResult.result.transactionId);
   * }
   * ```
   */
  async submitTransaction(transaction: Transaction, allowOrphan = false): Promise<BaseResult<SubmitTransaction>> {
    try {
      if (!transaction || typeof transaction !== 'object') {
        throw new Error('Transaction must be a valid transaction object');
      }

      if (!transaction.inputs || !Array.isArray(transaction.inputs) || transaction.inputs.length === 0) {
        throw new Error('Transaction must have at least one input');
      }

      if (!transaction.outputs || !Array.isArray(transaction.outputs) || transaction.outputs.length === 0) {
        throw new Error('Transaction must have at least one output');
      }

      const { submitTransactionResponse } = await this._request<SubmitTransactionResponse>(RequestType.SubmitTransactionRequest, {
        transaction,
        allowOrphan,
      });

      const result: SubmitTransaction = {
        transactionId: submitTransactionResponse.transactionId,
      };

      return this._buildResult(submitTransactionResponse.error, result);
    } catch (error) {
      return this._buildResult({ message: `Failed to submit transaction: ${error}` }, {} as SubmitTransaction);
    }
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

  // ==================== UTILITY METHODS ====================

  /**
   * Validates a Hoosat address format
   *
   * @param address - The address to validate
   * @returns True if the address is valid, false otherwise
   *
   * @example
   * ```typescript
   * if (node.isValidAddress('hoosat:...')) {
   *   console.log('Valid address');
   * } else {
   *   console.log('Invalid address');
   * }
   * ```
   */
  isValidAddress(address: string): boolean {
    return isValidAddress(address);
  }

  /**
   * Formats an amount from sompi (smallest unit) to HTN (readable format)
   *
   * @param sompi - Amount in sompi as string or bigint
   * @returns Formatted amount in HTN with 8 decimal places
   *
   * @example
   * ```typescript
   * const balance = '100000000'; // 100000000 sompi
   * const readable = node.formatAmount(balance); // '1.00000000'
   * console.log(`Balance: ${readable} HTN`);
   * ```
   */
  formatAmount(sompi: string | bigint): string {
    const amount = typeof sompi === 'string' ? BigInt(sompi) : sompi;
    const htn = Number(amount) / 100000000;
    return htn.toFixed(8);
  }

  /**
   * Parses an amount from HTN (readable format) to sompi (smallest unit)
   *
   * @param htn - Amount in HTN as string
   * @returns Amount in sompi as string
   *
   * @example
   * ```typescript
   * const amount = '1.5'; // 1.5 HTN
   * const sompi = node.parseAmount(amount); // '150000000'
   * console.log(`${amount} HTN = ${sompi} sompi`);
   * ```
   */
  parseAmount(htn: string): string {
    const amount = parseFloat(htn) * 100000000;
    return BigInt(Math.floor(amount)).toString();
  }

  /**
   * Gets the current connection configuration
   *
   * @returns Object containing host, port, and timeout configuration
   *
   * @example
   * ```typescript
   * const config = node.getConnectionInfo();
   * console.log(`Connected to ${config.host}:${config.port}`);
   * ```
   */
  getConnectionInfo(): { host: string; port: number; timeout: number } {
    return {
      host: this._host,
      port: this._port,
      timeout: this._timeout,
    };
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

  // ==================== CONVENIENCE METHODS ====================

  /**
   * Convenience method to get header count only
   *
   * @returns Promise resolving to header count as string
   * @throws Error if the request fails
   */
  async getHeaderCount(): Promise<string> {
    const result = await this.getBlockCount();
    if (result.ok && result.result) {
      return result.result.headerCount;
    }
    throw new Error(result.error || 'Failed to get header count');
  }

  /**
   * Convenience method that returns all transactions for an address
   * by getting UTXOs and pending transactions
   *
   * @param address - The Hoosat address to get transactions for
   * @returns Promise resolving to transaction list
   * @throws Error if address is invalid or requests fail
   */
  async getTransactionsByAddress(address: string): Promise<any[]> {
    if (!isValidAddress(address)) {
      throw new Error('Invalid Hoosat address format');
    }

    try {
      // Get UTXOs (confirmed transactions)
      const utxosResult = await this.getUtxosByAddresses([address]);
      const utxos = utxosResult.ok ? utxosResult.result?.utxos || [] : [];

      // Get pending transactions
      const pendingResult = await this.getMempoolEntriesByAddresses([address]);
      const pending = pendingResult.ok
        ? pendingResult.result?.entries[0] || { sending: [], receiving: [] }
        : { sending: [], receiving: [] };

      // Combine and format transactions
      const transactions: any[] = [];

      // Add confirmed transactions from UTXOs
      utxos.forEach(utxo => {
        transactions.push({
          transactionId: utxo.outpoint.transactionId,
          type: 'confirmed',
          amount: utxo.utxoEntry.amount,
          blockDaaScore: utxo.utxoEntry.blockDaaScore,
          isCoinbase: utxo.utxoEntry.isCoinbase,
        });
      });

      // Add pending transactions
      [...pending.sending, ...pending.receiving].forEach(tx => {
        transactions.push({
          transactionId: tx.transaction.transactionId,
          type: 'pending',
          fee: tx.fee,
          isOrphan: tx.isOrphan,
          inputs: tx.transaction.inputs,
          outputs: tx.transaction.outputs,
        });
      });

      return transactions;
    } catch (error) {
      throw new Error(`Failed to get transactions for address: ${error}`);
    }
  }
}

export default HoosatNode;
