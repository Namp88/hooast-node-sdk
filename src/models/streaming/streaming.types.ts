export interface UtxoEntry {
  outpoint: {
    transactionId: string;
    index: number;
  };
  amount: string;
  scriptPublicKey?: any;
  blockDaaScore?: string;
  isCoinbase?: boolean;
}

export interface UtxoChange {
  address: string;
  changes: {
    added: UtxoEntry[];
    removed: UtxoEntry[];
  };
}

export interface UtxoChanges {
  added: UtxoEntry[];
  removed: UtxoEntry[];
}
