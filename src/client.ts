import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { join } from 'path';
import type { NodeConfig, NodeInfo, BlockDagInfo, Balance, UTXO, Transaction, Block } from './types';

export class HoosatNode {
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

  private async _request(command: string, params: any = {}): Promise<any> {
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

  /**
   * Get node information
   */
  async getInfo(): Promise<NodeInfo> {
    const response = await this._request('getInfoRequest', {});
    return response.getInfoResponse;
  }

  /**
   * Get BlockDAG information
   */
  async getBlockDagInfo(): Promise<BlockDagInfo> {
    const response = await this._request('getBlockDagInfoRequest', {});
    return response.getBlockDagInfoResponse;
  }

  /**
   * Get balance for an address
   */
  async getBalance(address: string): Promise<Balance> {
    const response = await this._request('getBalanceByAddressRequest', {
      address,
    });
    return {
      address,
      balance: response.getBalanceByAddressResponse.balance,
    };
  }

  /**
   * Get UTXOs for addresses
   */
  async getUtxos(addresses: string[]): Promise<UTXO[]> {
    const response = await this._request('getUtxosByAddressesRequest', {
      addresses,
    });
    return response.getUtxosByAddressesResponse.entries || [];
  }

  /**
   * Get block by hash
   */
  async getBlock(blockHash: string, includeTransactions = true): Promise<Block> {
    const response = await this._request('getBlockRequest', {
      hash: blockHash,
      includeTransactions,
    });
    return response.getBlockResponse.block;
  }

  /**
   * Get transaction by ID
   */
  async getTransaction(txId: string): Promise<Transaction> {
    const response = await this._request('getTransactionRequest', {
      transactionId: txId,
      includeOrphanPool: true,
    });
    return response.getTransactionResponse.transaction;
  }

  /**
   * Submit a transaction to the network
   */
  async submitTransaction(transaction: Transaction): Promise<string> {
    const response = await this._request('submitTransactionRequest', {
      transaction,
    });
    return response.submitTransactionResponse.transactionId;
  }

  /**
   * Get current virtual selected parent blue score
   */
  async getVirtualSelectedParentBlueScore(): Promise<string> {
    const response = await this._request('getVirtualSelectedParentBlueScoreRequest', {});
    return response.getVirtualSelectedParentBlueScoreResponse.blueScore;
  }

  /**
   * Get multiple blocks by hashes
   */
  async getBlocks(blockHashes: string[], includeTransactions = true): Promise<Block[]> {
    const response = await this._request('getBlocksRequest', {
      lowHash: '',
      includeBlocks: true,
      includeTransactions,
    });
    return response.getBlocksResponse.blocks || [];
  }

  /**
   * Get transactions for an address
   */
  async getTransactionsByAddress(address: string, startingBlockHash?: string): Promise<Transaction[]> {
    const utxos = await this.getUtxos([address]);
    const txIds = new Set<string>();

    utxos.forEach(utxo => {
      txIds.add(utxo.outpoint.transactionId);
    });

    const transactions: Transaction[] = [];
    for (const txId of txIds) {
      try {
        const tx = await this.getTransaction(txId);
        transactions.push(tx);
      } catch (error) {
        // Skip failed transactions
      }
    }

    return transactions;
  }

  /**
   * Get mempool entries
   */
  async getMempoolEntries(includeOrphanPool = true): Promise<any> {
    const response = await this._request('getMempoolEntriesRequest', {
      includeOrphanPool,
      filterTransactionPool: true,
    });
    return response.getMempoolEntriesResponse.entries || [];
  }

  /**
   * Get coin supply information
   */
  async getCoinSupply(): Promise<{ circulatingSupply: string; maxSupply: string }> {
    const response = await this._request('getCoinSupplyRequest', {});
    return {
      circulatingSupply: response.getCoinSupplyResponse.circulatingSompi || '0',
      maxSupply: response.getCoinSupplyResponse.maxSompi || '0',
    };
  }

  /**
   * Get selected tip hash (best block)
   */
  async getSelectedTipHash(): Promise<string> {
    const blockdag = await this.getBlockDagInfo();
    return blockdag.tipHashes[0] || '';
  }

  /**
   * Resolve finality conflict
   */
  async resolveFinalityConflict(finalityBlockHash: string): Promise<any> {
    const response = await this._request('resolveFinalityConflictRequest', {
      finalityBlockHash,
    });
    return response.resolveFinalityConflictResponse;
  }

  /**
   * Estimate network hashes per second
   */
  async estimateNetworkHashesPerSecond(startHash?: string, windowSize = 1000): Promise<string> {
    const response = await this._request('estimateNetworkHashesPerSecondRequest', {
      startHash,
      windowSize,
    });
    return response.estimateNetworkHashesPerSecondResponse.networkHashesPerSecond || '0';
  }

  /**
   * Get connected peer info
   */
  async getConnectedPeerInfo(): Promise<any[]> {
    const response = await this._request('getConnectedPeerInfoRequest', {});
    return response.getConnectedPeerInfoResponse.infos || [];
  }

  /**
   * Get block count
   */
  async getBlockCount(): Promise<string> {
    const blockdag = await this.getBlockDagInfo();
    return blockdag.blockCount;
  }

  /**
   * Get header count
   */
  async getHeaderCount(): Promise<string> {
    const blockdag = await this.getBlockDagInfo();
    return blockdag.headerCount;
  }

  /**
   * Utility: Check if address is valid
   */
  isValidAddress(address: string): boolean {
    return address.startsWith('hoosat:') && address.length > 10;
  }

  /**
   * Utility: Format sompi to HTN
   */
  formatAmount(sompi: string | bigint): string {
    const amount = typeof sompi === 'string' ? BigInt(sompi) : sompi;
    return (Number(amount) / 100000000).toFixed(8);
  }

  /**
   * Utility: Parse HTN to sompi
   */
  parseAmount(hoo: string): string {
    const amount = parseFloat(hoo) * 100000000;
    return BigInt(Math.floor(amount)).toString();
  }
}
