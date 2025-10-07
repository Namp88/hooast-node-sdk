import { GetBlock } from '@client/models/result/get-block';

export interface GetBlocks {
  blocks: GetBlock[];
  blockHashes: string[];
}
