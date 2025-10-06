import { HoosatNetwork } from '@constants/hoosat-params.conts';

export interface KeyPair {
  privateKey: Buffer;
  publicKey: Buffer;
  address: string;
  network?: HoosatNetwork; // Optional for backward compatibility
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
