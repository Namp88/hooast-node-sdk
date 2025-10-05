import * as blake3 from 'blake3';
import * as secp256k1 from 'secp256k1';
import { createHash, randomBytes } from 'crypto';
import * as bech32Hoosat from './bech32-hoosat';
import { HOOSAT_PARAMS } from '@constants/hoosat-params.conts';

// ==================== TYPES ====================
export interface UTXOEntry {
  amount: string;
  scriptPublicKey: {
    script: string;
    version: number;
  };
  blockDaaScore: string;
  isCoinbase: boolean;
}

export interface TransactionInput {
  previousOutpoint: { transactionId: string; index: number };
  signatureScript: string;
  sequence: string;
  sigOpCount: number;
  utxoEntry?: UTXOEntry;
}

export interface TransactionOutput {
  amount: string;
  scriptPublicKey: { scriptPublicKey: string; version: number };
}

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

export interface UtxoForSigning {
  outpoint: { transactionId: string; index: number };
  utxoEntry: {
    amount: string;
    scriptPublicKey: { script: string; version: number };
    blockDaaScore: string;
    isCoinbase: boolean;
  };
}

export interface KeyPair {
  privateKey: Buffer;
  publicKey: Buffer;
  address: string;
}

export interface TransactionSignature {
  signature: Buffer;
  publicKey: Buffer;
  sigHashType: number;
}

export interface SighashReusedValues {
  previousOutputsHash?: Buffer;
  sequencesHash?: Buffer;
  sigOpCountsHash?: Buffer;
  outputsHash?: Buffer;
  payloadHash?: Buffer;
}

// ==================== CRYPTO UTILITIES ====================
export class CryptoUtils {
  // ==================== HASHING ====================

  static blake3Hash(data: Buffer): Buffer {
    return Buffer.from(blake3.hash(data));
  }

  static doubleBlake3Hash(data: Buffer): Buffer {
    return this.blake3Hash(this.blake3Hash(data));
  }

  /**
   * Blake3 Keyed Hash для Hoosat
   * КРИТИЧНО: Точная реализация из htn-core-lib
   */
  static blake3KeyedHash(key: Buffer | string, data: Buffer): Buffer {
    let keyBuffer: Uint8Array;

    if (typeof key === 'string') {
      const encoder = new TextEncoder();
      const fixedSizeKey = new Uint8Array(32);
      encoder.encodeInto(key, fixedSizeKey);
      keyBuffer = fixedSizeKey;
    } else if (key.length === 32) {
      keyBuffer = new Uint8Array(key);
    } else {
      throw new Error(`Blake3 key must be 32 bytes, got ${key.length}`);
    }

    return Buffer.from(blake3.keyedHash(Buffer.from(keyBuffer), data));
  }

  static getTransactionId(transaction: Transaction): string {
    const txData = this.serializeTransactionForID(transaction);
    const hash = this.doubleBlake3Hash(txData);
    return hash.toString('hex');
  }

  // ==================== KEY MANAGEMENT ====================

  static generateKeyPair(): KeyPair {
    let privateKey: Buffer;
    let publicKey: Buffer;

    do {
      privateKey = randomBytes(32);
    } while (!secp256k1.privateKeyVerify(privateKey));

    publicKey = Buffer.from(secp256k1.publicKeyCreate(privateKey, true));
    const address = this.publicKeyToAddressECDSA(publicKey);

    return { privateKey, publicKey, address };
  }

  static getPublicKey(privateKey: Buffer): Buffer {
    if (!secp256k1.privateKeyVerify(privateKey)) {
      throw new Error('Invalid private key');
    }
    return Buffer.from(secp256k1.publicKeyCreate(privateKey, true));
  }

  static importKeyPair(privateKeyHex: string): KeyPair {
    const privateKey = Buffer.from(privateKeyHex, 'hex');

    if (privateKey.length !== 32) {
      throw new Error(`Private key must be 32 bytes, got ${privateKey.length}`);
    }

    if (!secp256k1.privateKeyVerify(privateKey)) {
      throw new Error('Invalid private key');
    }

    const publicKey = this.getPublicKey(privateKey);
    const address = this.publicKeyToAddressECDSA(publicKey);

    return { privateKey, publicKey, address };
  }

