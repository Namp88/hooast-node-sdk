export interface GetConnectedPeerInfo {
  peers: GetConnectedPeerInfoItem[];
}

export interface GetConnectedPeerInfoItem {
  id: string;
  address: string;
  lastPingDuration: number;
  isOutbound: boolean;
  timeOffset: number;
  userAgent: string;
  advertisedProtocolVersion: number;
  timeConnected: string;
  isIbdPeer: boolean;
}
