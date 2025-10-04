export interface GetBlock {
  transactions: GetBlockTransaction[];
  header: GetBlockHeader;
  verboseData: GetBlockVerboseData;
}

export interface GetBlockTransaction {
  inputs: GetBlockTransactionInput[];
  outputs: GetBlockTransactionOutput[];
  version: number;
  lockTime: string;
  subnetworkId: string;
  gas: string;
  verboseData: GetBlockTransactionVerboseData;
}

export interface GetBlockTransactionInput {
  previousOutpoint: GetBlockTransactionInputPreviousOutpoint;
  signatureScript: string;
  sequence: string;
  sigOpCount: number;
}

export interface GetBlockTransactionInputPreviousOutpoint {
  transactionId: string;
  index: number;
}

export interface GetBlockTransactionOutput {
  amount: string;
  scriptPublicKey: GetBlockTransactionOutputScriptPublicKey;
  verboseData: GetBlockTransactionOutputVerboseData;
}

export interface GetBlockTransactionOutputScriptPublicKey {
  version: number;
  scriptPublicKey: string;
}

export interface GetBlockTransactionOutputVerboseData {
  scriptPublicKeyType: string;
  scriptPublicKeyAddress: string;
}

export interface GetBlockTransactionVerboseData {
  transactionId: string;
  hash: string;
  mass: string;
  blockHash: string;
  blockTime: string;
}

export interface GetBlockHeader {
  parents: GetBlockHeaderParent[];
  version: number;
  hashMerkleRoot: string;
  acceptedIdMerkleRoot: string;
  utxoCommitment: string;
  timestamp: string;
  bits: number;
  nonce: string;
  daaScore: string;
  blueWork: string;
  blueScore: string;
  pruningPoint: string;
}

export interface GetBlockHeaderParent {
  parentHashes: string[];
}

export interface GetBlockVerboseData {
  transactionIds: string[];
  childrenHashes: string[];
  mergeSetBluesHashes: string[];
  mergeSetRedsHashes: string[];
  hash: string;
  difficulty: number;
  selectedParentHash: string;
  isHeaderOnly: boolean;
  blueScore: string;
  isChainBlock: boolean;
}