  // ==================== ADDRESS GENERATION ====================

  static publicKeyToAddress(publicKey: Buffer): string {
    if (publicKey.length !== 32) {
      throw new Error(`Schnorr public key must be 32 bytes, got ${publicKey.length}`);
    }
    return bech32Hoosat.encode('hoosat', publicKey, 0x00);
  }

  static publicKeyToAddressECDSA(publicKey: Buffer): string {
    if (publicKey.length !== 33) {
      throw new Error(`ECDSA public key must be 33 bytes, got ${publicKey.length}`);
    }
    return bech32Hoosat.encode('hoosat', publicKey, 0x01);
  }

  static addressToScriptPublicKey(address: string): Buffer {
    const decoded = bech32Hoosat.decode(address);

    // P2PK Schnorr (version 0x00)
    if (decoded.version === 0x00) {
      const dataLength = decoded.payload.length;
      return Buffer.concat([
        Buffer.from([dataLength]),
        decoded.payload,
        Buffer.from([0xac]), // OP_CHECKSIG
      ]);
    }

    // P2PK ECDSA (version 0x01)
    if (decoded.version === 0x01) {
      const dataLength = decoded.payload.length;
      return Buffer.concat([
        Buffer.from([dataLength]),
        decoded.payload,
        Buffer.from([0xab]), // ✅ OP_CHECKSIGECDSA (НЕ OP_CHECKSIG!)
      ]);
    }

    // P2SH (version 0x08)
    if (decoded.version === 0x08) {
      return Buffer.concat([
        Buffer.from([0xaa]), // OP_BLAKE3
        Buffer.from([0x20]), // OP_DATA_32
        decoded.payload,
        Buffer.from([0x87]), // OP_EQUAL
      ]);
    }

    throw new Error(`Unsupported address version: ${decoded.version}`);
  }

  // ==================== TRANSACTION SIGNING ====================

  /**
   * Schnorr Signature Hash с Blake3 Keyed Hash
   */
  static getSignatureHashSchnorr(
    transaction: Transaction,
    inputIndex: number,
    utxo: UtxoForSigning,
    reusedValues: SighashReusedValues = {}
  ): Buffer {
    const input = transaction.inputs[inputIndex];
    const hashType = HOOSAT_PARAMS.SIGHASH_ALL;
    const buffers: Buffer[] = [];

    const versionBuf = Buffer.alloc(2);
    versionBuf.writeUInt16LE(transaction.version, 0);
    buffers.push(versionBuf);

    // 2-4. Hashes
    buffers.push(this._getPreviousOutputsHash(transaction, hashType, reusedValues));
    buffers.push(this._getSequencesHash(transaction, hashType, reusedValues));
    buffers.push(this._getSigOpCountsHash(transaction, hashType, reusedValues));

    // 5. Current Outpoint
    buffers.push(Buffer.from(input.previousOutpoint.transactionId, 'hex').reverse());
    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32LE(input.previousOutpoint.index, 0);
    buffers.push(indexBuf);

    // 6. ✅ PrevScriptPublicKey Version - ВСЕГДА 0!
    const scriptVersionBuf = Buffer.alloc(2);
    scriptVersionBuf.writeUInt16LE(0, 0); // ✅ Исправлено: всегда 0!
    buffers.push(scriptVersionBuf);

    // 7. ✅ PrevScriptPublicKey Script - длина как UInt64LE!
    const prevScript = Buffer.from(utxo.utxoEntry.scriptPublicKey.script, 'hex');
    const scriptLengthBuf = Buffer.alloc(8);
    scriptLengthBuf.writeBigUInt64LE(BigInt(prevScript.length), 0); // ✅ Исправлено: UInt64LE вместо VarInt!
    buffers.push(scriptLengthBuf);
    buffers.push(prevScript);

    // 8. Amount (uint64)
    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(BigInt(utxo.utxoEntry.amount), 0);
    buffers.push(amountBuf);

    // 9. Sequence (uint64)
    const sequenceBuf = Buffer.alloc(8);
    sequenceBuf.writeBigUInt64LE(BigInt(input.sequence), 0);
    buffers.push(sequenceBuf);

    // 10. SigOpCount (1 byte)
    buffers.push(Buffer.from([input.sigOpCount]));

    // 11. OutputsHash
    buffers.push(this._getOutputsHash(transaction, inputIndex, hashType, reusedValues));

    // 12. LockTime (uint64)
    const lockTimeBuf = Buffer.alloc(8);
    lockTimeBuf.writeBigUInt64LE(BigInt(transaction.lockTime), 0);
    buffers.push(lockTimeBuf);

    // 13. SubnetworkID (20 bytes)
    buffers.push(Buffer.from(transaction.subnetworkId, 'hex'));

    // 14. Gas (uint64)
    const gasBuf = Buffer.alloc(8);
    gasBuf.writeBigUInt64LE(BigInt(transaction.gas), 0);
    buffers.push(gasBuf);

    // 15. PayloadHash
    buffers.push(this._getPayloadHash(transaction, reusedValues));

    // 16. SigHashType (1 byte)
    buffers.push(Buffer.from([hashType]));

    const dataToHash = Buffer.concat(buffers);

    // ✅ Blake3 Keyed Hash с правильным ключом
    return this.blake3KeyedHash('TransactionSigningHash', dataToHash);
  }

