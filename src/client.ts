import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';
import { EventEmitter } from 'events';

// Core types
import { NodeConfig } from './types';
import { RequestType } from '@enums/request-type.enum';
import { BaseResult } from '@models/result/base.result';
import { ErrorResponse } from '@models/response/error.response';

// Response types
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

// Result types
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

// Streaming
import { StreamingManager } from './streaming/streaming-manager';
import { GetUtxosByAddresses } from '@models/result/get-utxos-by-addresses.result';
import { GetUtxosByAddressesResponse } from '@models/response/get-utxos-by-addresses.response';
import { GetVirtualSelectedParentBlueScore } from '@models/result/get-virtual-selected-parent-blue-score.result';
import { GetVirtualSelectedParentBlueScoreResponse } from '@models/response/get-virtual-selected-parent-blue-score.response';
import { GetInfo } from '@models/result/get-info.result';
import { GetInfoResponse } from '@models/response/get-info.response';
import { EstimateNetworkHashesPerSecond } from '@models/result/estimate-network-hashes-per-second.result';
import { EstimateNetworkHashesPerSecondResponse } from '@models/response/estimate-network-hashes-per-second.response';
import { GetBalanceByAddress } from '@models/result/get-balance-by-address.result';
import { GetBalanceByAddressResponse } from '@models/response/get-balance-by-address.response';
import { GetBalancesByAddresses } from '@models/result/get-balances-by-addresses.result';
import { GetBalancesByAddressesResponse } from '@models/response/get-balances-by-addresses.response';
import { GetMempoolEntriesByAddresses } from '@models/result/get-mempool-entries-by-addresses.result';
import { GetMempoolEntriesByAddressesResponse } from '@models/response/get-mempool-entries-by-addresses.response';
import { GetCoinSupply } from '@models/result/get-coin-supply.result';
import { GetCoinSupplyResponse } from '@models/response/get-coin-supply.response';
import { SubmitTransaction } from '@models/result/submit-transaction.result';
import { SubmitTransactionResponse } from '@models/response/submit-transaction.response';
import { Transaction } from '@models/transaction/transaction.types';

class HoosatNode extends EventEmitter {
  private readonly _host: string;
  private readonly _port: number;
  private readonly _timeout: number;

  private _client: any;
  private _streamingManager: StreamingManager | null = null;

