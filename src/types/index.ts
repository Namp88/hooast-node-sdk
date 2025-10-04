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
  address: string;
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

export interface UtxosByAddress {
  [address: string]: Omit<UTXO, 'address'>[];
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
  transactions: BlockTransaction[];
  verboseData?: BlockVerboseData;
}

export interface BlockHeader {
  parents: Array<{ parentHashes: string[] }>;
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

export interface BlockTransaction {
  inputs: TransactionInput[];
  outputs: TransactionOutput[];
  version: number;
  lockTime: string;
  subnetworkId: string;
  gas: string;
  payload: string;
  verboseData: {
    transactionId: string;
    hash: string;
    mass: string;
    blockHash: string;
    blockTime: string;
  };
}

export interface BlockVerboseData {
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