  /**
   * ECDSA Signature Hash
   * ✅ ИСПРАВЛЕНО: SHA256("TransactionSigningHashECDSA" + schnorr_hash)
   */
  static getSignatureHashECDSA(
    transaction: Transaction,
    inputIndex: number,
    utxo: UtxoForSigning,
    reusedValues: SighashReusedValues = {}
  ): Buffer {
    const schnorrHash = this.getSignatureHashSchnorr(transaction, inputIndex, utxo, reusedValues);

    // ✅ ПРАВИЛЬНО: SHA256 с доменом
    return createHash('sha256').update('TransactionSigningHashECDSA').update(schnorrHash).digest();
  }

  static signTransactionInput(
    transaction: Transaction,
    inputIndex: number,
    privateKey: Buffer,
    utxo: UtxoForSigning,
    reusedValues: SighashReusedValues = {}
  ): TransactionSignature {
    const sigHash = this.getSignatureHashECDSA(transaction, inputIndex, utxo, reusedValues);

    // ✅ RAW формат (64 bytes), НЕ DER!
    const signature = secp256k1.ecdsaSign(sigHash, privateKey);
    const publicKey = this.getPublicKey(privateKey);

    return {
      signature: Buffer.from(signature.signature),
      publicKey,
      sigHashType: HOOSAT_PARAMS.SIGHASH_ALL,
    };
  }

  static verifyTransactionSignature(
    transaction: Transaction,
    inputIndex: number,
    signature: Buffer,
    publicKey: Buffer,
    utxo: UtxoForSigning
  ): boolean {
    try {
      const sigHash = this.getSignatureHashECDSA(transaction, inputIndex, utxo);
      return secp256k1.ecdsaVerify(signature, sigHash, publicKey);
    } catch {
      return false;
    }
  }

  // ==================== PRIVATE HELPERS ====================

  private static _getPreviousOutputsHash(tx: Transaction, hashType: number, reused: SighashReusedValues): Buffer {
    if (hashType & HOOSAT_PARAMS.SIGHASH_ANYONECANPAY) {
      return Buffer.alloc(32, 0);
    }

    if (!reused.previousOutputsHash) {
      const buffers: Buffer[] = [];
      for (const input of tx.inputs) {
        buffers.push(Buffer.from(input.previousOutpoint.transactionId, 'hex').reverse());
        const indexBuf = Buffer.alloc(4);
        indexBuf.writeUInt32LE(input.previousOutpoint.index, 0);
        buffers.push(indexBuf);
      }
      // ✅ KEYED HASH!
      reused.previousOutputsHash = this.blake3KeyedHash('TransactionSigningHash', Buffer.concat(buffers));
    }

    return reused.previousOutputsHash;
  }

