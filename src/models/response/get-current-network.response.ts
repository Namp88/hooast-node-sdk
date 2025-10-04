import { ErrorResponse } from '@models/response/error.response';

export interface GetCurrentNetworkResponse {
  getCurrentNetworkResponse: {
    currentNetwork: string;
    error: ErrorResponse;
  };
  payload: 'getCurrentNetworkResponse';
}
