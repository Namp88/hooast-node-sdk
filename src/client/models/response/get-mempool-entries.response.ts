import { ErrorResponse } from '@client/models/response/error.response';

export interface GetMempoolEntriesResponse {
  getMempoolEntriesResponse: {
    entries: Entry[];
    error: ErrorResponse;
  };
  payload: 'getMempoolEntriesResponse';
}

interface Entry {
  transaction: EntryTransaction;
  fee: string;
  mass: string;
  isOrphan: boolean;
}

interface EntryTransaction {
  transactionId: string;
  inputs: EntryTransactionInput[];
  outputs: EntryTransactionOutput[];
  version: number;
  lockTime: string;
  subnetworkId: string;
}

interface EntryTransactionInput {
  previousOutpoint: {
    transactionId: string;
    index: number;
  };
  signatureScript: string;
  sequence: string;
  sigOpCount: number;
}

interface EntryTransactionOutput {
  amount: string;
  scriptPublicKey: {
    scriptPublicKey: string;
    version: number;
  };
  verboseData?: {
    scriptPublicKeyType: string;
    scriptPublicKeyAddress: string;
  };
}
