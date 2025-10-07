import { ErrorResponse } from '@client/models/response/error.response';

export interface GetBalanceByAddressResponse {
  getBalanceByAddressResponse: {
    balance: string;
    error: ErrorResponse;
  };
  payload: 'getBalanceByAddressResponse';
}
