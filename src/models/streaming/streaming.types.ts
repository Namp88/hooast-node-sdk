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

export interface StreamingEvents {
  utxoChanged: (change: UtxoChange) => void;
  utxosChanged: (changes: UtxoChanges) => void;
  error: (error: Error) => void;
  streamEnded: () => void;
  streamClosed: () => void;
  reconnected: () => void;
  maxReconnectAttemptsReached: () => void;
}

export interface StreamingConfig {
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  enableAutoReconnect?: boolean;
}
