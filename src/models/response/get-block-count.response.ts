import { ErrorResponse } from '@models/response/error.response';

export interface GetBlockCountResponse {
  getBlockCountResponse: {
    blockCount: string;
    headerCount: string;
    error: ErrorResponse;
  };
  payload: 'getBlockCountResponse';
}
