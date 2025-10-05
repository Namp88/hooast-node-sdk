// src/utils/crypto.utils.ts

import * as blake3 from 'blake3';
import * as secp256k1 from 'secp256k1';
import { randomBytes } from 'crypto';
import { bech32 } from 'bech32';
import * as bech32Hoosat from './bech32-hoosat';

// ==================== TYPES ====================

/** Transaction input with UTXO entry (CRITICAL for Hoosat!) */
export interface TransactionInput {
  previousOutpoint: {
    transactionId: string;
    index: number;
  };
  signatureScript: string;
  sequence: string;
  sigOpCount: number;
  utxoEntry?: UTXOEntry; // ДОБАВЛЕНО - обязательно для подписи!
}

/** UTXO Entry - необходим для подписи транзакций */
export interface UTXOEntry {
  amount: string;
  scriptPublicKey: {
    script: string;
    version: number;
  };
  blockDaaScore: string;
  isCoinbase: boolean;
}

export interface TransactionOutput {
  amount: string;
  scriptPublicKey: {
    scriptPublicKey: string;
    version: number;
  };
  verboseData?: any;
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

/** SighashReusedValues - для оптимизации хеширования (как в HTND) */
export interface SighashReusedValues {
  previousOutputsHash?: Buffer;
  sequencesHash?: Buffer;
  sigOpCountsHash?: Buffer;
  outputsHash?: Buffer;
  payloadHash?: Buffer;
}

// ==================== CONSTANTS ====================

const HOOSAT_PARAMS = {
  ADDRESS_PREFIX: 'hoosat',
  SIGHASH_ALL: 0x01,
  SIGHASH_NONE: 0x02,
  SIGHASH_SINGLE: 0x04,
  SIGHASH_ANYONECANPAY: 0x80,
  COINBASE_MATURITY: 100,
  DEFAULT_FEE_PER_BYTE: 1,
  MIN_FEE: 1000,
  SUBNETWORK_ID_NATIVE: Buffer.alloc(20, 0), // 20 нулевых байт
} as const;

const SCRIPT_OPCODES = {
  OP_DUP: 0x76,
  OP_HASH160: 0xa9,
  OP_EQUALVERIFY: 0x88,
  OP_CHECKSIG: 0xac,
  OP_DATA_32: 0x20, // Blake3 hash - 32 bytes
} as const;

// ==================== CRYPTO UTILITIES ====================

export class CryptoUtils {
  // ==================== HASHING ====================

  static blake3Hash(data: Buffer): Buffer {
    return Buffer.from(blake3.hash(data));
  }

  static doubleBlake3Hash(data: Buffer): Buffer {
    const firstHash = this.blake3Hash(data);
    return this.blake3Hash(firstHash);
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

    // ECDSA публичный ключ (33 байта compressed)
    publicKey = Buffer.from(secp256k1.publicKeyCreate(privateKey, true));

    // Используем ECDSA адрес (version 0x01)
    const address = this.publicKeyToAddressECDSA(publicKey);

    return {
      privateKey,
      publicKey,
      address,
    };
  }

  static getPublicKey(privateKey: Buffer): Buffer {
    if (!secp256k1.privateKeyVerify(privateKey)) {
      throw new Error('Invalid private key');
    }
    return Buffer.from(secp256k1.publicKeyCreate(privateKey, true));
  }

  static importKeyPair(privateKeyHex: string): KeyPair {
    const privateKey = Buffer.from(privateKeyHex, 'hex');
    const publicKey = this.getPublicKey(privateKey);
    const address = this.publicKeyToAddress(publicKey);
    return { privateKey, publicKey, address };
  }

  // ==================== ADDRESS GENERATION ====================

  static publicKeyToAddress(publicKey: Buffer): string {
    // Schnorr public key = 32 bytes
    if (publicKey.length !== 32) {
      throw new Error(`Schnorr public key must be 32 bytes, got ${publicKey.length}`);
    }

    return bech32Hoosat.encode('hoosat', publicKey, 0x00);
  }

