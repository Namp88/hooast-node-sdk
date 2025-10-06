import { EventEmitter } from 'events';
import { HoosatCrypto } from '@crypto/crypto';
import { HoosatUtils } from '@utils/utils';
import { HoosatNode } from '@client/client';
import { TransactionBuilder } from '@transaction/transaction.builder';
import { UtxoForSigning } from '@models/transaction/transaction.types';
import { KeyPair } from '@crypto/models';

/**
 * Wallet configuration options
 */
export interface WalletConfig {
  node: HoosatNode;
  privateKey?: string;
  debug?: boolean;
}

/**
 * UTXO with additional metadata
 */
export interface WalletUtxo {
  transactionId: string;
  index: number;
  amount: string;
  scriptPublicKey: string;
  blockDaaScore: string;
  isCoinbase: boolean;
}

/**
 * Transaction send options
 */
export interface SendOptions {
  to: string;
  amount: string;
  fee?: string;
  changeAddress?: string;
}

/**
 * Balance update event data
 */
export interface BalanceUpdateEvent {
  balance: string;
  balanceHTN: string;
  utxoCount: number;
}

/**
 * Transaction sent event data
 */
export interface TransactionSentEvent {
  transactionId: string;
  to: string;
  amount: string;
}

/**
 * High-level wallet for managing Hoosat addresses and transactions
 *
 * Features:
 * - Automatic UTXO management
 * - Real-time balance updates
 * - Simple send() method
 * - Event-driven architecture
 *
 * @example
 * const wallet = HoosatWallet.createNew(node);
 * console.log('Address:', wallet.address);
 *
 * await wallet.refresh();
 * console.log('Balance:', wallet.balanceHTN, 'HTN');
 *
 * const txId = await wallet.send({
 *   to: 'hoosat:qz7ulu...',
 *   amount: HoosatUtils.amountToSompi('1.5')
 * });
 *
 * @fires HoosatWallet#balanceUpdated - When balance is refreshed
 * @fires HoosatWallet#transactionSent - When transaction is sent
 * @fires HoosatWallet#transactionReceived - When transaction is received
 * @fires HoosatWallet#error - When an error occurs
 */
export class HoosatWallet extends EventEmitter {
  private readonly _node: HoosatNode;
  private readonly _keyPair: KeyPair;
  private readonly _debug: boolean;

  private _utxos: WalletUtxo[] = [];
  private _balance: bigint = 0n;

  /**
   * Creates a new wallet instance
   * @param config - Wallet configuration
   */
  constructor(config: WalletConfig) {
    super();

    this._node = config.node;
    this._debug = config.debug || false;

    if (config.privateKey) {
      this._keyPair = HoosatCrypto.importKeyPair(config.privateKey);
    } else {
      this._keyPair = HoosatCrypto.generateKeyPair();
    }
  }

  /**
   * Creates a new wallet with generated keys
   * @param node - HoosatNode instance
   * @param debug - Enable debug logging
   * @returns New wallet instance
   * @example
   * const wallet = HoosatWallet.createNew(node);
   */
  static createNew(node: HoosatNode, debug = false): HoosatWallet {
    return new HoosatWallet({ node, debug });
  }

  /**
   * Imports wallet from private key
   * @param node - HoosatNode instance
   * @param privateKey - Private key in hex format
   * @param debug - Enable debug logging
   * @returns Wallet instance
   * @example
   * const wallet = HoosatWallet.import(node, '33a4a81e...');
   */
  static import(node: HoosatNode, privateKey: string, debug = false): HoosatWallet {
    return new HoosatWallet({ node, privateKey, debug });
  }

  // ==================== GETTERS ====================

  /**
   * Gets the wallet address
   */
  get address(): string {
    return this._keyPair.address;
  }

  /**
   * Gets the public key
   */
  get publicKey(): Buffer {
    return this._keyPair.publicKey;
  }

  /**
   * Gets the private key (use with caution!)
   */
  get privateKey(): Buffer {
    return this._keyPair.privateKey;
  }

  /**
   * Gets the private key as hex string
   */
  getPrivateKeyHex(): string {
    return this._keyPair.privateKey.toString('hex');
  }

  /**
   * Gets current balance in sompi
   */
  get balance(): string {
    return this._balance.toString();
  }

  /**
   * Gets current balance in HTN
   */
  get balanceHTN(): string {
    return HoosatUtils.sompiToAmount(this._balance);
  }

  /**
   * Gets all UTXOs
   */
  get utxos(): WalletUtxo[] {
    return [...this._utxos];
  }

  // ==================== BALANCE & UTXO METHODS ====================

