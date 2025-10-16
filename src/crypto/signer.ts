import * as secp256k1 from 'secp256k1';
import { HoosatCrypto } from '@crypto/crypto';
import { HoosatNetwork } from '@models/network.type';
import { hashMessage } from '@crypto/hasher';
import { SignedMessage, VerificationResult } from '@crypto/signer.types';

/**
 * Message signing utilities for Hoosat blockchain
 * Implements ECDSA signatures with BLAKE3 hashing and RFC6979 determinism
 *
 * @example
 * ```typescript
 * import { HoosatSigner, HoosatCrypto } from 'hoosat-sdk';
 *
 * // Generate wallet
 * const wallet = HoosatCrypto.generateKeyPair();
 *
 * // Sign message
 * const signature = HoosatSigner.signMessage(
 *   wallet.privateKey.toString('hex'),
 *   'Hello, Hoosat!'
 * );
 *
 * // Verify signature
 * const isValid = HoosatSigner.verifyMessage(
 *   signature,
 *   'Hello, Hoosat!',
 *   wallet.publicKey.toString('hex')
 * );
 * ```
 */
export class HoosatSigner {
  /**
   * Signs a message with ECDSA (deterministic RFC6979)
   *
   * Process:
   * 1. Formats message with prefix "Hoosat Signed Message:\n"
   * 2. Hashes with BLAKE3
   * 3. Signs hash with ECDSA (deterministic via RFC6979)
   * 4. Returns 64-byte signature (r + s) as hex
   *
   * @param privateKeyHex - Private key (64-char hex string, 32 bytes)
   * @param message - Message text to sign
   * @returns Hex-encoded signature (128 chars, 64 bytes)
   * @throws Error if private key is invalid
   *
   * @example
   * ```typescript
   * const sig = HoosatSigner.signMessage(privateKey, 'Hello!');
   * console.log(sig.length); // 128 (64 bytes in hex)
   * ```
   */
  static signMessage(privateKeyHex: string, message: string): string {
    const privateKey = Buffer.from(privateKeyHex, 'hex');

    if (privateKey.length !== 32) {
      throw new Error(`Private key must be 32 bytes, got ${privateKey.length}`);
    }

    if (!secp256k1.privateKeyVerify(privateKey)) {
      throw new Error('Invalid private key');
    }

    // Hash message with BLAKE3
    const messageHash = hashMessage(message);

    // Sign with ECDSA (RFC6979 deterministic by default in secp256k1 v5)
    const { signature } = secp256k1.ecdsaSign(messageHash, privateKey);

    return Buffer.from(signature).toString('hex');
  }

  /**
   * Verifies ECDSA signature for a message
   *
   * @param signatureHex - Signature (128-char hex string, 64 bytes)
   * @param message - Original message text
   * @param publicKeyHex - Public key (66-char hex string, 33 bytes compressed)
   * @returns true if signature is valid
   *
   * @example
   * ```typescript
   * const isValid = HoosatSigner.verifyMessage(sig, 'Hello!', pubKey);
   * if (isValid) {
   *   console.log('Signature verified!');
   * }
   * ```
   */
  static verifyMessage(signatureHex: string, message: string, publicKeyHex: string): boolean {
    try {
      const signature = Buffer.from(signatureHex, 'hex');
      const publicKey = Buffer.from(publicKeyHex, 'hex');

      if (signature.length !== 64) {
        throw new Error(`Signature must be 64 bytes, got ${signature.length}`);
      }

      if (publicKey.length !== 33) {
        throw new Error(`Public key must be 33 bytes (compressed), got ${publicKey.length}`);
      }

      const messageHash = hashMessage(message);

      return secp256k1.ecdsaVerify(signature, messageHash, publicKey);
    } catch (error) {
      return false;
    }
  }

