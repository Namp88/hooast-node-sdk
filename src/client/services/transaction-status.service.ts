import { BaseService } from '@client/services/base.service';
import { BaseResult } from '@models/base.result';
import { buildResult } from '@helpers/build-result.helper';
import { GetTransactionStatus } from '@client/models/result/get-transaction-status';
import { MempoolService } from '@client/services/mempool.service';
import { AddressService } from '@client/services/address.service';
import { HoosatUtils } from '@utils/utils';

/**
 * Service for checking transaction status
 */
export class TransactionStatusService extends BaseService {
  private _mempoolService: MempoolService;
  private _addressService: AddressService;

  constructor(client: any, timeout: number, mempoolService: MempoolService, addressService: AddressService) {
    super(client, timeout);
    this._mempoolService = mempoolService;
    this._addressService = addressService;
  }

  /**
   * Gets the status of a transaction
   *
   * @param txId - Transaction ID to check
   * @param senderAddress - Sender address (for additional verification)
   * @param recipientAddress - Recipient address (required for CONFIRMED status detection)
   * @returns Promise with transaction status (PENDING, CONFIRMED, or NOT_FOUND)
   *
   * @example
   * ```typescript
   * const status = await client.getTransactionStatus(
   *   'a1b2c3d4...',
   *   'hoosat:sender123...',
   *   'hoosat:recipient456...'
   * );
   *
   * if (status.ok) {
   *   console.log('Status:', status.result.status);
   *   console.log('Details:', status.result.details);
   * }
   * ```
   */
  async getTransactionStatus(
    txId: string,
    senderAddress: string,
    recipientAddress: string
  ): Promise<BaseResult<GetTransactionStatus>> {
    try {
      // Validate inputs
      if (!HoosatUtils.isValidTransactionId(txId)) {
        throw new Error('TransactionId must be a valid Hoosat transaction ID');
      }

      if (!HoosatUtils.isValidAddress(senderAddress)) {
        throw new Error('Sender address must be a valid Hoosat address');
      }

      if (!HoosatUtils.isValidAddress(recipientAddress)) {
        throw new Error('Recipient address must be a valid Hoosat address');
      }

      // Step 1: Check mempool (PENDING status)
      const mempoolEntry = await this._mempoolService.getMempoolEntry(txId, true, false);

      if (mempoolEntry.ok && mempoolEntry.result && mempoolEntry.result.transaction) {
        const result: GetTransactionStatus = {
          status: 'PENDING',
          details: {
            txId,
            inMempool: true,
            isOrphan: mempoolEntry.result.isOrphan,
            fee: mempoolEntry.result.fee || undefined,
            mass: mempoolEntry.result.mass || undefined,
            message: mempoolEntry.result.isOrphan
              ? 'Transaction is in mempool (orphan pool - missing inputs)'
              : 'Transaction is in mempool, waiting for confirmation',
          },
        };

        return buildResult(null, result);
      }

      // Step 2: Check recipient address UTXOs (CONFIRMED status)
      const recipientUtxos = await this._addressService.getUtxosByAddresses([recipientAddress]);

      if (recipientUtxos.ok && recipientUtxos.result && recipientUtxos.result.utxos) {
        const confirmedUtxo = recipientUtxos.result.utxos.find((utxo) => utxo.outpoint.transactionId === txId);

        if (confirmedUtxo) {
          const result: GetTransactionStatus = {
            status: 'CONFIRMED',
            details: {
              txId,
              inMempool: false,
              blockDaaScore: confirmedUtxo.utxoEntry.blockDaaScore,
              confirmedAmount: confirmedUtxo.utxoEntry.amount,
              confirmedAddress: confirmedUtxo.address,
              isCoinbase: confirmedUtxo.utxoEntry.isCoinbase,
              message: 'Transaction confirmed in blockchain',
            },
          };

          return buildResult(null, result);
        }
      }

      // Step 3: Check sender address UTXOs for change output (additional CONFIRMED verification)
      const senderUtxos = await this._addressService.getUtxosByAddresses([senderAddress]);

      if (senderUtxos.ok && senderUtxos.result && senderUtxos.result.utxos) {
        const changeUtxo = senderUtxos.result.utxos.find((utxo) => utxo.outpoint.transactionId === txId);

        if (changeUtxo) {
          const result: GetTransactionStatus = {
            status: 'CONFIRMED',
            details: {
              txId,
              inMempool: false,
              blockDaaScore: changeUtxo.utxoEntry.blockDaaScore,
              confirmedAmount: changeUtxo.utxoEntry.amount,
              confirmedAddress: changeUtxo.address,
              isCoinbase: changeUtxo.utxoEntry.isCoinbase,
              message: 'Transaction confirmed (found change output)',
            },
          };

          return buildResult(null, result);
        }
      }

      // Step 4: Transaction not found
      const result: GetTransactionStatus = {
        status: 'NOT_FOUND',
        details: {
          txId,
          inMempool: false,
          message:
            'Transaction not found in mempool or UTXOs. ' +
            'Possible reasons: transaction was rejected, UTXOs already spent, or node does not have UTXO index enabled (--utxoindex flag)',
        },
      };

      return buildResult(null, result);
    } catch (error) {
      return buildResult(
        { message: `Failed to get transaction status: ${error}` },
        {
          status: 'NOT_FOUND',
          details: {
            txId,
            message: `Error occurred: ${error}`,
          },
        } as GetTransactionStatus
      );
    }
  }
}
