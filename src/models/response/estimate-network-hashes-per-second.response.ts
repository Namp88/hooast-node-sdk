import { ErrorResponse } from '@models/response/error.response';

export interface EstimateNetworkHashesPerSecondResponse {
  estimateNetworkHashesPerSecondResponse: {
    networkHashesPerSecond: string;
    error: ErrorResponse;
  };
  payload: 'estimateNetworkHashesPerSecondResponse';
}
