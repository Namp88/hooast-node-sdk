import { ErrorResponse } from '@client/models/response/error.response';

export interface GetInfoResponse {
  getInfoResponse: {
    p2pId: string;
    mempoolSize: string;
    serverVersion: string;
    isUtxoIndexed: boolean;
    isSynced: boolean;
    error: ErrorResponse;
  };
  payload: 'getInfoResponse';
}
