import { GetBlock } from '@models/result/get-block.result';

export interface GetBlocks {
  blocks: GetBlock[];
  blockHashes: string[];
}
