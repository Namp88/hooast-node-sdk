import { ErrorResponse } from '@client/models/response/error.response';

export interface GetBlockCountResponse {
  getBlockCountResponse: {
    blockCount: string;
    headerCount: string;
    error: ErrorResponse;
  };
  payload: 'getBlockCountResponse';
}
