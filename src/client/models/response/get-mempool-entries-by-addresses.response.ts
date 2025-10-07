import { ErrorResponse } from '@client/models/response/error.response';

export interface GetMempoolEntriesByAddressesResponse {
  getMempoolEntriesByAddressesResponse: {
    entries: MempoolEntryByAddress[];
    error: ErrorResponse;
  };
  payload: 'getMempoolEntriesByAddressesResponse';
}

interface MempoolEntryByAddress {
  address: string;
  sending: MempoolEntry[];
  receiving: MempoolEntry[];
}

interface MempoolEntry {
  transaction: MempoolTransaction;
  fee: string;
  mass: string;
  isOrphan: boolean;
}

interface MempoolTransaction {
  transactionId: string;
  inputs: MempoolTransactionInput[];
  outputs: MempoolTransactionOutput[];
  version: number;
  lockTime: string;
  subnetworkId: string;
  gas: string;
  payload: string;
}

interface MempoolTransactionInput {
  previousOutpoint: {
    transactionId: string;
    index: number;
  };
  signatureScript: string;
  sequence: string;
  sigOpCount: number;
}

interface MempoolTransactionOutput {
  amount: string;
  scriptPublicKey: {
    version: number;
    scriptPublicKey: string;
  };
  verboseData?: {
    scriptPublicKeyType: string;
    scriptPublicKeyAddress: string;
  };
}
