/**
 * Internal gRPC UTXO notification types
 * These types represent the raw format from the Hoosat node
 * and are NOT exported to the public API
 */

/**
 * Internal gRPC UTXO changes format
 * Used for processing raw notifications from the node
 */
export interface StreamingUtxoChanges {
  added: StreamingUtxoEntry[];
  removed: StreamingUtxoEntry[];
}

/**
 * Internal gRPC UTXO entry (raw from node)
 * This format is converted to public UtxoEntry before emitting events
 */
export interface StreamingUtxoEntry {
  outpoint: {
    transactionId: string;
    index: number;
  };
  amount: string;
  scriptPublicKey?: any;
  blockDaaScore?: string;
  isCoinbase?: boolean; // Optional in gRPC response
}
