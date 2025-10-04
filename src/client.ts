import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';
import { NodeConfig } from './types';
import { GetCurrentNetworkResponse } from '@models/response/get-current-network.response';
import { RequestType } from '@enums/request-type.enum';
import { GetPeerAddressesResponse } from '@models/response/get-peer-addresses.response';
import { GetSelectedTipHashResponse } from '@models/response/get-selected-tip-hash.response';
import { GetMempoolEntryResponse } from '@models/response/get-mempool-entry.response';
import { GetConnectedPeerInfoResponse } from '@models/response/get-connected-peer-info.response';
import { GetConnectedPeerInfo } from '@models/result/get-connected-peer-info.result';
import { GetCurrentNetwork } from '@models/result/get-current-network.response';
import { GetMempoolEntry } from '@models/result/get-mempool-entry.result';
import { GetPeerAddresses, GetPeerAddressItem } from '@models/result/get-peer-addresses.result';
import { GetSelectedTipHash } from '@models/result/get-selected-tip-hash.result';
import { ErrorResponse } from '@models/response/error.response';
import { BaseResult } from '@models/result/base.result';

class HoosatNode {
  private client: any;
  private readonly host: string;
  private readonly port: number;
  private readonly timeout: number;

  constructor(config: NodeConfig = {}) {
    this.host = config.host || '127.0.0.1';
    this.port = config.port || 42420;
    this.timeout = config.timeout || 10000;

    this._initializeClient();
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

      this.client = new protowire.RPC(`${this.host}:${this.port}`, grpc.credentials.createInsecure(), {
        'grpc.max_send_message_length': 1024 * 1024 * 1024,
        'grpc.max_receive_message_length': 1024 * 1024 * 1024,
      });
    } catch (error) {
      throw new Error(`Failed to initialize gRPC client: ${error}`);
    }
  }

  private async _request<T = any>(command: RequestType, params: any = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request ${command} timed out after ${this.timeout}ms`));
      }, this.timeout);

      try {
        const call = this.client.MessageStream();
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

  async test() {
    try {
      return await this._request(RequestType.Test, {});
    } catch (error) {
      console.error('error', error);
    }
  }

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
   * Get current network
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
   * Get mempool entry for a specific transaction
   * Returns fee and orphan status information
   */
  async getMempoolEntry(txId: string): Promise<BaseResult<GetMempoolEntry>> {
    const { getMempoolEntryResponse } = await this._request<GetMempoolEntryResponse>(RequestType.GetMempoolEntryRequest, {
      txId,
      includeOrphanPool: true,
      filterTransactionPool: false,
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
   * Get connected peer info
   */
  async getConnectedPeerInfo(): Promise<BaseResult<GetConnectedPeerInfo>> {
    const { getConnectedPeerInfoResponse } = await this._request<GetConnectedPeerInfoResponse>(RequestType.GetConnectedPeerInfoRequest, {});

    const result: GetConnectedPeerInfo = {
      peers: getConnectedPeerInfoResponse.infos,
    };

    return this._buildResult(getConnectedPeerInfoResponse.error, result);
  }

  private _buildResult<T>(error: ErrorResponse, model: T): BaseResult<T> {
    const extractedError = error ? error.message : null;

    return {
      ok: !Boolean(extractedError),
      result: Boolean(extractedError) ? null : model,
      error: extractedError,
    };
  }

  /**
   * Get node information
   */
  // async getInfo(): Promise<NodeInfo> {
  //   const response = await this._request('getInfoRequest', {});
  //   return response.getInfoResponse;
  // }

  /**
   * Get BlockDAG information
   */
  // async getBlockDagInfo(): Promise<BlockDagInfo> {
  //   const response = await this._request('getBlockDagInfoRequest', {});
  //   return response.getBlockDagInfoResponse;
  // }

  /**
   * Get balance for an address
   */
  // async getBalance(address: string, formatAmount = false): Promise<Balance> {
  //   const response = await this._request('getBalanceByAddressRequest', {
  //     address,
  //   });
  //
  //   const balance = formatAmount
  //     ? HoosatUtils.formatAmount(response.getBalanceByAddressResponse.balance)
  //     : response.getBalanceByAddressResponse.balance;
  //
  //   return {
  //     address,
  //     balance,
  //   };
  // }

  /**
   * Get UTXOs for addresses
   */
  // async getUtxos(addresses: string[]): Promise<UTXO[]> {
  //   const response = await this._request('getUtxosByAddressesRequest', {
  //     addresses,
  //   });
  //
  //   return response.getUtxosByAddressesResponse.entries || [];
  // }

  /**
   * Get UTXOs grouped by address
   */
  // async getUtxosByAddresses(addresses: string[]): Promise<UtxosByAddress> {
  //   const allUtxos = await this.getUtxos(addresses);
  //
  //   const grouped: UtxosByAddress = {};
  //
  //   addresses.forEach(addr => {
  //     grouped[addr] = [];
  //   });
  //
  //   allUtxos.forEach(utxo => {
  //     if (grouped[utxo.address]) {
  //       const { address, ...utxoData } = utxo;
  //       grouped[utxo.address].push(utxoData);
  //     }
  //   });
  //
  //   return grouped;
  // }

  /**
   * Get block by hash
   */
  // async getBlock(blockHash: string, includeTransactions = true): Promise<Block> {
  //   const response = await this._request('getBlockRequest', {
  //     hash: blockHash,
  //     includeTransactions,
  //   });
  //
  //   return response.getBlockResponse.block;
  // }

  /**
   * Get multiple blocks by hashes
   */
  // async getBlocks(blockHashes: string[], includeTransactions = true): Promise<Block[]> {
  //   const blocks: Block[] = [];
  //
  //   for (const hash of blockHashes) {
  //     try {
  //       const block = await this.getBlock(hash, includeTransactions);
  //       blocks.push(block);
  //     } catch (error) {
  //       // Skip blocks that failed to fetch
  //       console.warn(`Failed to fetch block ${hash}:`, error);
  //     }
  //   }
  //
  //   return blocks;
  // }

  /**
   * Get current virtual selected parent blue score
   */
  // async getVirtualSelectedParentBlueScore(): Promise<string> {
  //   const response = await this._request('getVirtualSelectedParentBlueScoreRequest', {});
  //   return response.getVirtualSelectedParentBlueScoreResponse.blueScore;
  // }

  /**
   * Get coin supply information
   */
  // async getCoinSupply(): Promise<{ circulatingSupply: string; maxSupply: string }> {
  //   const response = await this._request('getCoinSupplyRequest', {});
  //   return {
  //     circulatingSupply: response.getCoinSupplyResponse.circulatingSompi || '0',
  //     maxSupply: response.getCoinSupplyResponse.maxSompi || '0',
  //   };
  // }

  /**
   * Get selected tip hash (best block)
   */
  // async getSelectedTipHash(): Promise<string> {
  //   const blockdag = await this.getBlockDagInfo();
  //   return blockdag.tipHashes[0] || '';
  // }

  /**
   * Estimate network hashes per second
   */
  // async estimateNetworkHashesPerSecond(startHash?: string, windowSize = 1000): Promise<string> {
  //   const response = await this._request('estimateNetworkHashesPerSecondRequest', {
  //     startHash,
  //     windowSize,
  //   });
  //   return response.estimateNetworkHashesPerSecondResponse.networkHashesPerSecond || '0';
  // }

  /**
   * Get connected peer info
   */
  // async getConnectedPeerInfo(): Promise<any[]> {
  //   const response = await this._request('getConnectedPeerInfoRequest', {});
  //   return response.getConnectedPeerInfoResponse.infos || [];
  // }

  /**
   * Get block count
   */
  // async getBlockCount(): Promise<string> {
  //   const blockdag = await this.getBlockDagInfo();
  //   return blockdag.blockCount;
  // }

  /**
   * Get header count
   */
  // async getHeaderCount(): Promise<string> {
  //   const blockdag = await this.getBlockDagInfo();
  //   return blockdag.headerCount;
  // }
}

export default HoosatNode;
