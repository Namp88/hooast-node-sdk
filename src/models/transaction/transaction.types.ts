export interface TransactionInput {
  previousOutpoint: {
    transactionId: string;
    index: number;
  };
  signatureScript: string;
  sequence: string;
  sigOpCount?: number;
}

export interface TransactionOutput {
  amount: string; // sompi
  scriptPublicKey: {
    version: number;
    scriptPublicKey: string;
  };
}

export interface Transaction {
  version: number;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  lockTime: string;
  subnetworkId: string;
  gas?: string;
  payload?: string;
}
