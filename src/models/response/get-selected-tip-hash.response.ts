import { ErrorResponse } from '@models/response/error.response';

export interface GetSelectedTipHashResponse {
  getSelectedTipHashResponse: {
    selectedTipHash: string;
    error: ErrorResponse;
  };
  payload: 'getSelectedTipHashResponse';
}
