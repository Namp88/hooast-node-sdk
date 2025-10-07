export interface GetBalancesByAddresses {
  balances: GetBalancesByAddressesItem[];
}

export interface GetBalancesByAddressesItem {
  address: string;
  balance: string;
}
