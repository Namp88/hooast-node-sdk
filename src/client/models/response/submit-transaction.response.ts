import { ErrorResponse } from '@client/models/response/error.response';

export interface SubmitTransactionResponse {
  submitTransactionResponse: {
    transactionId: string;
    error: ErrorResponse;
  };
  payload: 'submitTransactionResponse';
}
