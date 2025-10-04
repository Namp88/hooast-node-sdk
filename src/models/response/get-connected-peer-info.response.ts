import { ErrorResponse } from '@models/response/error.response';

export interface GetConnectedPeerInfoResponse {
  getConnectedPeerInfoResponse: {
    infos: Info[];
    error: ErrorResponse;
  };
  payload: 'getConnectedPeerInfoResponse';
}

interface Info {
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