  private static _getSequencesHash(tx: Transaction, hashType: number, reused: SighashReusedValues): Buffer {
    if (
      (hashType & 0x07) === HOOSAT_PARAMS.SIGHASH_SINGLE ||
      (hashType & 0x07) === HOOSAT_PARAMS.SIGHASH_NONE ||
      hashType & HOOSAT_PARAMS.SIGHASH_ANYONECANPAY
    ) {
      return Buffer.alloc(32, 0);
    }

    if (!reused.sequencesHash) {
      const buffers: Buffer[] = [];
      for (const input of tx.inputs) {
        const seqBuf = Buffer.alloc(8);
        seqBuf.writeBigUInt64LE(BigInt(input.sequence), 0);
        buffers.push(seqBuf);
      }
      // ✅ KEYED HASH!
      reused.sequencesHash = this.blake3KeyedHash('TransactionSigningHash', Buffer.concat(buffers));
    }

    return reused.sequencesHash;
  }

  private static _getSigOpCountsHash(tx: Transaction, hashType: number, reused: SighashReusedValues): Buffer {
    if (hashType & HOOSAT_PARAMS.SIGHASH_ANYONECANPAY) {
      return Buffer.alloc(32, 0);
    }

    if (!reused.sigOpCountsHash) {
      const sigOpCounts = tx.inputs.map(input => input.sigOpCount);
      // ✅ KEYED HASH!
      reused.sigOpCountsHash = this.blake3KeyedHash('TransactionSigningHash', Buffer.from(sigOpCounts));
    }

    return reused.sigOpCountsHash;
  }

  private static _getOutputsHash(tx: Transaction, inputIndex: number, hashType: number, reused: SighashReusedValues): Buffer {
    if ((hashType & 0x07) === HOOSAT_PARAMS.SIGHASH_NONE) {
      return Buffer.alloc(32, 0);
    }

    if ((hashType & 0x07) === HOOSAT_PARAMS.SIGHASH_SINGLE) {
      if (inputIndex >= tx.outputs.length) {
        return Buffer.alloc(32, 0);
      }
      // ✅ KEYED HASH для сериализации одного output
      const buffers: Buffer[] = [];
      const output = tx.outputs[inputIndex];

      const amountBuf = Buffer.alloc(8);
      amountBuf.writeBigUInt64LE(BigInt(output.amount), 0);
      buffers.push(amountBuf);

      const versionBuf = Buffer.alloc(2);
      versionBuf.writeUInt16LE(0, 0);
      buffers.push(versionBuf);

      const script = Buffer.from(output.scriptPublicKey.scriptPublicKey, 'hex');
      const scriptLengthBuf = Buffer.alloc(8);
      scriptLengthBuf.writeBigUInt64LE(BigInt(script.length), 0);
      buffers.push(scriptLengthBuf);
      buffers.push(script);

      return this.blake3KeyedHash('TransactionSigningHash', Buffer.concat(buffers));
    }

    if (!reused.outputsHash) {
      const buffers: Buffer[] = [];

      for (const output of tx.outputs) {
        const amountBuf = Buffer.alloc(8);
        amountBuf.writeBigUInt64LE(BigInt(output.amount), 0);
        buffers.push(amountBuf);

        const versionBuf = Buffer.alloc(2);
        versionBuf.writeUInt16LE(0, 0);
        buffers.push(versionBuf);

        const script = Buffer.from(output.scriptPublicKey.scriptPublicKey, 'hex');
        const scriptLengthBuf = Buffer.alloc(8);
        scriptLengthBuf.writeBigUInt64LE(BigInt(script.length), 0);
        buffers.push(scriptLengthBuf);
        buffers.push(script);
      }

      reused.outputsHash = this.blake3KeyedHash('TransactionSigningHash', Buffer.concat(buffers));
    }

    return reused.outputsHash;
  }

  private static _getPayloadHash(tx: Transaction, reused: SighashReusedValues): Buffer {
    const isNative = Buffer.from(tx.subnetworkId, 'hex').equals(HOOSAT_PARAMS.SUBNETWORK_ID_NATIVE);
    if (isNative) {
      return Buffer.alloc(32, 0);
    }

    if (!reused.payloadHash) {
      const payload = Buffer.from(tx.payload, 'hex');
      const payloadLenBuf = Buffer.alloc(8);
      payloadLenBuf.writeBigUInt64LE(BigInt(payload.length), 0);
      reused.payloadHash = this.blake3KeyedHash('TransactionSigningHash', Buffer.concat([payloadLenBuf, payload]));
    }

    return reused.payloadHash;
  }

