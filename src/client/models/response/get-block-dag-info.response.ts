import { ErrorResponse } from '@client/models/response/error.response';

export interface GetBlockDagInfoResponse {
  getBlockDagInfoResponse: {
    tipHashes: string[];
    virtualParentHashes: string[];
    networkName: string;
    blockCount: string;
    headerCount: string;
    difficulty: number;
    pastMedianTime: string;
    pruningPointHash: string;
    virtualDaaScore: string;
    error: ErrorResponse;
  };
  payload: 'getBlockDagInfoResponse';
}