  /**
   * Refreshes wallet balance and UTXOs from the node
   * @throws Error if fetching UTXOs fails
   * @example
   * await wallet.refresh();
   * console.log('Balance:', wallet.balanceHTN);
   */
  async refresh(): Promise<void> {
    try {
      const result = await this._node.getUtxosByAddresses([this.address]);

      if (!result.ok || !result.result) {
        throw new Error('Failed to fetch UTXOs');
      }

      this._utxos = result.result.utxos.map(utxo => ({
        transactionId: utxo.outpoint.transactionId,
        index: utxo.outpoint.index,
        amount: utxo.utxoEntry.amount,
        scriptPublicKey: utxo.utxoEntry.scriptPublicKey.scriptPublicKey,
        blockDaaScore: utxo.utxoEntry.blockDaaScore,
        isCoinbase: utxo.utxoEntry.isCoinbase,
      }));

      this._balance = this._utxos.reduce((sum, utxo) => sum + BigInt(utxo.amount), 0n);

      this.emit('balanceUpdated', {
        balance: this.balance,
        balanceHTN: this.balanceHTN,
        utxoCount: this._utxos.length,
      } as BalanceUpdateEvent);
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Subscribes to real-time UTXO changes
   * @example
   * await wallet.subscribeToChanges();
   * wallet.on('transactionReceived', (change) => {
   *   console.log('Received transaction!');
   * });
   */
  async subscribeToChanges(): Promise<void> {
    await this._node.subscribeToUtxoChanges([this.address]);

    this._node.on('utxoChanged', async change => {
      if (change.address === this.address) {
        await this.refresh();
        this.emit('transactionReceived', change);
      }
    });
  }

  /**
   * Unsubscribes from UTXO changes
   * @example
   * await wallet.unsubscribeFromChanges();
   */
  async unsubscribeFromChanges(): Promise<void> {
    await this._node.unsubscribeFromUtxoChanges([this.address]);
  }

  // ==================== TRANSACTION METHODS ====================

  /**
   * Sends HTN to an address
   * @param options - Transaction options
   * @returns Transaction ID
   * @throws Error if insufficient balance or invalid address
   * @example
   * const txId = await wallet.send({
   *   to: 'hoosat:qz7ulu...',
   *   amount: HoosatUtils.amountToSompi('1.5'),
   *   fee: '1000'
   * });
   */
  async send(options: SendOptions): Promise<string> {
    const { to, amount, fee, changeAddress } = options;

    try {
      // Validate recipient address
      if (!HoosatUtils.isValidAddress(to)) {
        throw new Error(`Invalid recipient address: ${to}`);
      }

      // Ensure fresh UTXOs
      if (this._utxos.length === 0) {
        await this.refresh();
      }

      if (this._utxos.length === 0) {
        throw new Error('No UTXOs available');
      }

      // Use TransactionBuilder
      const builder = new TransactionBuilder({ debug: this._debug });

      // Add inputs (convert WalletUtxo to UtxoForSigning)
      const targetAmount = BigInt(amount);
      let selectedAmount = 0n;

      for (const utxo of this._utxos) {
        const utxoForSigning: UtxoForSigning = {
          outpoint: {
            transactionId: utxo.transactionId,
            index: utxo.index,
          },
          utxoEntry: {
            amount: utxo.amount,
            scriptPublicKey: {
              script: utxo.scriptPublicKey,
              version: 0,
            },
            blockDaaScore: utxo.blockDaaScore,
            isCoinbase: utxo.isCoinbase,
          },
        };

        builder.addInput(utxoForSigning, this._keyPair.privateKey);
        selectedAmount += BigInt(utxo.amount);

        // Check if we have enough (with estimated fee)
        const estimatedFee = BigInt(builder.estimateFee());
        if (selectedAmount >= targetAmount + estimatedFee) {
          break;
        }
      }

      // Set custom fee or use estimated
      if (fee) {
        builder.setFee(fee);
      } else {
        builder.setFee(builder.estimateFee());
      }

      // Add recipient output
      builder.addOutput(to, amount);

      // Add change output
      const changeAddr = changeAddress || this.address;
      builder.addChangeOutput(changeAddr);

      // Validate
      builder.validate();

      // Sign and get transaction
      const signedTx = builder.sign();

      // Submit to network
      const result = await this._node.submitTransaction(signedTx);

      if (!result.ok || !result.result) {
        throw new Error('Failed to submit transaction');
      }

      // Refresh balance
      await this.refresh();

      this.emit('transactionSent', {
        transactionId: result.result.transactionId,
        to,
        amount,
      } as TransactionSentEvent);

      return result.result.transactionId;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Exports wallet data (WARNING: contains private key!)
   * @returns Wallet export data including private key
   * @example
   * const backup = wallet.export();
   * // Store securely!
   */
  export(): {
    address: string;
    privateKey: string;
    publicKey: string;
  } {
    return {
      address: this.address,
      privateKey: this.getPrivateKeyHex(),
      publicKey: this._keyPair.publicKey.toString('hex'),
    };
  }

  /**
   * Gets wallet info (safe, no private key)
   * @returns Wallet information without private key
   * @example
   * const info = wallet.getInfo();
   * console.log('Address:', info.address);
   * console.log('Balance:', info.balanceHTN, 'HTN');
   */
  getInfo(): {
    address: string;
    publicKey: string;
    balance: string;
    balanceHTN: string;
    utxoCount: number;
  } {
    return {
      address: this.address,
      publicKey: this._keyPair.publicKey.toString('hex'),
      balance: this.balance,
      balanceHTN: this.balanceHTN,
      utxoCount: this._utxos.length,
    };
  }
}
