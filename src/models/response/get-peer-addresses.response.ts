import { ErrorResponse } from '@models/response/error.response';

export interface GetPeerAddressesResponse {
  getPeerAddressesResponse: {
    addresses: Item[];
    bannedAddresses: Item[];
    error: ErrorResponse;
  };
  payload: 'getPeerAddressesResponse';
}

interface Item {
  Addr: string;
}
