import { BaseService } from '@core/base.service';
import { RequestType } from '@enums/request-type.enum';
import { BaseResult } from '@models/result/base.result';
import { buildResult } from '@helpers/build-result.helper';
import { GetMempoolEntry } from '@models/result/get-mempool-entry.result';
import { GetMempoolEntryResponse } from '@models/response/get-mempool-entry.response';
import { validateAddresses, validateTransactionId } from '@helpers/validation.helper';
import { GetMempoolEntries } from '@models/result/get-mempool-entries.result';
import { GetMempoolEntriesResponse } from '@models/response/get-mempool-entries.response';
import { GetMempoolEntriesByAddresses } from '@models/result/get-mempool-entries-by-addresses.result';
import { GetMempoolEntriesByAddressesResponse } from '@models/response/get-mempool-entries-by-addresses.response';

export class MempoolService extends BaseService {
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

      return buildResult(getMempoolEntriesByAddressesResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get mempool entries by addresses: ${error}` }, {} as GetMempoolEntriesByAddresses);
    }
  }
}