  static serializeTransactionForID(transaction: Transaction): Buffer {
    const buffers: Buffer[] = [];

    // Version (uint16)
    const versionBuf = Buffer.alloc(2);
    versionBuf.writeUInt16LE(transaction.version, 0);
    buffers.push(versionBuf);

    // Inputs length как UInt64LE
    const inputsLengthBuf = Buffer.alloc(8);
    inputsLengthBuf.writeBigUInt64LE(BigInt(transaction.inputs.length), 0);
    buffers.push(inputsLengthBuf);

    for (const input of transaction.inputs) {
      buffers.push(Buffer.from(input.previousOutpoint.transactionId, 'hex').reverse());
      const indexBuf = Buffer.alloc(4);
      indexBuf.writeUInt32LE(input.previousOutpoint.index, 0);
      buffers.push(indexBuf);

      // SignatureScript length как UInt64LE
      const sigScript = Buffer.from(input.signatureScript, 'hex');
      const sigScriptLengthBuf = Buffer.alloc(8);
      sigScriptLengthBuf.writeBigUInt64LE(BigInt(sigScript.length), 0);
      buffers.push(sigScriptLengthBuf);
      buffers.push(sigScript);

      // Sequence (uint64)
      const seqBuf = Buffer.alloc(8);
      seqBuf.writeBigUInt64LE(BigInt(input.sequence), 0);
      buffers.push(seqBuf);
    }

    // Outputs length как UInt64LE
    const outputsLengthBuf = Buffer.alloc(8);
    outputsLengthBuf.writeBigUInt64LE(BigInt(transaction.outputs.length), 0);
    buffers.push(outputsLengthBuf);

    for (const output of transaction.outputs) {
      // Amount (uint64)
      const amountBuf = Buffer.alloc(8);
      amountBuf.writeBigUInt64LE(BigInt(output.amount), 0);
      buffers.push(amountBuf);

      // Version (uint16)
      const versionBuf = Buffer.alloc(2);
      versionBuf.writeUInt16LE(output.scriptPublicKey.version, 0);
      buffers.push(versionBuf);

      // Script length как UInt64LE
      const script = Buffer.from(output.scriptPublicKey.scriptPublicKey, 'hex');
      const scriptLengthBuf = Buffer.alloc(8);
      scriptLengthBuf.writeBigUInt64LE(BigInt(script.length), 0);
      buffers.push(scriptLengthBuf);
      buffers.push(script);
    }

    // LockTime (uint64)
    const lockTimeBuf = Buffer.alloc(8);
    lockTimeBuf.writeBigUInt64LE(BigInt(transaction.lockTime), 0);
    buffers.push(lockTimeBuf);

    // SubnetworkID (20 bytes)
    buffers.push(Buffer.from(transaction.subnetworkId, 'hex'));

    // Gas (uint64)
    const gasBuf = Buffer.alloc(8);
    gasBuf.writeBigUInt64LE(BigInt(transaction.gas || '0'), 0);
    buffers.push(gasBuf);

    // Payload (32 bytes)
    const payload = transaction.payload ? Buffer.from(transaction.payload, 'hex') : Buffer.alloc(32, 0);
    buffers.push(payload);

    return Buffer.concat(buffers);
  }

  // ==================== UTILITY METHODS ====================

  static estimateTransactionSize(inputCount: number, outputCount: number): number {
    return 10 + inputCount * 150 + outputCount * 35;
  }

  static calculateFee(inputCount: number, outputCount: number, feePerByte = HOOSAT_PARAMS.DEFAULT_FEE_PER_BYTE): string {
    const size = this.estimateTransactionSize(inputCount, outputCount);
    return Math.max(size * feePerByte, HOOSAT_PARAMS.MIN_FEE).toString();
  }
}

export default CryptoUtils;
