import { BaseService } from '@client/services/base.service';
import { RequestType } from '@enums/request-type.enum';
import { BaseResult } from '@models/base.result';
import { buildResult } from '@helpers/build-result.helper';
import { GetMempoolEntry } from '@client/models/result/get-mempool-entry';
import { GetMempoolEntryResponse } from '@client/models/response/get-mempool-entry.response';
import { GetMempoolEntries } from '@client/models/result/get-mempool-entries';
import { GetMempoolEntriesResponse } from '@client/models/response/get-mempool-entries.response';
import { GetMempoolEntriesByAddresses } from '@client/models/result/get-mempool-entries-by-addresses';
import { GetMempoolEntriesByAddressesResponse } from '@client/models/response/get-mempool-entries-by-addresses.response';
import { HoosatUtils } from '@utils/utils';

export class MempoolService extends BaseService {
  async getMempoolEntry(txId: string, includeOrphanPool = true, filterTransactionPool = false): Promise<BaseResult<GetMempoolEntry>> {
    try {
      if (!HoosatUtils.isValidTransactionId(txId)) {
        throw new Error('TransactionId must be a valid Hoosat.');
      }

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

      return buildResult(getMempoolEntryResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get mempool entry: ${error}` }, {} as GetMempoolEntry);
    }
  }

  async getMempoolEntries(includeOrphanPool = true, filterTransactionPool = false): Promise<BaseResult<GetMempoolEntries>> {
    try {
      const { getMempoolEntriesResponse } = await this._request<GetMempoolEntriesResponse>(RequestType.GetMempoolEntriesRequest, {
        includeOrphanPool,
        filterTransactionPool,
      });

      const result: GetMempoolEntries = {
        entries: getMempoolEntriesResponse.entries,
      };

      return buildResult(getMempoolEntriesResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get mempool entries: ${error}` }, {} as GetMempoolEntries);
    }
  }

  async getMempoolEntriesByAddresses(
    addresses: string[],
    includeOrphanPool = false,
    filterTransactionPool = false
  ): Promise<BaseResult<GetMempoolEntriesByAddresses>> {
    try {
      if (!HoosatUtils.isValidAddresses(addresses)) {
        throw new Error('Some of addresses has invalid format');
      }

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

      return buildResult(getMempoolEntriesByAddressesResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get mempool entries by addresses: ${error}` }, {} as GetMempoolEntriesByAddresses);
    }
  }
}
