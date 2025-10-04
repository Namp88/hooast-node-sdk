export interface GetUtxosByAddresses {
  utxos: GetUtxosByAddressesItem[];
}

export interface GetUtxosByAddressesItem {
  address: string;
  outpoint: {
    transactionId: string;
    index: number;
  };
  utxoEntry: {
    amount: string;
    scriptPublicKey: {
      version: number;
      scriptPublicKey: string;
    };
    blockDaaScore: string;
    isCoinbase: boolean;
  };
}
