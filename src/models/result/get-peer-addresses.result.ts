export interface GetPeerAddresses {
  addresses: GetPeerAddressItem[];
  bannedAddresses: GetPeerAddressItem[];
}

export interface GetPeerAddressItem {
  address: string;
  isIPv6: boolean;
  host: string;
  port: number;
}