  constructor(config: NodeConfig = {}) {
    super();

    this._host = config.host || '127.0.0.1';
    this._port = config.port || 42420;
    this._timeout = config.timeout || 10000;

    this._initializeClient();
    this._initializeStreaming();
  }

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
        'grpc.max_send_message_length': 1024 * 1024 * 1024,
        'grpc.max_receive_message_length': 1024 * 1024 * 1024,
      });
    } catch (error) {
      throw new Error(`Failed to initialize gRPC client: ${error}`);
    }
  }

  private _initializeStreaming(): void {
    this._streamingManager = new StreamingManager(this._client);

    // Проксируем события от StreamingManager с правильной типизацией
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

  // ==================== CORE METHODS ====================

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
          reject(error);
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
        reject(error);
      }
    });
  }

  private _buildResult<T>(error: ErrorResponse | null, model: T): BaseResult<T> {
    const extractedError = error ? error.message : null;

    return {
      ok: !Boolean(extractedError),
      result: Boolean(extractedError) ? null : model,
      error: extractedError,
    };
  }

  // ==================== NETWORK METHODS ====================

  /**
   * Get current network
   */
  async getCurrentNetwork(): Promise<BaseResult<GetCurrentNetwork>> {
    const { getCurrentNetworkResponse } = await this._request<GetCurrentNetworkResponse>(RequestType.GetCurrentNetworkRequest, {});

    const result: GetCurrentNetwork = {
      currentNetwork: getCurrentNetworkResponse.currentNetwork,
    };

    return this._buildResult(getCurrentNetworkResponse.error, result);
  }

  /**
   * Get peer addresses
   */
  async getPeerAddresses(): Promise<BaseResult<GetPeerAddresses>> {
    const { getPeerAddressesResponse } = await this._request<GetPeerAddressesResponse>(RequestType.GetPeerAddressesRequest, {});

    const parseAddress = (addr: string): GetPeerAddressItem => {
      const isIPv6 = addr.startsWith('[');
      const [host, port] = isIPv6 ? [addr.substring(1, addr.lastIndexOf(']')), addr.split(':').pop()] : addr.split(':');

      return {
        address: addr,
        isIPv6,
        host,
        port: parseInt(port!),
      };
    };

    const result: GetPeerAddresses = {
      addresses: getPeerAddressesResponse.addresses?.map(a => parseAddress(a.Addr)) || [],
      bannedAddresses: getPeerAddressesResponse.bannedAddresses?.map(a => parseAddress(a.Addr)) || [],
    };

    return this._buildResult(getPeerAddressesResponse.error, result);
  }

  /**
   * Get connected peer info
   */
  async getConnectedPeerInfo(): Promise<BaseResult<GetConnectedPeerInfo>> {
    const { getConnectedPeerInfoResponse } = await this._request<GetConnectedPeerInfoResponse>(RequestType.GetConnectedPeerInfoRequest, {});

    const result: GetConnectedPeerInfo = {
      peers: getConnectedPeerInfoResponse.infos,
    };

    return this._buildResult(getConnectedPeerInfoResponse.error, result);
  }

  // ==================== BLOCK METHODS ====================

  /**
   * Get selected tip hash (best block in the DAG)
   */
  async getSelectedTipHash(): Promise<BaseResult<GetSelectedTipHash>> {
    const { getSelectedTipHashResponse } = await this._request<GetSelectedTipHashResponse>(RequestType.GetSelectedTipHashRequest, {});

    const result: GetSelectedTipHash = {
      selectedTipHash: getSelectedTipHashResponse.selectedTipHash,
    };

    return this._buildResult(getSelectedTipHashResponse.error, result);
  }

  /**
   * Get block by hash
   */
  async getBlock(blockHash: string, includeTransactions = true): Promise<BaseResult<GetBlock>> {
    const { getBlockResponse } = await this._request<GetBlockResponse>(RequestType.GetBlockRequest, {
      hash: blockHash,
      includeTransactions,
    });

    const result: GetBlock = getBlockResponse.block;

    return this._buildResult(getBlockResponse.error, result);
  }

  /**
   * Get multiple blocks
   */
  async getBlocks(lowHash: string, includeTransactions = false): Promise<BaseResult<GetBlocks>> {
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
  }

  /**
   * Get block count
   */
  async getBlockCount(): Promise<BaseResult<GetBlockCount>> {
    const { getBlockCountResponse } = await this._request<GetBlockCountResponse>(RequestType.GetBlockCountRequest, {});

    const result: GetBlockCount = {
      blockCount: getBlockCountResponse.blockCount,
      headerCount: getBlockCountResponse.headerCount,
    };

    return this._buildResult(getBlockCountResponse.error, result);
  }

  /**
   * Get BlockDAG info
   */
  async getBlockDagInfo(): Promise<BaseResult<GetBlockDagInfo>> {
    const { getBlockDagInfoResponse } = await this._request<GetBlockDagInfoResponse>(RequestType.GetBlockDagInfoRequest, {});
    const { error, ...model } = getBlockDagInfoResponse;

    const result: GetBlockDagInfo = model;

    return this._buildResult(getBlockDagInfoResponse.error, result);
  }

  // ==================== MEMPOOL METHODS ====================

  /**
   * Get mempool entry for a specific transaction
   */
  async getMempoolEntry(txId: string, includeOrphanPool = true, filterTransactionPool = false): Promise<BaseResult<GetMempoolEntry>> {
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
  }

  /**
   * Get all mempool entries
   */
  async getMempoolEntries(includeOrphanPool = true, filterTransactionPool = false): Promise<BaseResult<GetMempoolEntries>> {
    const { getMempoolEntriesResponse } = await this._request<GetMempoolEntriesResponse>(RequestType.GetMempoolEntriesRequest, {
      includeOrphanPool,
      filterTransactionPool,
    });

    const result: GetMempoolEntries = {
      entries: getMempoolEntriesResponse.entries,
    };

    return this._buildResult(getMempoolEntriesResponse.error, result);
  }

  /**
   * Get UTXOs for multiple addresses
   */
  async getUtxosByAddresses(addresses: string[]): Promise<BaseResult<GetUtxosByAddresses>> {
    const { getUtxosByAddressesResponse } = await this._request<GetUtxosByAddressesResponse>(RequestType.GetUtxosByAddressesRequest, {
      addresses,
    });

    const result: GetUtxosByAddresses = {
      utxos: getUtxosByAddressesResponse.entries || [],
    };

    return this._buildResult(getUtxosByAddressesResponse.error, result);
  }

  /**
   * Get virtual selected parent blue score
   */
  async getVirtualSelectedParentBlueScore(): Promise<BaseResult<GetVirtualSelectedParentBlueScore>> {
    const { getVirtualSelectedParentBlueScoreResponse } = await this._request<GetVirtualSelectedParentBlueScoreResponse>(
      RequestType.GetVirtualSelectedParentBlueScoreRequest,
      {}
    );

    const result: GetVirtualSelectedParentBlueScore = {
      blueScore: getVirtualSelectedParentBlueScoreResponse.blueScore,
    };

    return this._buildResult(getVirtualSelectedParentBlueScoreResponse.error, result);
  }

  /**
   * Get node information - basic status and capabilities
   */
  async getInfo(): Promise<BaseResult<GetInfo>> {
    const { getInfoResponse } = await this._request<GetInfoResponse>(RequestType.GetInfoRequest, {});

    const result: GetInfo = {
      p2pId: getInfoResponse.p2pId,
      mempoolSize: getInfoResponse.mempoolSize,
      serverVersion: getInfoResponse.serverVersion,
      isUtxoIndexed: getInfoResponse.isUtxoIndexed,
      isSynced: getInfoResponse.isSynced,
    };

    return this._buildResult(getInfoResponse.error, result);
  }

  /**
   * Estimate network hashes per second (hashrate)
   */
  async estimateNetworkHashesPerSecond(windowSize = 1000, startHash?: string): Promise<BaseResult<EstimateNetworkHashesPerSecond>> {
    const params: any = { windowSize };
    if (startHash) {
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
  }

  /**
   * Get balance for a single address
   * Requires node to be started with --utxoindex flag
   */
  async getBalance(address: string): Promise<BaseResult<GetBalanceByAddress>> {
    const { getBalanceByAddressResponse } = await this._request<GetBalanceByAddressResponse>(RequestType.GetBalanceByAddressRequest, {
      address,
    });

    const result: GetBalanceByAddress = {
      balance: getBalanceByAddressResponse.balance,
    };

    return this._buildResult(getBalanceByAddressResponse.error, result);
  }

  /**
   * Get balances for multiple addresses
   * Requires node to be started with --utxoindex flag
   */
  async getBalances(addresses: string[]): Promise<BaseResult<GetBalancesByAddresses>> {
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
  }

  /**
   * Get mempool entries for specific addresses
   * Returns pending transactions involving these addresses
   */
  async getMempoolEntriesByAddresses(
    addresses: string[],
    includeOrphanPool = false,
    filterTransactionPool = false
  ): Promise<BaseResult<GetMempoolEntriesByAddresses>> {
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
  }

  // ==================== NETWORK INFO METHODS ====================

  /**
   * Get coin supply information
   * Returns circulating and maximum supply
   */
  async getCoinSupply(): Promise<BaseResult<GetCoinSupply>> {
    const { getCoinSupplyResponse } = await this._request<GetCoinSupplyResponse>(RequestType.GetCoinSupplyRequest, {});

    const result: GetCoinSupply = {
      circulatingSupply: getCoinSupplyResponse.circulatingSompi,
      maxSupply: getCoinSupplyResponse.maxSompi,
    };

    return this._buildResult(getCoinSupplyResponse.error, result);
  }

  /**
   * Submit a transaction to the mempool
   */
  async submitTransaction(transaction: Transaction, allowOrphan = false): Promise<BaseResult<SubmitTransaction>> {
    const { submitTransactionResponse } = await this._request<SubmitTransactionResponse>(RequestType.SubmitTransactionRequest, {
      transaction,
      allowOrphan,
    });

    const result: SubmitTransaction = {
      transactionId: submitTransactionResponse.transactionId,
    };

    return this._buildResult(submitTransactionResponse.error, result);
  }

  // ==================== STREAMING METHODS ====================

  /**
   * Subscribe to UTXO changes for specific addresses
   */
  async subscribeToUtxoChanges(addresses: string[]): Promise<void> {
    return this._streamingManager!.subscribeToUtxoChanges(addresses);
  }

  /**
   * Unsubscribe from UTXO changes
   */
  async unsubscribeFromUtxoChanges(addresses?: string[]): Promise<void> {
    return this._streamingManager!.unsubscribeFromUtxoChanges(addresses);
  }

  /**
   * Check if streaming is connected
   */
  isStreamingConnected(): boolean {
    return this._streamingManager!.isConnected();
  }

  /**
   * Get subscribed addresses
   */
  getSubscribedAddresses(): string[] {
    return this._streamingManager!.getSubscribedAddresses();
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this._streamingManager!.disconnect();
    this.removeAllListeners();
  }

  /**
   * Test method for debugging
   */
  async test() {
    try {
      return await this._request(RequestType.Test, {});
    } catch (error) {
      console.error('Test error:', error);
    }
  }
}

export default HoosatNode;
