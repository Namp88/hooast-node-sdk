import { ErrorResponse } from '@models/response/error.response';

export interface SubmitTransactionResponse {
  submitTransactionResponse: {
    transactionId: string;
    error: ErrorResponse;
  };
  payload: 'submitTransactionResponse';
}
