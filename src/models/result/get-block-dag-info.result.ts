export interface GetBlockDagInfo {
  tipHashes: string[];
  virtualParentHashes: string[];
  networkName: string;
  blockCount: string;
  headerCount: string;
  difficulty: number;
  pastMedianTime: string;
  pruningPointHash: string;
  virtualDaaScore: string;
}
