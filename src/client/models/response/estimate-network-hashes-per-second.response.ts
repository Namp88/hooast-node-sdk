import { ErrorResponse } from '@client/models/response/error.response';

export interface EstimateNetworkHashesPerSecondResponse {
  estimateNetworkHashesPerSecondResponse: {
    networkHashesPerSecond: string;
    error: ErrorResponse;
  };
  payload: 'estimateNetworkHashesPerSecondResponse';
}
