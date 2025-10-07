import { BaseService } from '@client/services/base.service';
import { RequestType } from '@enums/request-type.enum';
import { BaseResult } from '@models/base.result';
import { buildResult } from '@helpers/build-result.helper';
import { GetSelectedTipHashResponse } from '@client/models/response/get-selected-tip-hash.response';
import { GetBlockResponse } from '@client/models/response/get-block.response';
import { GetSelectedTipHash } from '@client/models/result/get-selected-tip-hash';
import { GetBlock } from '@client/models/result/get-block';
import { GetBlocks } from '@client/models/result/get-blocks';
import { GetBlocksResponse } from '@client/models/response/get-blocks.response';
import { GetBlockCount } from '@client/models/result/get-block-count';
import { GetBlockCountResponse } from '@client/models/response/get-block-count.response';
import { GetBlockDagInfo } from '@client/models/result/get-block-dag-info';
import { GetBlockDagInfoResponse } from '@client/models/response/get-block-dag-info.response';
import { HoosatUtils } from '@utils/utils';

export class BlockchainService extends BaseService {
  async getSelectedTipHash(): Promise<BaseResult<GetSelectedTipHash>> {
    try {
      const { getSelectedTipHashResponse } = await this._request<GetSelectedTipHashResponse>(RequestType.GetSelectedTipHashRequest, {});

      const result: GetSelectedTipHash = {
        selectedTipHash: getSelectedTipHashResponse.selectedTipHash,
      };

      return buildResult(getSelectedTipHashResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get selected tip hash: ${error}` }, {} as GetSelectedTipHash);
    }
  }

  async getBlock(blockHash: string, includeTransactions = true): Promise<BaseResult<GetBlock>> {
    try {
      if (!HoosatUtils.isValidBlockHash(blockHash)) {
        throw new Error('Invalid block hash');
      }

      const { getBlockResponse } = await this._request<GetBlockResponse>(RequestType.GetBlockRequest, {
        hash: blockHash,
        includeTransactions,
      });

      const result: GetBlock = getBlockResponse.block;

      return buildResult(getBlockResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get block: ${error}` }, {} as GetBlock);
    }
  }

  async getBlocks(lowHash: string, includeTransactions = false): Promise<BaseResult<GetBlocks>> {
    try {
      if (!HoosatUtils.isValidBlockHash(lowHash)) {
        throw new Error('Invalid block hash');
      }

      const { getBlocksResponse } = await this._request<GetBlocksResponse>(RequestType.GetBlocksRequest, {
        lowHash,
        includeBlocks: true,
        includeTransactions,
      });

      const result: GetBlocks = {
        blocks: getBlocksResponse.blocks,
        blockHashes: getBlocksResponse.blockHashes,
      };

      return buildResult(getBlocksResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get blocks: ${error}` }, {} as GetBlocks);
    }
  }

  async getBlockCount(): Promise<BaseResult<GetBlockCount>> {
    try {
      const { getBlockCountResponse } = await this._request<GetBlockCountResponse>(RequestType.GetBlockCountRequest, {});

      const result: GetBlockCount = {
        blockCount: getBlockCountResponse.blockCount,
        headerCount: getBlockCountResponse.headerCount,
      };

      return buildResult(getBlockCountResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get block count: ${error}` }, {} as GetBlockCount);
    }
  }

  async getBlockDagInfo(): Promise<BaseResult<GetBlockDagInfo>> {
    try {
      const { getBlockDagInfoResponse } = await this._request<GetBlockDagInfoResponse>(RequestType.GetBlockDagInfoRequest, {});
      const { error, ...model } = getBlockDagInfoResponse;

      const result: GetBlockDagInfo = model;

      return buildResult(getBlockDagInfoResponse.error, result);
    } catch (error) {
      return buildResult({ message: `Failed to get block DAG info: ${error}` }, {} as GetBlockDagInfo);
    }
  }
}
