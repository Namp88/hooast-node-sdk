import { ErrorResponse } from '@models/response/error.response';

export interface GetCoinSupplyResponse {
  getCoinSupplyResponse: {
    maxSompi: string;
    circulatingSompi: string;
    error: ErrorResponse;
  };
  payload: 'getCoinSupplyResponse';
}
