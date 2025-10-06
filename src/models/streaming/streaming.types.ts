export interface StreamingUtxoEntry {
  outpoint: {
    transactionId: string;
    index: number;
  };
  amount: string;
  scriptPublicKey?: any;
  blockDaaScore?: string;
  isCoinbase?: boolean;
}

export interface StreamingUtxoChange {
  address: string;
  changes: {
    added: StreamingUtxoEntry[];
    removed: StreamingUtxoEntry[];
  };
}

export interface StreamingUtxoChanges {
  added: StreamingUtxoEntry[];
  removed: StreamingUtxoEntry[];
}
