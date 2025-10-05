import * as blake3 from 'blake3';
import * as secp256k1 from 'secp256k1';
import { randomBytes } from 'crypto';
import { bech32 } from 'bech32';

// ==================== TYPES ====================

/** Transaction input structure */
export interface TransactionInput {
  outpoint: {
    transactionId: string;
    index: number;
  };
  signatureScript: string;
  sequence: string;
  sigOpCount: number;
}

/** Transaction output structure */
export interface TransactionOutput {
  amount: string;
  scriptPublicKey: {
    scriptPublicKey: string;
    version: number;
  };
  verboseData?: any;
}

/** Complete transaction structure */
export interface Transaction {
  version: number;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  lockTime: string;
  subnetworkId: string;
  gas: string;
  payload: string;
  fee?: string;
}

/** UTXO entry for transaction building */
export interface UtxoForSigning {
  outpoint: {
    transactionId: string;
    index: number;
  };
  utxoEntry: {
    amount: string;
    scriptPublicKey: string;
    blockDaaScore: string;
    isCoinbase: boolean;
  };
}

/** Key pair structure */
export interface KeyPair {
  privateKey: Buffer;
  publicKey: Buffer;
  address: string;
}

/** Transaction signature info */
export interface TransactionSignature {
  signature: Buffer;
  publicKey: Buffer;
  sigHashType: number;
}

// ==================== CONSTANTS ====================

/** Hoosat network parameters */
const HOOSAT_PARAMS = {
  /** Address prefix for mainnet */
  ADDRESS_PREFIX: 'hoosat',
  /** Signature hash type */
  SIGHASH_ALL: 0x01,
  /** Coinbase maturity */
  COINBASE_MATURITY: 100,
  /** Default fee per byte */
  DEFAULT_FEE_PER_BYTE: 1,
  /** Minimum fee */
  MIN_FEE: 1000,
} as const;

/** Script opcodes */
const SCRIPT_OPCODES = {
  OP_DUP: 0x76,
  OP_HASH160: 0xa9,
  OP_EQUALVERIFY: 0x88,
  OP_CHECKSIG: 0xac,
} as const;

// ==================== CRYPTO UTILITIES ====================

/**
 * Hoosat cryptographic utilities for hashing, signing, and address generation
 *
 * @example
 * ```typescript
 * // Generate new key pair
 * const keyPair = CryptoUtils.generateKeyPair();
 * console.log('Address:', keyPair.address);
 *
 * // Create and sign transaction
 * const builder = new TransactionBuilder();
 * builder.addInput(utxo);
 * builder.addOutput(toAddress, amount);
 * const tx = await builder.sign(keyPair.privateKey);
 * ```
 */
export class CryptoUtils {
  // ==================== HASHING ====================

  /**
   * Computes Blake3 hash of data
   *
   * @param data - Data to hash
   * @returns 32-byte hash
   *
   * @example
   * ```typescript
   * const hash = CryptoUtils.blake3Hash(Buffer.from('hello'));
   * console.log('Hash:', hash.toString('hex'));
   * ```
   */
  static blake3Hash(data: Buffer): Buffer {
    return Buffer.from(blake3.hash(data));
  }

  /**
   * Computes double Blake3 hash (Blake3(Blake3(data)))
   * Used for transaction IDs in Hoosat
   *
   * @param data - Data to hash
   * @returns 32-byte double hash
   */
  static doubleBlake3Hash(data: Buffer): Buffer {
    const firstHash = this.blake3Hash(data);
    return this.blake3Hash(firstHash);
  }

  /**
   * Computes transaction ID from transaction data
   *
   * @param transaction - Transaction object
   * @returns Transaction ID as hex string
   */
  static getTransactionId(transaction: Transaction): string {
    const txData = this.serializeTransactionForHashing(transaction);
    const hash = this.doubleBlake3Hash(txData);
    return hash.toString('hex');
  }

  // ==================== KEY MANAGEMENT ====================

