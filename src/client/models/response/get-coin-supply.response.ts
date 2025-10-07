import { ErrorResponse } from '@client/models/response/error.response';

export interface GetCoinSupplyResponse {
  getCoinSupplyResponse: {
    maxSompi: string;
    circulatingSompi: string;
    error: ErrorResponse;
  };
  payload: 'getCoinSupplyResponse';
}
