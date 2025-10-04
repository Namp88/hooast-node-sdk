import { ErrorResponse } from '@models/response/error.response';

export interface GetUtxosByAddressesResponse {
  getUtxosByAddressesResponse: {
    entries: Entry[];
    error: ErrorResponse;
  };
  payload: 'getUtxosByAddressesResponse';
}

interface Entry {
  address: string;
  outpoint: {
    transactionId: string;
    index: number;
  };
  utxoEntry: {
    amount: string;
    scriptPublicKey: {
      version: number;
      scriptPublicKey: string;
    };
    blockDaaScore: string;
    isCoinbase: boolean;
  };
}
