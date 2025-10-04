import { ErrorResponse } from '@models/response/error.response';

export interface GetBalanceByAddressResponse {
  getBalanceByAddressResponse: {
    balance: string;
    error: ErrorResponse;
  };
  payload: 'getBalanceByAddressResponse';
}
