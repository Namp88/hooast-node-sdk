import { EventEmitter } from 'events';
import { HOOSAT_PARAMS } from '@constants/hoosat-params.conts';
import { HoosatCrypto } from '@crypto/crypto';
import { HoosatUtils } from '@utils/utils';
import { HoosatNode } from '@client/client';
import { Transaction, TransactionOutput } from '@models/transaction/transaction.types';
import { KeyPair } from '@crypto/models';

/**
 * Wallet configuration options
 */
export interface WalletConfig {
  node: HoosatNode;
  privateKey?: string; // Optional: import existing wallet
}

/**
 * UTXO with additional metadata for transaction building
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
 * Transaction build options
 */
export interface SendTransactionOptions {
  to: string;
  amount: string;
  fee?: string;
  changeAddress?: string;
}

/**
 * Wallet class for managing Hoosat addresses and transactions
 * Combines HoosatNode client with cryptographic utilities
 */
export class HoosatWallet extends EventEmitter {
  private readonly _node: HoosatNode;
  private readonly _keyPair: KeyPair;

  private _utxos: WalletUtxo[] = [];
  private _balance: bigint = 0n;

  /**
   * Creates a new wallet instance
   * @param config - Wallet configuration
   */
  constructor(config: WalletConfig) {
    super();

    this._node = config.node;

    // Generate new wallet or import existing
    if (config.privateKey) {
      this._keyPair = HoosatCrypto.importKeyPair(config.privateKey);
    } else {
      this._keyPair = HoosatCrypto.generateKeyPair();
    }
  }

  /**
   * Creates a new wallet with generated keys
   * @param node - HoosatNode instance
   * @returns New wallet instance
   */
  static createNew(node: HoosatNode): HoosatWallet {
    return new HoosatWallet({ node });
  }

