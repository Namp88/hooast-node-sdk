import { ErrorResponse } from '@client/models/response/error.response';

export interface GetSelectedTipHashResponse {
  getSelectedTipHashResponse: {
    selectedTipHash: string;
    error: ErrorResponse;
  };
  payload: 'getSelectedTipHashResponse';
}
