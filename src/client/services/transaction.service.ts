import { BaseService } from '@client/services/base.service';
import { Transaction } from '@models/transaction.types';
import { BaseResult } from '@models/base.result';
import { SubmitTransaction } from '@client/models/result/submit-transaction';
import { SubmitTransactionResponse } from '@client/models/response/submit-transaction.response';
import { RequestType } from '@enums/request-type.enum';
import { buildResult } from '@helpers/build-result.helper';

export class TransactionService extends BaseService {
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

      return buildResult(submitTransactionResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to submit transaction: ${error}` }, {} as SubmitTransaction);
    }
  }
}
