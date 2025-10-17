export type TransactionStatusType = 'PENDING' | 'CONFIRMED' | 'NOT_FOUND';

export interface GetTransactionStatus {
  /**
   * The current status of the transaction
   */
  status: TransactionStatusType;

  /**
   * Additional details about the transaction status
   */
  details: TransactionStatusDetails;
}

export interface TransactionStatusDetails {
  /**
   * Transaction ID
   */
  txId: string;

  /**
   * Whether transaction is in mempool (only for PENDING status)
   */
  inMempool?: boolean;

  /**
   * Whether transaction is orphan (only for PENDING status)
   */
  isOrphan?: boolean;

  /**
   * Transaction fee in sompi (only for PENDING status)
   */
  fee?: string;

  /**
   * Transaction mass (only for PENDING status)
   */
  mass?: string;

  /**
   * Block DAA score where transaction was confirmed (only for CONFIRMED status)
   */
  blockDaaScore?: string;

  /**
   * Amount received in the confirmed UTXO (only for CONFIRMED status)
   */
  confirmedAmount?: string;

  /**
   * Address where the confirmed UTXO was found (only for CONFIRMED status)
   */
  confirmedAddress?: string;

  /**
   * Whether UTXO is a coinbase transaction (only for CONFIRMED status)
   */
  isCoinbase?: boolean;

  /**
   * Additional message describing the status
   */
  message?: string;
}