  /**
   * Recovers public key from signature (ECDSA recovery)
   *
   * Tries all possible recovery IDs (0-3) and verifies which one is correct.
   * This is necessary because ECDSA signatures don't include recovery info.
   *
   * @param signatureHex - Signature (128-char hex, 64 bytes)
   * @param message - Original message text
   * @returns Recovered public key (hex, 33 bytes compressed) or null
   *
   * @example
   * ```typescript
   * const recoveredPubKey = HoosatSigner.recoverPublicKey(sig, 'Hello!');
   * console.log(recoveredPubKey === originalPubKey); // true
   * ```
   */
  static recoverPublicKey(signatureHex: string, message: string): string | null {
    try {
      const signature = Buffer.from(signatureHex, 'hex');

      if (signature.length !== 64) {
        throw new Error(`Signature must be 64 bytes, got ${signature.length}`);
      }

      const messageHash = hashMessage(message);

      // Try all recovery IDs (0-3) and verify which one produces correct signature
      for (let recid = 0; recid <= 3; recid++) {
        try {
          const recoveredKey = secp256k1.ecdsaRecover(signature, recid, messageHash, true);

          // Verify that this recovered key actually validates the signature
          const isValid = secp256k1.ecdsaVerify(signature, messageHash, recoveredKey);

          if (isValid) {
            return Buffer.from(recoveredKey).toString('hex');
          }
        } catch {
          // Try next recovery ID
          continue;
        }
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Derives public key from private key
   *
   * @param privateKeyHex - Private key (64-char hex string, 32 bytes)
   * @returns Public key (hex, 33 bytes compressed)
   * @throws Error if private key is invalid
   *
   * @example
   * ```typescript
   * const pubKey = HoosatSigner.getPublicKey(privateKey);
   * console.log(pubKey.length); // 66 (33 bytes in hex)
   * ```
   */
  static getPublicKey(privateKeyHex: string): string {
    const privateKey = Buffer.from(privateKeyHex, 'hex');

    if (privateKey.length !== 32) {
      throw new Error(`Private key must be 32 bytes, got ${privateKey.length}`);
    }

    if (!secp256k1.privateKeyVerify(privateKey)) {
      throw new Error('Invalid private key');
    }

    const publicKey = secp256k1.publicKeyCreate(privateKey, true);
    return Buffer.from(publicKey).toString('hex');
  }

  /**
   * Creates signed message object with metadata for DApp authentication
   *
   * Use cases:
   * - DApp login/authentication
   * - Proof of address ownership
   * - Off-chain message signing
   *
   * @param privateKeyHex - Private key (64-char hex string, 32 bytes)
   * @param message - Message text to sign
   * @param network - Network type: 'mainnet' or 'testnet' (default: 'mainnet')
   * @param options - Optional metadata (appId, nonce)
   * @returns SignedMessage object with signature and metadata
   * @throws Error if private key is invalid
   *
   * @example
   * ```typescript
   * const signedMsg = HoosatSigner.createSignedMessage(
   *   privateKey,
   *   'Login to MyDApp',
   *   'mainnet',
   *   { appId: 'my-dapp', nonce: '123456' }
   * );
   *
   * // Send to server for verification
   * fetch('/api/auth', {
   *   method: 'POST',
   *   body: JSON.stringify(signedMsg)
   * });
   * ```
   */
  static createSignedMessage(
    privateKeyHex: string,
    message: string,
    network: HoosatNetwork = 'mainnet',
    options: { appId?: string; nonce?: string } = {}
  ): SignedMessage {
    const signature = this.signMessage(privateKeyHex, message);
    const publicKey = this.getPublicKey(privateKeyHex);
    const address = HoosatCrypto.publicKeyToAddressECDSA(Buffer.from(publicKey, 'hex'), network);

    return {
      message,
      signature,
      publicKey,
      address,
      timestamp: new Date().toISOString(),
      appId: options.appId,
      nonce: options.nonce,
    };
  }

  /**
   * Verifies signed message object
   *
   * Checks:
   * 1. Signature validity with provided public key
   * 2. Address derivation from public key
   *
   * Note: This method does not use public key recovery because the secp256k1
   * library doesn't preserve recovery ID, making exact recovery unreliable.
   * Instead, it verifies the signature using the provided public key.
   *
   * @param signedMessage - SignedMessage object to verify
   * @param network - Network type: 'mainnet' or 'testnet' (default: 'mainnet')
   * @returns VerificationResult with validity status
   *
   * @example
   * ```typescript
   * // Server-side verification
   * const result = HoosatSigner.verifySignedMessage(signedMsg);
   *
   * if (result.isValid) {
   *   console.log('Authenticated as:', result.recoveredAddress);
   *   // Grant access
   * } else {
   *   console.error('Authentication failed:', result.error);
   * }
   * ```
   */
  static verifySignedMessage(signedMessage: SignedMessage, network: HoosatNetwork = 'mainnet'): VerificationResult {
    try {
      const { message, signature, publicKey, address } = signedMessage;

      // 1. Verify signature with provided public key
      const isValidSignature = this.verifyMessage(signature, message, publicKey);

      if (!isValidSignature) {
        return {
          isValid: false,
          error: 'Invalid signature',
        };
      }

      // 2. Derive address from provided public key and verify it matches
      const derivedAddress = HoosatCrypto.publicKeyToAddressECDSA(Buffer.from(publicKey, 'hex'), network);

      if (derivedAddress !== address) {
        return {
          isValid: false,
          error: 'Address does not match public key',
        };
      }

      return {
        isValid: true,
        recoveredPublicKey: publicKey,
        recoveredAddress: derivedAddress,
      };
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown error during verification',
      };
    }
  }
}
