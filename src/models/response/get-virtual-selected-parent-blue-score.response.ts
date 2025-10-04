import { ErrorResponse } from '@models/response/error.response';

export interface GetVirtualSelectedParentBlueScoreResponse {
  getVirtualSelectedParentBlueScoreResponse: {
    blueScore: string;
    error: ErrorResponse;
  };
  payload: 'getVirtualSelectedParentBlueScoreResponse';
}