  static publicKeyToAddressECDSA(publicKey: Buffer): string {
    // ECDSA public key = 33 bytes
    if (publicKey.length !== 33) {
      throw new Error(`ECDSA public key must be 33 bytes, got ${publicKey.length}`);
    }

    return bech32Hoosat.encode('hoosat', publicKey, 0x01);
  }

  static isValidAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }

    if (!address.startsWith('hoosat:')) {
      return false;
    }

    try {
      const decoded = bech32Hoosat.decode(address);

      // Check version
      if (![0x00, 0x01, 0x08].includes(decoded.version)) {
        return false;
      }

      // Check payload length
      if (decoded.version === 0x00 && decoded.payload.length !== 32) {
        return false; // Schnorr
      }
      if (decoded.version === 0x01 && decoded.payload.length !== 33) {
        return false; // ECDSA
      }
      if (decoded.version === 0x08 && decoded.payload.length !== 32) {
        return false; // ScriptHash
      }

      return true;
    } catch {
      return false;
    }
  }

  static addressToScriptPublicKey(address: string): Buffer {
    const decoded = bech32Hoosat.decode(address);

    // For Schnorr/ECDSA: OP_DATA_XX <pubkey> OP_CHECKSIG
    const dataLength = decoded.payload.length;

    return Buffer.concat([
      Buffer.from([dataLength]), // OP_DATA_32 or OP_DATA_33
      decoded.payload,
      Buffer.from([0xac]), // OP_CHECKSIG
    ]);
  }

  // ==================== TRANSACTION SIGNING (HOOSAT STYLE!) ====================

  /**
   * КРИТИЧЕСКАЯ ФУНКЦИЯ: Создание signature hash по алгоритму Hoosat
   * Основано на: domain/consensus/utils/consensushashing/sighash.go
   */
  static getSignatureHashSchnorr(
    transaction: Transaction,
    inputIndex: number,
    utxo: UtxoForSigning,
    reusedValues: SighashReusedValues = {}
  ): Buffer {
    const input = transaction.inputs[inputIndex];
    const hashType = HOOSAT_PARAMS.SIGHASH_ALL;

    // Создаем writer для хеширования
    const buffers: Buffer[] = [];

    // 1. Version (uint16 - 2 bytes)
    const versionBuf = Buffer.alloc(2);
    versionBuf.writeUInt16LE(transaction.version, 0);
    buffers.push(versionBuf);

    // 2. PreviousOutputsHash
    buffers.push(this._getPreviousOutputsHash(transaction, hashType, reusedValues));

    // 3. SequencesHash
    buffers.push(this._getSequencesHash(transaction, hashType, reusedValues));

    // 4. SigOpCountsHash
    buffers.push(this._getSigOpCountsHash(transaction, hashType, reusedValues));

    // 5. Current Outpoint
    buffers.push(Buffer.from(input.previousOutpoint.transactionId, 'hex').reverse());
    const indexBuf = Buffer.alloc(4);
    indexBuf.writeUInt32LE(input.previousOutpoint.index, 0);
    buffers.push(indexBuf);

    // 6. PrevScriptPublicKey Version (uint16)
    const scriptVersionBuf = Buffer.alloc(2);
    scriptVersionBuf.writeUInt16LE(0, 0); // Version 0
    buffers.push(scriptVersionBuf);

    // 7. PrevScriptPublicKey Script
    const prevScript = Buffer.from(utxo.utxoEntry.scriptPublicKey, 'hex');
    buffers.push(this._encodeVarInt(prevScript.length));
    buffers.push(prevScript);

    // 8. UTXO Amount (uint64 - 8 bytes) - КРИТИЧНО!
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

    // Хешируем все вместе
    const dataToHash = Buffer.concat(buffers);
    return this.blake3Hash(dataToHash);
  }

  /**
   * ECDSA signature hash = Blake3(Schnorr signature hash)
   * Основано на: CalculateSignatureHashECDSA() из sighash.go
   */
  static getSignatureHashECDSA(
    transaction: Transaction,
    inputIndex: number,
    utxo: UtxoForSigning,
    reusedValues: SighashReusedValues = {}
  ): Buffer {
    // Сначала получаем Schnorr hash
    const schnorrHash = this.getSignatureHashSchnorr(transaction, inputIndex, utxo, reusedValues);

    // Потом еще раз хешируем для ECDSA
    return this.blake3Hash(schnorrHash);
  }

  /**
   * Подписывает вход транзакции ECDSA (основной метод для Hoosat)
   */
  static signTransactionInput(
    transaction: Transaction,
    inputIndex: number,
    privateKey: Buffer,
    utxo: UtxoForSigning,
    reusedValues: SighashReusedValues = {}
  ): TransactionSignature {
    // Получаем ECDSA signature hash
    const sigHash = this.getSignatureHashECDSA(transaction, inputIndex, utxo, reusedValues);

    // Подписываем
    const signature = secp256k1.ecdsaSign(sigHash, privateKey);

    // Получаем публичный ключ
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

  // ==================== PRIVATE HELPERS FOR SIGHASH ====================

  private static _getPreviousOutputsHash(tx: Transaction, hashType: number, reused: SighashReusedValues): Buffer {
    // SIGHASH_ANYONECANPAY - возвращаем zero hash
    if (hashType & HOOSAT_PARAMS.SIGHASH_ANYONECANPAY) {
      return Buffer.alloc(32, 0);
    }

    // Кешируем для повторного использования
    if (!reused.previousOutputsHash) {
      const buffers: Buffer[] = [];
      for (const input of tx.inputs) {
        buffers.push(Buffer.from(input.previousOutpoint.transactionId, 'hex').reverse());
        const indexBuf = Buffer.alloc(4);
        indexBuf.writeUInt32LE(input.previousOutpoint.index, 0);
        buffers.push(indexBuf);
      }
      reused.previousOutputsHash = this.blake3Hash(Buffer.concat(buffers));
    }

    return reused.previousOutputsHash;
  }

  private static _getSequencesHash(tx: Transaction, hashType: number, reused: SighashReusedValues): Buffer {
    // Для SINGLE, NONE, ANYONECANPAY - zero hash
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
      reused.sequencesHash = this.blake3Hash(Buffer.concat(buffers));
    }

    return reused.sequencesHash;
  }

  private static _getSigOpCountsHash(tx: Transaction, hashType: number, reused: SighashReusedValues): Buffer {
    if (hashType & HOOSAT_PARAMS.SIGHASH_ANYONECANPAY) {
      return Buffer.alloc(32, 0);
    }

    if (!reused.sigOpCountsHash) {
      const sigOpCounts = tx.inputs.map(input => input.sigOpCount);
      reused.sigOpCountsHash = this.blake3Hash(Buffer.from(sigOpCounts));
    }

    return reused.sigOpCountsHash;
  }

  private static _getOutputsHash(tx: Transaction, inputIndex: number, hashType: number, reused: SighashReusedValues): Buffer {
    // SIGHASH_NONE
    if ((hashType & 0x07) === HOOSAT_PARAMS.SIGHASH_NONE) {
      return Buffer.alloc(32, 0);
    }

    // SIGHASH_SINGLE
    if ((hashType & 0x07) === HOOSAT_PARAMS.SIGHASH_SINGLE) {
      if (inputIndex >= tx.outputs.length) {
        return Buffer.alloc(32, 0);
      }
      const output = tx.outputs[inputIndex];
      return this.blake3Hash(this._serializeOutput(output));
    }

    // SIGHASH_ALL
    if (!reused.outputsHash) {
      const buffers = tx.outputs.map(output => this._serializeOutput(output));
      reused.outputsHash = this.blake3Hash(Buffer.concat(buffers));
    }

    return reused.outputsHash;
  }

  private static _getPayloadHash(tx: Transaction, reused: SighashReusedValues): Buffer {
    // Если native subnetwork - zero hash
    const isNative = Buffer.from(tx.subnetworkId, 'hex').equals(HOOSAT_PARAMS.SUBNETWORK_ID_NATIVE);
    if (isNative) {
      return Buffer.alloc(32, 0);
    }

    if (!reused.payloadHash) {
      const payload = Buffer.from(tx.payload, 'hex');
      const payloadLen = this._encodeVarInt(payload.length);
      reused.payloadHash = this.blake3Hash(Buffer.concat([payloadLen, payload]));
    }

    return reused.payloadHash;
  }

  private static _serializeOutput(output: TransactionOutput): Buffer {
    const buffers: Buffer[] = [];

    // Amount (uint64)
    const amountBuf = Buffer.alloc(8);
    amountBuf.writeBigUInt64LE(BigInt(output.amount), 0);
    buffers.push(amountBuf);

    // ScriptPublicKey Version (uint16)
    const versionBuf = Buffer.alloc(2);
    versionBuf.writeUInt16LE(output.scriptPublicKey.version, 0);
    buffers.push(versionBuf);

    // ScriptPublicKey Script
    const script = Buffer.from(output.scriptPublicKey.scriptPublicKey, 'hex');
    buffers.push(this._encodeVarInt(script.length));
    buffers.push(script);

    return Buffer.concat(buffers);
  }

  // ==================== SERIALIZATION ====================

  /**
   * Сериализация для получения Transaction ID
   * SignatureScript исключается из сериализации!
   */
  static serializeTransactionForID(transaction: Transaction): Buffer {
    const buffers: Buffer[] = [];

    // Version
    const versionBuf = Buffer.alloc(2);
    versionBuf.writeUInt16LE(transaction.version, 0);
    buffers.push(versionBuf);

    // Inputs
    buffers.push(this._encodeVarInt(transaction.inputs.length));
    for (const input of transaction.inputs) {
      // Outpoint
      buffers.push(Buffer.from(input.previousOutpoint.transactionId, 'hex').reverse());
      const indexBuf = Buffer.alloc(4);
      indexBuf.writeUInt32LE(input.previousOutpoint.index, 0);
      buffers.push(indexBuf);

      // SignatureScript - ПУСТОЙ для ID!
      buffers.push(this._encodeVarInt(0));

      // Sequence
      const seqBuf = Buffer.alloc(8);
      seqBuf.writeBigUInt64LE(BigInt(input.sequence), 0);
      buffers.push(seqBuf);
    }

    // Outputs
    buffers.push(this._encodeVarInt(transaction.outputs.length));
    for (const output of transaction.outputs) {
      buffers.push(this._serializeOutput(output));
    }

    // LockTime
    const lockTimeBuf = Buffer.alloc(8);
    lockTimeBuf.writeBigUInt64LE(BigInt(transaction.lockTime), 0);
    buffers.push(lockTimeBuf);

    // SubnetworkID
    buffers.push(Buffer.from(transaction.subnetworkId, 'hex'));

    // Gas
    const gasBuf = Buffer.alloc(8);
    gasBuf.writeBigUInt64LE(BigInt(transaction.gas), 0);
    buffers.push(gasBuf);

    // Payload
    const payload = Buffer.from(transaction.payload, 'hex');
    buffers.push(this._encodeVarInt(payload.length));
    buffers.push(payload);

    return Buffer.concat(buffers);
  }

  private static _encodeVarInt(value: number): Buffer {
    if (value < 0xfd) {
      return Buffer.from([value]);
    } else if (value <= 0xffff) {
      const buf = Buffer.alloc(3);
      buf[0] = 0xfd;
      buf.writeUInt16LE(value, 1);
      return buf;
    } else if (value <= 0xffffffff) {
      const buf = Buffer.alloc(5);
      buf[0] = 0xfe;
      buf.writeUInt32LE(value, 1);
      return buf;
    } else {
      const buf = Buffer.alloc(9);
      buf[0] = 0xff;
      buf.writeBigUInt64LE(BigInt(value), 1);
      return buf;
    }
  }

  // ==================== UTILITY METHODS ====================

  static formatAmount(sompi: string | bigint): string {
    const amount = typeof sompi === 'string' ? BigInt(sompi) : sompi;
    const htn = Number(amount) / 100000000;
    return htn.toFixed(8);
  }

  static parseAmount(htn: string): string {
    const amount = parseFloat(htn) * 100000000;

    return BigInt(Math.round(amount)).toString();
  }

  static estimateTransactionSize(inputCount: number, outputCount: number): number {
    const baseSize = 10;
    const inputSize = 150;
    const outputSize = 35;
    return baseSize + inputCount * inputSize + outputCount * outputSize;
  }

  static calculateFee(inputCount: number, outputCount: number, feePerByte = HOOSAT_PARAMS.DEFAULT_FEE_PER_BYTE): string {
    const size = this.estimateTransactionSize(inputCount, outputCount);
    const fee = Math.max(size * feePerByte, HOOSAT_PARAMS.MIN_FEE);
    return fee.toString();
  }
}

