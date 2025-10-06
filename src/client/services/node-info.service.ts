import { BaseService } from '@client/services/base.service';
import { BaseResult } from '@models/result/base.result';
import { GetInfo } from '@models/result/get-info.result';
import { GetInfoResponse } from '@models/response/get-info.response';
import { RequestType } from '@enums/request-type.enum';
import { buildResult } from '@helpers/build-result.helper';
import { GetVirtualSelectedParentBlueScore } from '@models/result/get-virtual-selected-parent-blue-score.result';
import { GetVirtualSelectedParentBlueScoreResponse } from '@models/response/get-virtual-selected-parent-blue-score.response';
import { EstimateNetworkHashesPerSecond } from '@models/result/estimate-network-hashes-per-second.result';
import { EstimateNetworkHashesPerSecondResponse } from '@models/response/estimate-network-hashes-per-second.response';
import { GetCoinSupply } from '@models/result/get-coin-supply.result';
import { GetCoinSupplyResponse } from '@models/response/get-coin-supply.response';
import { VALIDATION_PARAMS } from '@constants/validation-params.const';
import { HoosatUtils } from '@utils/utils';

export class NodeInfoService extends BaseService {
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

      return buildResult(getInfoResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get node info: ${error}` }, {} as GetInfo);
    }
  }

  async getVirtualSelectedParentBlueScore(): Promise<BaseResult<GetVirtualSelectedParentBlueScore>> {
    try {
      const { getVirtualSelectedParentBlueScoreResponse } = await this._request<GetVirtualSelectedParentBlueScoreResponse>(
        RequestType.GetVirtualSelectedParentBlueScoreRequest,
        {}
      );

      const result: GetVirtualSelectedParentBlueScore = {
        blueScore: getVirtualSelectedParentBlueScoreResponse.blueScore,
      };

      return buildResult(getVirtualSelectedParentBlueScoreResponse.error, result);
    } catch (error) {
      return buildResult(
        { message: `Failed to get virtual selected parent blue score: ${error}` },
        {} as GetVirtualSelectedParentBlueScore
      );
    }
  }

  async estimateNetworkHashesPerSecond(windowSize = 1000, startHash?: string): Promise<BaseResult<EstimateNetworkHashesPerSecond>> {
    try {
      this._validateWindowSize(windowSize);

      const params: any = { windowSize };

      if (startHash) {
        if (!HoosatUtils.isValidBlockHash(startHash)) {
          throw new Error('Invalid block hash');
        }

        params.startHash = startHash;
      }

      const { estimateNetworkHashesPerSecondResponse } = await this._request<EstimateNetworkHashesPerSecondResponse>(
        RequestType.EstimateNetworkHashesPerSecondRequest,
        params
      );

      const result: EstimateNetworkHashesPerSecond = {
        networkHashesPerSecond: estimateNetworkHashesPerSecondResponse.networkHashesPerSecond,
      };

      return buildResult(estimateNetworkHashesPerSecondResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to estimate network hashes per second: ${error}` }, {} as EstimateNetworkHashesPerSecond);
    }
  }

  async getCoinSupply(): Promise<BaseResult<GetCoinSupply>> {
    try {
      const { getCoinSupplyResponse } = await this._request<GetCoinSupplyResponse>(RequestType.GetCoinSupplyRequest, {});

      const result: GetCoinSupply = {
        circulatingSupply: getCoinSupplyResponse.circulatingSompi,
        maxSupply: getCoinSupplyResponse.maxSompi,
      };

      return buildResult(getCoinSupplyResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get coin supply: ${error}` }, {} as GetCoinSupply);
    }
  }

  private _validateWindowSize(windowSize: number): void {
    if (!Number.isInteger(windowSize) || windowSize < VALIDATION_PARAMS.MIN_WINDOW_SIZE || windowSize > VALIDATION_PARAMS.MAX_WINDOW_SIZE) {
      throw new Error(
        `Window size must be an integer between ${VALIDATION_PARAMS.MIN_WINDOW_SIZE} and ${VALIDATION_PARAMS.MAX_WINDOW_SIZE}`
      );
    }
  }
}
