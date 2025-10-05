import { BaseService } from '@core/base.service';
import { RequestType } from '@enums/request-type.enum';
import { BaseResult } from '@models/result/base.result';
import { buildResult } from '@helpers/build-result.helper';
import { GetUtxosByAddresses } from '@models/result/get-utxos-by-addresses.result';
import { GetUtxosByAddressesResponse } from '@models/response/get-utxos-by-addresses.response';
import { validateAddresses } from '@helpers/validation.helper';
import { GetBalanceByAddress } from '@models/result/get-balance-by-address.result';
import { GetBalanceByAddressResponse } from '@models/response/get-balance-by-address.response';
import { GetBalancesByAddresses } from '@models/result/get-balances-by-addresses.result';
import { GetBalancesByAddressesResponse } from '@models/response/get-balances-by-addresses.response';
import { HoosatUtils } from '@utils/utils';

export class AddressService extends BaseService {
  async getUtxosByAddresses(addresses: string[]): Promise<BaseResult<GetUtxosByAddresses>> {
    try {
      validateAddresses(addresses);

      const { getUtxosByAddressesResponse } = await this._request<GetUtxosByAddressesResponse>(RequestType.GetUtxosByAddressesRequest, {
        addresses,
      });

      const result: GetUtxosByAddresses = {
        utxos: getUtxosByAddressesResponse.entries || [],
      };

      return buildResult(getUtxosByAddressesResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get UTXOs by addresses: ${error}` }, {} as GetUtxosByAddresses);
    }
  }

  async getBalance(address: string): Promise<BaseResult<GetBalanceByAddress>> {
    try {
      if (!HoosatUtils.isValidAddress(address)) {
        throw new Error('Invalid Hoosat address format');
      }

      const { getBalanceByAddressResponse } = await this._request<GetBalanceByAddressResponse>(RequestType.GetBalanceByAddressRequest, {
        address,
      });

      const result: GetBalanceByAddress = {
        balance: getBalanceByAddressResponse.balance,
      };

      return buildResult(getBalanceByAddressResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get balance: ${error}` }, {} as GetBalanceByAddress);
    }
  }

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

      return buildResult(getBalancesByAddressesResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get balances: ${error}` }, {} as GetBalancesByAddresses);
    }
  }
}
