import { BaseService } from '@client/services/base.service';
import { RequestType } from '@enums/request-type.enum';
import { BaseResult } from '@models/result/base.result';
import { buildResult } from '@helpers/build-result.helper';

import { GetCurrentNetworkResponse } from '@models/response/get-current-network.response';
import { GetPeerAddressesResponse } from '@models/response/get-peer-addresses.response';
import { GetConnectedPeerInfoResponse } from '@models/response/get-connected-peer-info.response';

import { GetCurrentNetwork } from '@models/result/get-current-network.result';
import { GetPeerAddresses, GetPeerAddressItem } from '@models/result/get-peer-addresses.result';
import { GetConnectedPeerInfo } from '@models/result/get-connected-peer-info.result';

export class NetworkService extends BaseService {
  async getCurrentNetwork(): Promise<BaseResult<GetCurrentNetwork>> {
    try {
      const { getCurrentNetworkResponse } = await this._request<GetCurrentNetworkResponse>(RequestType.GetCurrentNetworkRequest, {});

      const result: GetCurrentNetwork = {
        currentNetwork: getCurrentNetworkResponse.currentNetwork,
      };

      return buildResult(getCurrentNetworkResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get current network: ${error}` }, {} as GetCurrentNetwork);
    }
  }

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

      return buildResult(getPeerAddressesResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get peer addresses: ${error}` }, {} as GetPeerAddresses);
    }
  }

  async getConnectedPeerInfo(): Promise<BaseResult<GetConnectedPeerInfo>> {
    try {
      const { getConnectedPeerInfoResponse } = await this._request<GetConnectedPeerInfoResponse>(
        RequestType.GetConnectedPeerInfoRequest,
        {}
      );

      const result: GetConnectedPeerInfo = {
        peers: getConnectedPeerInfoResponse.infos,
      };

      return buildResult(getConnectedPeerInfoResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get connected peer info: ${error}` }, {} as GetConnectedPeerInfo);
    }
  }
}