// ==================== TRANSACTION BUILDER ====================

export class TransactionBuilder {
  private inputs: Array<{ utxo: UtxoForSigning; privateKey?: Buffer }> = [];
  private outputs: TransactionOutput[] = [];
  private lockTime = '0';
  private fee = '1000';
  private reusedValues: SighashReusedValues = {};

  addInput(utxo: UtxoForSigning, privateKey?: Buffer): this {
    this.inputs.push({ utxo, privateKey });
    return this;
  }

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

  setFee(fee: string): this {
    this.fee = fee;
    return this;
  }

  setLockTime(lockTime: string): this {
    this.lockTime = lockTime;
    return this;
  }

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
        previousOutpoint: utxo.outpoint,
        signatureScript: '',
        sequence: '0',
        sigOpCount: 1,
        utxoEntry: {
          amount: utxo.utxoEntry.amount,
          scriptPublicKey: {
            script: utxo.utxoEntry.scriptPublicKey,
            version: 0,
          },
          blockDaaScore: utxo.utxoEntry.blockDaaScore,
          isCoinbase: utxo.utxoEntry.isCoinbase,
        },
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

  async sign(globalPrivateKey?: Buffer): Promise<Transaction> {
    const transaction = this.build();

    // Подписываем каждый вход
    for (let i = 0; i < this.inputs.length; i++) {
      const { utxo, privateKey } = this.inputs[i];
      const keyToUse = privateKey || globalPrivateKey;

      if (!keyToUse) {
        throw new Error(`No private key provided for input ${i}`);
      }

      const signature = CryptoUtils.signTransactionInput(transaction, i, keyToUse, utxo, this.reusedValues);

      // Создаем SignatureScript: <signature+sigHashType> <publicKey>
      const sigWithType = Buffer.concat([signature.signature, Buffer.from([signature.sigHashType])]);

      const sigScript = Buffer.concat([
        Buffer.from([sigWithType.length]),
        sigWithType,
        Buffer.from([signature.publicKey.length]),
        signature.publicKey,
      ]);

      transaction.inputs[i].signatureScript = sigScript.toString('hex');
    }

    return transaction;
  }

