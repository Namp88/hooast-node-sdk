/**
 * Signed message object with metadata for DApp authentication
 * Contains message content, signature, and timestamps
 */
export interface SignedMessage {
  /** Original message text */
  message: string;
  /** Hex-encoded ECDSA signature (64 bytes) */
  signature: string;
  /** Hex-encoded public key (33 bytes compressed) */
  publicKey: string;
  /** Hoosat address derived from public key */
  address: string;
  /** ISO 8601 timestamp when message was signed */
  timestamp: string;
  /** Application identifier (optional) */
  appId?: string;
  /** Nonce for replay protection (optional) */
  nonce?: string;
}

/**
 * Result of message signature verification
 */
export interface VerificationResult {
  /** Whether the signature is cryptographically valid */
  isValid: boolean;
  /** Recovered public key (hex, 33 bytes) if valid */
  recoveredPublicKey?: string;
  /** Hoosat address derived from recovered public key */
  recoveredAddress?: string;
  /** Error message if verification failed */
  error?: string;
}
