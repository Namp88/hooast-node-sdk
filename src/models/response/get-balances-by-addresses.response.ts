import { ErrorResponse } from '@models/response/error.response';

export interface GetBalancesByAddressesResponse {
  getBalancesByAddressesResponse: {
    entries: BalancesByAddressEntry[];
    error: ErrorResponse;
  };
  payload: 'getBalancesByAddressesResponse';
}

interface BalancesByAddressEntry {
  address: string;
  balance: string;
  error: ErrorResponse;
}