  estimateFee(feePerByte = HOOSAT_PARAMS.DEFAULT_FEE_PER_BYTE): string {
    return CryptoUtils.calculateFee(this.inputs.length, this.outputs.length, feePerByte);
  }

  getTotalInputAmount(): bigint {
    return this.inputs.reduce((sum, { utxo }) => sum + BigInt(utxo.utxoEntry.amount), 0n);
  }

  getTotalOutputAmount(): bigint {
    return this.outputs.reduce((sum, output) => sum + BigInt(output.amount), 0n);
  }

  validate(): void {
    const totalInput = this.getTotalInputAmount();
    const totalOutput = this.getTotalOutputAmount();
    const fee = BigInt(this.fee);

    if (totalOutput + fee > totalInput) {
      throw new Error(`Insufficient funds: inputs ${totalInput}, outputs ${totalOutput}, fee ${fee}`);
    }

    this.inputs.forEach(({ utxo }, index) => {
      if (utxo.utxoEntry.isCoinbase) {
        console.warn(`Input ${index} is coinbase UTXO - ensure it's mature`);
      }
    });
  }

  clear(): this {
    this.inputs = [];
    this.outputs = [];
    this.fee = '1000';
    this.lockTime = '0';
    this.reusedValues = {};
    return this;
  }
}

export default CryptoUtils;