  /**
   * Generates a new cryptographic key pair for Hoosat
   *
   * @returns Object containing private key, public key, and address
   *
   * @example
   * ```typescript
   * const keyPair = CryptoUtils.generateKeyPair();
   * console.log('Private key:', keyPair.privateKey.toString('hex'));
   * console.log('Address:', keyPair.address);
   * ```
   */
  static generateKeyPair(): KeyPair {
    let privateKey: Buffer;
    let publicKey: Buffer;

    // Generate valid secp256k1 private key
    do {
      privateKey = randomBytes(32);
    } while (!secp256k1.privateKeyVerify(privateKey));

    // Derive public key
    publicKey = Buffer.from(secp256k1.publicKeyCreate(privateKey, true)); // compressed

    // Generate address
    const address = this.publicKeyToAddress(publicKey);

    return {
      privateKey,
      publicKey,
      address,
    };
  }

  /**
   * Derives public key from private key
   *
   * @param privateKey - 32-byte private key
   * @returns 33-byte compressed public key
   */
  static getPublicKey(privateKey: Buffer): Buffer {
    if (!secp256k1.privateKeyVerify(privateKey)) {
      throw new Error('Invalid private key');
    }
    return Buffer.from(secp256k1.publicKeyCreate(privateKey, true));
  }

  /**
   * Imports key pair from private key hex string
   *
   * @param privateKeyHex - Private key as hex string
   * @returns Key pair object
   *
   * @example
   * ```typescript
   * const keyPair = CryptoUtils.importKeyPair('a1b2c3d4...');
   * console.log('Imported address:', keyPair.address);
   * ```
   */
  static importKeyPair(privateKeyHex: string): KeyPair {
    const privateKey = Buffer.from(privateKeyHex, 'hex');
    const publicKey = this.getPublicKey(privateKey);
    const address = this.publicKeyToAddress(publicKey);

    return {
      privateKey,
      publicKey,
      address,
    };
  }

  // ==================== ADDRESS GENERATION ====================

  /**
   * Converts public key to Hoosat address
   *
   * @param publicKey - 33-byte compressed public key
   * @returns Bech32-encoded Hoosat address
   */
  static publicKeyToAddress(publicKey: Buffer): string {
    // Create P2PK script: OP_DUP OP_HASH160 <pubKeyHash> OP_EQUALVERIFY OP_CHECKSIG
    const pubKeyHash = this.blake3Hash(publicKey).slice(0, 20); // 20 bytes

    // Convert to 5-bit array for bech32
    const words = bech32.toWords(pubKeyHash);

    // Encode as bech32
    return bech32.encode(HOOSAT_PARAMS.ADDRESS_PREFIX, words);
  }

  /**
   * Validates a Hoosat address format
   *
   * @param address - Address string to validate
   * @returns True if valid, false otherwise
   */
  static isValidAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Check basic format
    if (!address.startsWith('hoosat:')) {
      return false;
    }

