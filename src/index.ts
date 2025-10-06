import { HoosatNode } from '@client/client';
import { HooastWallet } from '@wallet/wallet';
import { NodeConfig } from '@models/node-config.model';

// Types
export type { NodeConfig } from './models/node-config.model';
export type { Transaction, TransactionInput, TransactionOutput, UtxoEntry, UtxoForSigning } from '@models/transaction/transaction.types';
export type { KeyPair, TransactionSignature, SighashReusedValues } from '@crypto/models';

export { HoosatNode } from '@client/client';
export { HooastWallet } from '@wallet/wallet';
export { HoosatCrypto } from '@crypto/crypto';
export { HoosatUtils } from '@utils/utils';

/**
 * Quick start factory for common use cases
 */
export class HoosatSDK {
  /**
   * Creates a ready-to-use node client
   * @param host - Node host (default: '127.0.0.1')
   * @param port - Node port (default: 42420)
   */
  static createNode(host = '127.0.0.1', port = 42420): HoosatNode {
    return new HoosatNode({ host, port });
  }

  /**
   * Creates a new wallet with auto-generated keys
   * @param node - HoosatNode instance or connection params
   */
  static createWallet(node: HoosatNode | NodeConfig): HooastWallet {
    const nodeInstance = node instanceof HoosatNode ? node : new HoosatNode(node);

    return HooastWallet.createNew(nodeInstance);
  }

  /**
   * Imports an existing wallet from private key
   * @param privateKey - Private key in hex format
   * @param node - HoosatNode instance or connection params
   */
  static importWallet(privateKey: string, node: HoosatNode | { host?: string; port?: number }): HooastWallet {
    const nodeInstance = node instanceof HoosatNode ? node : new HoosatNode(node);

    return HooastWallet.import(nodeInstance, privateKey);
  }
}