  /**
   * Imports wallet from private key
   * @param node - HoosatNode instance
   * @param privateKey - Private key in hex format
   * @returns Wallet instance
   */
  static import(node: HoosatNode, privateKey: string): HoosatWallet {
    return new HoosatWallet({ node, privateKey });
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
   */
  async refresh(): Promise<void> {
    try {
      const result = await this._node.getUtxosByAddresses([this.address]);

      if (!result.ok || !result.result) {
        throw new Error('Failed to fetch UTXOs');
      }

      // Update UTXOs
      this._utxos = result.result.utxos.map(utxo => ({
        transactionId: utxo.outpoint.transactionId,
        index: utxo.outpoint.index,
        amount: utxo.utxoEntry.amount,
        scriptPublicKey: utxo.utxoEntry.scriptPublicKey.scriptPublicKey,
        blockDaaScore: utxo.utxoEntry.blockDaaScore,
        isCoinbase: utxo.utxoEntry.isCoinbase,
      }));

      // Calculate total balance
      this._balance = this._utxos.reduce((sum, utxo) => sum + BigInt(utxo.amount), 0n);

      this.emit('balanceUpdated', {
        balance: this.balance,
        balanceHTN: this.balanceHTN,
        utxoCount: this._utxos.length,
      });
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Subscribes to real-time UTXO changes
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
   */
  async unsubscribeFromChanges(): Promise<void> {
    await this._node.unsubscribeFromUtxoChanges([this.address]);
  }

  // ==================== TRANSACTION METHODS ====================

  /**
   * Builds a transaction to send HTN
   * @param options - Transaction options
   * @returns Built transaction ready for signing
   */
  async buildTransaction(options: SendTransactionOptions): Promise<Transaction> {
    const { to, amount, fee: customFee, changeAddress } = options;

    // Validate recipient address
    if (!HoosatUtils.isValidAddress(to)) {
      throw new Error('Invalid recipient address');
    }

    // Ensure we have fresh UTXOs
    if (this._utxos.length === 0) {
      await this.refresh();
    }

    const targetAmount = BigInt(amount);
    const changeAddr = changeAddress || this.address;

    // Select UTXOs
    let selectedAmount = 0n;
    const selectedUtxos: WalletUtxo[] = [];

    for (const utxo of this._utxos) {
      selectedUtxos.push(utxo);
      selectedAmount += BigInt(utxo.amount);

      // Rough estimate to check if we have enough
      const estimatedFee = BigInt(HoosatCrypto.calculateFee(selectedUtxos.length, 2));

      if (selectedAmount >= targetAmount + estimatedFee) {
        break;
      }
    }

    // Calculate final fee
    const finalFee = customFee ? BigInt(customFee) : BigInt(HoosatCrypto.calculateFee(selectedUtxos.length, 2));

    // Check if we have enough balance
    if (selectedAmount < targetAmount + finalFee) {
      throw new Error(`Insufficient balance. Need ${targetAmount + finalFee}, have ${selectedAmount}`);
    }

    // Build outputs
    const outputs: TransactionOutput[] = [];

    // Recipient output
    const recipientScript = HoosatCrypto.addressToScriptPublicKey(to);
    outputs.push({
      amount: targetAmount.toString(),
      scriptPublicKey: {
        scriptPublicKey: recipientScript.toString('hex'),
        version: 0,
      },
    });

    // Change output (if needed)
    const change = selectedAmount - targetAmount - finalFee;
    if (change > 0n) {
      const changeScript = HoosatCrypto.addressToScriptPublicKey(changeAddr);
      outputs.push({
        amount: change.toString(),
        scriptPublicKey: {
          scriptPublicKey: changeScript.toString('hex'),
          version: 0,
        },
      });
    }

    // Build transaction
    const transaction: Transaction = {
      version: 0,
      inputs: selectedUtxos.map(utxo => ({
        previousOutpoint: {
          transactionId: utxo.transactionId,
          index: utxo.index,
        },
        signatureScript: '', // Will be filled after signing
        sequence: '0',
        sigOpCount: 1,
        utxoEntry: {
          amount: utxo.amount,
          scriptPublicKey: {
            script: utxo.scriptPublicKey,
            version: 0,
          },
          blockDaaScore: utxo.blockDaaScore,
          isCoinbase: utxo.isCoinbase,
        },
      })),
      outputs,
      lockTime: '0',
      subnetworkId: HOOSAT_PARAMS.SUBNETWORK_ID_NATIVE.toString('hex'),
      gas: '0',
      payload: '',
      fee: finalFee.toString(),
    };

    return transaction;
  }

  /**
   * Signs all inputs of a transaction
   * @param transaction - Transaction to sign
   * @returns Signed transaction ready for submission
   */
  signTransaction(transaction: Transaction): Transaction {
    const signedTransaction = { ...transaction };

    for (let i = 0; i < signedTransaction.inputs.length; i++) {
      const input = signedTransaction.inputs[i];

      if (!input.utxoEntry) {
        throw new Error(`Missing UTXO entry for input ${i}`);
      }

      const signature = HoosatCrypto.signTransactionInput(signedTransaction, i, this._keyPair.privateKey, {
        outpoint: input.previousOutpoint,
        utxoEntry: input.utxoEntry,
      });

      // Build signature script: <signature> <pubkey>
      const sigScript = Buffer.concat([
        Buffer.from([signature.signature.length]),
        signature.signature,
        Buffer.from([signature.publicKey.length]),
        signature.publicKey,
      ]);

      signedTransaction.inputs[i].signatureScript = sigScript.toString('hex');
    }

    return signedTransaction;
  }

  /**
   * Sends HTN to an address
   * @param options - Transaction options
   * @returns Transaction ID
   */
  async send(options: SendTransactionOptions): Promise<string> {
    try {
      // Build transaction
      const transaction = await this.buildTransaction(options);

      // Sign transaction
      const signedTransaction = this.signTransaction(transaction);

      // Submit to network
      const result = await this._node.submitTransaction(signedTransaction);

      if (!result.ok || !result.result) {
        throw new Error('Failed to submit transaction');
      }

      // Refresh balance after sending
      await this.refresh();

      this.emit('transactionSent', {
        transactionId: result.result.transactionId,
        to: options.to,
        amount: options.amount,
      });

      return result.result.transactionId;
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Exports wallet data (WARNING: contains private key!)
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