    try {
      // Try to decode bech32
      const decoded = bech32.decode(address);

      // Check prefix
      if (decoded.prefix !== 'hoosat') {
        return false;
      }

      // Check if we have data
      if (!decoded.words || decoded.words.length === 0) {
        return false;
      }

      // Convert from 5-bit to bytes to validate length
      try {
        const bytes = bech32.fromWords(decoded.words);

        // Hoosat addresses should have 20 bytes of data (160 bits)
        // This is the standard for P2PKH addresses
        if (bytes.length !== 20) {
          return false;
        }

        return true;
      } catch (conversionError) {
        // Conversion from 5-bit words failed
        return false;
      }
    } catch (decodeError) {
      // bech32 decode failed
      return false;
    }
  }

  /**
   * More permissive address validation for testing
   * Use this if the strict validation is too restrictive
   */
  static isValidAddressPermissive(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Check basic format
    if (!address.startsWith('hoosat:')) {
      return false;
    }

    // Check minimum length (hoosat: + some data)
    if (address.length < 15) {
      return false;
    }

    try {
      // Try to decode bech32
      const decoded = bech32.decode(address);

      // Check prefix
      if (decoded.prefix !== 'hoosat') {
        return false;
      }

      // Check if we have data
      if (!decoded.words || decoded.words.length === 0) {
        return false;
      }

      // Don't validate exact length - just check it's reasonable
      try {
        const bytes = bech32.fromWords(decoded.words);

        // Accept any reasonable length (10-32 bytes)
        if (bytes.length < 10 || bytes.length > 32) {
          return false;
        }

        return true;
      } catch (conversionError) {
        return false;
      }
    } catch (decodeError) {
      return false;
    }
  }

  /**
   * Converts Hoosat address to script public key
   *
   * @param address - Bech32-encoded Hoosat address
   * @returns Script public key buffer
   */
  static addressToScriptPublicKey(address: string): Buffer {
    if (!this.isValidAddress(address)) {
      throw new Error('Invalid Hoosat address');
    }

    const decoded = bech32.decode(address);
    const pubKeyHash = Buffer.from(bech32.fromWords(decoded.words));

    // Create P2PK script
    const script = Buffer.concat([
      Buffer.from([SCRIPT_OPCODES.OP_DUP]),
      Buffer.from([SCRIPT_OPCODES.OP_HASH160]),
      Buffer.from([pubKeyHash.length]),
      pubKeyHash,
      Buffer.from([SCRIPT_OPCODES.OP_EQUALVERIFY]),
      Buffer.from([SCRIPT_OPCODES.OP_CHECKSIG]),
    ]);

    return script;
  }

  // ==================== TRANSACTION SIGNING ====================

  /**
   * Signs a transaction input with private key
   *
   * @param transaction - Transaction to sign
   * @param inputIndex - Index of input to sign
   * @param privateKey - Private key for signing
   * @param utxo - UTXO being spent
   * @returns Signature information
   *
   * @example
   * ```typescript
   * const signature = CryptoUtils.signTransactionInput(
   *   transaction, 0, privateKey, utxo
   * );
   * ```
   */
  static signTransactionInput(
    transaction: Transaction,
    inputIndex: number,
    privateKey: Buffer,
    utxo: UtxoForSigning
  ): TransactionSignature {
    // Create signature hash
    const sigHash = this.getSignatureHash(transaction, inputIndex, utxo);

    // Sign hash
    const signature = secp256k1.ecdsaSign(sigHash, privateKey);

    // Get public key
    const publicKey = this.getPublicKey(privateKey);

    return {
      signature: Buffer.from(signature.signature),
      publicKey,
      sigHashType: HOOSAT_PARAMS.SIGHASH_ALL,
    };
  }

  /**
   * Creates signature hash for transaction input
   *
   * @param transaction - Transaction being signed
   * @param inputIndex - Index of input being signed
   * @param utxo - UTXO being spent
   * @returns 32-byte signature hash
   */
  static getSignatureHash(transaction: Transaction, inputIndex: number, utxo: UtxoForSigning): Buffer {
    // Create modified transaction for signing
    const signingTx = JSON.parse(JSON.stringify(transaction));

    // Clear all input signatures except the one being signed
    signingTx.inputs.forEach((input: any, index: number) => {
      if (index === inputIndex) {
        input.signatureScript = utxo.utxoEntry.scriptPublicKey;
      } else {
        input.signatureScript = '';
      }
    });

    // Serialize and hash
    const txData = this.serializeTransactionForSigning(signingTx);
    const sigHashTypeBytes = Buffer.alloc(4);
    sigHashTypeBytes.writeUInt32LE(HOOSAT_PARAMS.SIGHASH_ALL, 0);

    const dataToHash = Buffer.concat([txData, sigHashTypeBytes]);
    return this.doubleBlake3Hash(dataToHash);
  }

  /**
   * Verifies a transaction signature
   *
   * @param transaction - Transaction containing the signature
   * @param inputIndex - Index of signed input
   * @param signature - Signature to verify
   * @param publicKey - Public key used for signing
   * @param utxo - UTXO that was spent
   * @returns True if signature is valid
   */
  static verifyTransactionSignature(
    transaction: Transaction,
    inputIndex: number,
    signature: Buffer,
    publicKey: Buffer,
    utxo: UtxoForSigning
  ): boolean {
    try {
      const sigHash = this.getSignatureHash(transaction, inputIndex, utxo);
      return secp256k1.ecdsaVerify(signature, sigHash, publicKey);
    } catch {
      return false;
    }
  }

  // ==================== SERIALIZATION ====================

  /**
   * Serializes transaction for hashing (to get transaction ID)
   *
   * @param transaction - Transaction to serialize
   * @returns Serialized transaction data
   */
  static serializeTransactionForHashing(transaction: Transaction): Buffer {
    const buffers: Buffer[] = [];

    // Version
    const versionBuffer = Buffer.alloc(4);
    versionBuffer.writeUInt32LE(transaction.version, 0);
    buffers.push(versionBuffer);

    // Inputs count
    buffers.push(this.encodeVarInt(transaction.inputs.length));

    // Inputs
    transaction.inputs.forEach(input => {
      // Previous outpoint
      buffers.push(Buffer.from(input.outpoint.transactionId, 'hex').reverse());
      const indexBuffer = Buffer.alloc(4);
      indexBuffer.writeUInt32LE(input.outpoint.index, 0);
      buffers.push(indexBuffer);

      // Signature script
      const sigScript = Buffer.from(input.signatureScript, 'hex');
      buffers.push(this.encodeVarInt(sigScript.length));
      buffers.push(sigScript);

      // Sequence
      const sequenceBuffer = Buffer.alloc(8);
      sequenceBuffer.writeBigUInt64LE(BigInt(input.sequence), 0);
      buffers.push(sequenceBuffer);
    });

    // Outputs count
    buffers.push(this.encodeVarInt(transaction.outputs.length));

    // Outputs
    transaction.outputs.forEach(output => {
      // Amount
      const amountBuffer = Buffer.alloc(8);
      amountBuffer.writeBigUInt64LE(BigInt(output.amount), 0);
      buffers.push(amountBuffer);

      // Script public key
      const script = Buffer.from(output.scriptPublicKey.scriptPublicKey, 'hex');
      buffers.push(this.encodeVarInt(script.length));
      buffers.push(script);
    });

    // Lock time
    const lockTimeBuffer = Buffer.alloc(8);
    lockTimeBuffer.writeBigUInt64LE(BigInt(transaction.lockTime), 0);
    buffers.push(lockTimeBuffer);

    // Subnetwork ID
    buffers.push(Buffer.from(transaction.subnetworkId, 'hex'));

    return Buffer.concat(buffers);
  }

  /**
   * Serializes transaction for signing
   *
   * @param transaction - Transaction to serialize
   * @returns Serialized transaction data for signing
   */
  static serializeTransactionForSigning(transaction: Transaction): Buffer {
    // Same as hashing but may have different signature scripts
    return this.serializeTransactionForHashing(transaction);
  }

  /**
   * Encodes integer as variable-length integer
   *
   * @param value - Integer value to encode
   * @returns Variable-length encoded bytes
   */
  static encodeVarInt(value: number): Buffer {
    if (value < 0xfd) {
      return Buffer.from([value]);
    } else if (value <= 0xffff) {
      const buffer = Buffer.alloc(3);
      buffer[0] = 0xfd;
      buffer.writeUInt16LE(value, 1);
      return buffer;
    } else if (value <= 0xffffffff) {
      const buffer = Buffer.alloc(5);
      buffer[0] = 0xfe;
      buffer.writeUInt32LE(value, 1);
      return buffer;
    } else {
      const buffer = Buffer.alloc(9);
      buffer[0] = 0xff;
      buffer.writeBigUInt64LE(BigInt(value), 1);
      return buffer;
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Formats amount from sompi to HTN
   *
   * @param sompi - Amount in sompi (smallest unit)
   * @returns Formatted amount in HTN
   */
  static formatAmount(sompi: string | bigint): string {
    const amount = typeof sompi === 'string' ? BigInt(sompi) : sompi;
    const htn = Number(amount) / 100000000;
    return htn.toFixed(8);
  }

  /**
   * Parses amount from HTN to sompi
   *
   * @param htn - Amount in HTN
   * @returns Amount in sompi as string
   */
  static parseAmount(htn: string): string {
    const amount = parseFloat(htn) * 100000000;
    return BigInt(Math.floor(amount)).toString();
  }

  /**
   * Estimates transaction size in bytes
   *
   * @param inputCount - Number of inputs
   * @param outputCount - Number of outputs
   * @returns Estimated transaction size
   */
  static estimateTransactionSize(inputCount: number, outputCount: number): number {
    // Rough estimation: base + inputs + outputs
    const baseSize = 10; // version, lock time, etc.
    const inputSize = 150; // outpoint + signature + sequence
    const outputSize = 35; // amount + script

    return baseSize + inputCount * inputSize + outputCount * outputSize;
  }

  /**
   * Calculates recommended fee for transaction
   *
   * @param inputCount - Number of inputs
   * @param outputCount - Number of outputs
   * @param feePerByte - Fee per byte (default: 1)
   * @returns Recommended fee in sompi
   */
  static calculateFee(inputCount: number, outputCount: number, feePerByte = HOOSAT_PARAMS.DEFAULT_FEE_PER_BYTE): string {
    const size = this.estimateTransactionSize(inputCount, outputCount);
    const fee = Math.max(size * feePerByte, HOOSAT_PARAMS.MIN_FEE);
    return fee.toString();
  }
}

// ==================== TRANSACTION BUILDER ====================

/**
 * Transaction builder for creating and signing Hoosat transactions
 *
 * @example
 * ```typescript
 * const builder = new TransactionBuilder();
 *
 * // Add inputs (UTXOs to spend)
 * builder.addInput(utxo1);
 * builder.addInput(utxo2);
 *
 * // Add outputs (recipients)
 * builder.addOutput('hoosat:recipient...', '100000000'); // 1 HTN
 * builder.addOutput('hoosat:change...', '50000000'); // 0.5 HTN change
 *
 * // Sign transaction
 * const signedTx = await builder.sign(privateKey);
 *
 * // Submit to network
 * const result = await node.submitTransaction(signedTx);
 * ```
 */
export class TransactionBuilder {
  private inputs: Array<{ utxo: UtxoForSigning; privateKey?: Buffer }> = [];
  private outputs: TransactionOutput[] = [];
  private lockTime = '0';
  private fee = '1000';

  /**
   * Adds an input (UTXO) to the transaction
   *
   * @param utxo - UTXO to spend
   * @param privateKey - Optional private key for this input
   *
   * @example
   * ```typescript
   * builder.addInput(utxo, privateKey);
   * ```
   */
  addInput(utxo: UtxoForSigning, privateKey?: Buffer): this {
    this.inputs.push({ utxo, privateKey });
    return this;
  }

  /**
   * Adds an output (recipient) to the transaction
   *
   * @param address - Recipient Hoosat address
   * @param amount - Amount in sompi
   *
   * @example
   * ```typescript
   * builder.addOutput('hoosat:recipient...', '100000000');
   * ```
   */
  addOutput(address: string, amount: string): this {
    if (!CryptoUtils.isValidAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }

    const scriptPublicKey = CryptoUtils.addressToScriptPublicKey(address);

    this.outputs.push({
      amount,
      scriptPublicKey: {
        scriptPublicKey: scriptPublicKey.toString('hex'),
        version: 0,
      },
    });

    return this;
  }

  /**
   * Sets the transaction fee
   *
   * @param fee - Fee amount in sompi
   */
  setFee(fee: string): this {
    this.fee = fee;
    return this;
  }

  /**
   * Sets the lock time for the transaction
   *
   * @param lockTime - Lock time value
   */
  setLockTime(lockTime: string): this {
    this.lockTime = lockTime;
    return this;
  }

  /**
   * Builds the unsigned transaction
   *
   * @returns Unsigned transaction object
   */
  build(): Transaction {
    if (this.inputs.length === 0) {
      throw new Error('Transaction must have at least one input');
    }

    if (this.outputs.length === 0) {
      throw new Error('Transaction must have at least one output');
    }

    const transaction: Transaction = {
      version: 1,
      inputs: this.inputs.map(({ utxo }) => ({
        outpoint: utxo.outpoint,
        signatureScript: '',
        sequence: '0',
        sigOpCount: 1,
      })),
      outputs: this.outputs,
      lockTime: this.lockTime,
      subnetworkId: '0000000000000000000000000000000000000000',
      gas: '0',
      payload: '',
      fee: this.fee,
    };

    return transaction;
  }

  /**
   * Signs the transaction with provided private keys
   *
   * @param globalPrivateKey - Private key to use for all inputs (if not specified per input)
   * @returns Signed transaction ready for broadcast
   *
   * @example
   * ```typescript
   * const signedTx = await builder.sign(privateKey);
   * ```
   */
  async sign(globalPrivateKey?: Buffer): Promise<Transaction> {
    const transaction = this.build();

    // Sign each input
    for (let i = 0; i < this.inputs.length; i++) {
      const { utxo, privateKey } = this.inputs[i];
      const keyToUse = privateKey || globalPrivateKey;

      if (!keyToUse) {
        throw new Error(`No private key provided for input ${i}`);
      }

      const signature = CryptoUtils.signTransactionInput(transaction, i, keyToUse, utxo);

      // Create signature script
      const sigScript = Buffer.concat([
        Buffer.from([signature.signature.length + 1]), // +1 for sig hash type
        signature.signature,
        Buffer.from([signature.sigHashType]),
        Buffer.from([signature.publicKey.length]),
        signature.publicKey,
      ]);

      transaction.inputs[i].signatureScript = sigScript.toString('hex');
    }

    return transaction;
  }

  /**
   * Estimates the total fee for this transaction
   *
   * @param feePerByte - Fee per byte rate
   * @returns Estimated fee in sompi
   */
  estimateFee(feePerByte = HOOSAT_PARAMS.DEFAULT_FEE_PER_BYTE): string {
    return CryptoUtils.calculateFee(this.inputs.length, this.outputs.length, feePerByte);
  }

  /**
   * Calculates the total input amount
   *
   * @returns Total input amount in sompi
   */
  getTotalInputAmount(): bigint {
    return this.inputs.reduce((sum, { utxo }) => sum + BigInt(utxo.utxoEntry.amount), 0n);
  }

  /**
   * Calculates the total output amount
   *
   * @returns Total output amount in sompi
   */
  getTotalOutputAmount(): bigint {
    return this.outputs.reduce((sum, output) => sum + BigInt(output.amount), 0n);
  }

  /**
   * Validates the transaction before signing
   *
   * @throws Error if transaction is invalid
   */
  validate(): void {
    const totalInput = this.getTotalInputAmount();
    const totalOutput = this.getTotalOutputAmount();
    const fee = BigInt(this.fee);

    if (totalOutput + fee > totalInput) {
      throw new Error(`Insufficient funds: inputs ${totalInput}, outputs ${totalOutput}, fee ${fee}`);
    }

    // Check for coinbase maturity
    this.inputs.forEach(({ utxo }, index) => {
      if (utxo.utxoEntry.isCoinbase) {
        // In real implementation, you'd check block height
        console.warn(`Input ${index} is coinbase UTXO - ensure it's mature`);
      }
    });
  }

  /**
   * Clears all inputs and outputs
   */
  clear(): this {
    this.inputs = [];
    this.outputs = [];
    this.fee = '1000';
    this.lockTime = '0';
    return this;
  }
}

export default CryptoUtils;
