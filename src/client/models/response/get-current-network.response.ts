import { ErrorResponse } from '@client/models/response/error.response';

export interface GetCurrentNetworkResponse {
  getCurrentNetworkResponse: {
    currentNetwork: string;
    error: ErrorResponse;
  };
  payload: 'getCurrentNetworkResponse';
}
