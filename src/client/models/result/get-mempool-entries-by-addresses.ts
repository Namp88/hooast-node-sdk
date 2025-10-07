export interface GetMempoolEntriesByAddresses {
  entries: GetMempoolEntriesByAddressesItem[];
}

export interface GetMempoolEntriesByAddressesItem {
  address: string;
  sending: GetMempoolEntryItem[];
  receiving: GetMempoolEntryItem[];
}

export interface GetMempoolEntryItem {
  transaction: GetMempoolEntryTransaction;
  fee: string;
  mass: string;
  isOrphan: boolean;
}

export interface GetMempoolEntryTransaction {
  transactionId: string;
  inputs: GetMempoolEntryTransactionInput[];
  outputs: GetMempoolEntryTransactionOutput[];
  version: number;
  lockTime: string;
  subnetworkId: string;
  gas: string;
  payload: string;
}

export interface GetMempoolEntryTransactionInput {
  previousOutpoint: {
    transactionId: string;
    index: number;
  };
  signatureScript: string;
  sequence: string;
  sigOpCount: number;
}

export interface GetMempoolEntryTransactionOutput {
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
