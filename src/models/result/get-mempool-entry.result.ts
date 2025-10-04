export interface GetMempoolEntry {
  transaction: GetMempoolEntryTransaction | null;
  fee: string | null;
  mass: string | null;
  isOrphan: boolean;
}

export interface GetMempoolEntryTransaction {
  transactionId: string;
  inputs: GetMempoolEntryTransactionInput[];
  outputs: GetMempoolEntryTransactionOutput[];
  version: number;
  lockTime: string;
  subnetworkId: string;
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
    scriptPublicKey: string;
    version: number;
  };
  verboseData?: {
    scriptPublicKeyType: string;
    scriptPublicKeyAddress: string;
  };
}
