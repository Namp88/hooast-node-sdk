export interface NodeConfig {
  host?: string;
  port?: number;
  timeout?: number;
}

export interface NodeInfo {
  p2pId: string;
  mempoolSize: string;
  serverVersion: string;
  isUtxoIndexed: boolean;
  isSynced: boolean;
  error: string;
}

export interface BlockDagInfo {
  tipHashes: string[];
  virtualParentHashes: string[];
  networkName: string;
  blockCount: string;
  headerCount: string;
  difficulty: number;
  pastMedianTime: string;
  pruningPointHash: string;
  virtualDaaScore: string;
  error: string;
}

export interface Balance {
  address: string;
  balance: string; // в sompi
}

export interface UTXO {
  outpoint: {
    transactionId: string;
    index: number;
  };
  utxoEntry: {
    amount: string;
    scriptPublicKey: {
      scriptPublicKey: string;
      version: number;
    };
    blockDaaScore: string;
    isCoinbase: boolean;
  };
}

export interface Transaction {
  transactionId: string;
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  version: number;
  lockTime: string;
  subnetworkId: string;
}

export interface TransactionInput {
  previousOutpoint: {
    transactionId: string;
    index: number;
  };
  signatureScript: string;
  sequence: string;
  sigOpCount: number;
}

export interface TransactionOutput {
  amount: string;
  scriptPublicKey: {
    scriptPublicKey: string;
    version: number;
  };
  verboseData?: {
    scriptPublicKeyType: string;
    scriptPublicKeyAddress: string;
  };
}

export interface Block {
  header: BlockHeader;
  transactions: Transaction[];
  verboseData?: BlockVerboseData;
}

export interface BlockHeader {
  version: number;
  parents: Array<{ parentHashes: string[] }>;
  hashMerkleRoot: string;
  acceptedIdMerkleRoot: string;
  utxoCommitment: string;
  timestamp: string;
  bits: number;
  nonce: string;
  daaScore: string;
  blueWork: string;
  pruningPoint: string;
  blueScore: string;
}

export interface BlockVerboseData {
  hash: string;
  difficulty: number;
  selectedParentHash: string;
  transactionIds: string[];
  isHeaderOnly: boolean;
  blueScore: string;
  childrenHashes: string[];
  mergeSetBluesHashes: string[];
  mergeSetRedsHashes: string[];
  isChainBlock: boolean;
}

export interface MempoolEntry {
  transaction: Transaction;
  fee: string;
  mass: string;
  isOrphan: boolean;
}

export interface PeerInfo {
  id: string;
  address: string;
  lastPingDuration: string;
  isOutbound: boolean;
  timeOffset: string;
  userAgent: string;
  advertisedProtocolVersion: number;
  timeConnected: string;
  isIbdPeer: boolean;
}

export interface CoinSupply {
  circulatingSupply: string;
  maxSupply: string;
}
