import { SighashReusedValues, Transaction, TransactionOutput, UtxoForSigning, HoosatCrypto } from '@crypto/crypto';
import { HOOSAT_PARAMS } from '@constants/hoosat-params.conts';
import { HoosatUtils } from '@utils/utils';

export class TransactionBuilder {
  private inputs: Array<{ utxo: UtxoForSigning; privateKey?: Buffer }> = [];
  private outputs: TransactionOutput[] = [];
  private lockTime = '0';
  private fee = '1000';
  private reusedValues: SighashReusedValues = {};

  addInput(utxo: UtxoForSigning, privateKey?: Buffer): this {
    this.inputs.push({ utxo, privateKey });
    return this;
  }

  addOutput(address: string, amount: string): this {
    if (!HoosatUtils.isValidAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }

    const scriptPublicKey = HoosatCrypto.addressToScriptPublicKey(address);

    // Version always 0 for ScriptPublicKey structure
    this.outputs.push({
      amount,
      scriptPublicKey: {
        scriptPublicKey: scriptPublicKey.toString('hex'),
        version: 0,
      },
    });

    return this;
  }

  addOutputRaw(output: TransactionOutput): this {
    this.outputs.push(output);
    return this;
  }

  setFee(fee: string): this {
    this.fee = fee;
    return this;
  }

  setLockTime(lockTime: string): this {
    this.lockTime = lockTime;
    return this;
  }

  build(): Transaction {
    if (this.inputs.length === 0) throw new Error('Transaction must have at least one input');
    if (this.outputs.length === 0) throw new Error('Transaction must have at least one output');

    return {
      version: 0,
      inputs: this.inputs.map(({ utxo }) => ({
        previousOutpoint: utxo.outpoint,
        signatureScript: '',
        sequence: '0',
        sigOpCount: 1,
        utxoEntry: utxo.utxoEntry,
      })),
      outputs: this.outputs,
      lockTime: this.lockTime,
      subnetworkId: '0000000000000000000000000000000000000000',
      gas: '0',
      payload: '',
      fee: this.fee,
    };
  }

  async sign(globalPrivateKey?: Buffer): Promise<Transaction> {
    const transaction = this.build();

    console.log('\n🔐 === SIGNING PROCESS START ===\n');

    for (let i = 0; i < this.inputs.length; i++) {
      const { utxo, privateKey } = this.inputs[i];
      const keyToUse = privateKey || globalPrivateKey;

      if (!keyToUse) {
        throw new Error(`No private key provided for input ${i}`);
      }

      console.log(`Input ${i} signing:`);
      console.log(`  UTXO amount: ${utxo.utxoEntry.amount}`);
      console.log(`  Script version: ${utxo.utxoEntry.scriptPublicKey.version}`);
      console.log(`  Script: ${utxo.utxoEntry.scriptPublicKey.script}\n`);

      // Получаем signature hash с debug
      const schnorrHash = HoosatCrypto.getSignatureHashSchnorr(transaction, i, utxo, this.reusedValues);
      console.log(`  Schnorr Hash: ${schnorrHash.toString('hex')}`);

      const ecdsaHash = HoosatCrypto.getSignatureHashECDSA(transaction, i, utxo, this.reusedValues);
      console.log(`  ECDSA Hash: ${ecdsaHash.toString('hex')}`);

      // Подписываем
      const signature = HoosatCrypto.signTransactionInput(transaction, i, keyToUse, utxo, this.reusedValues);
      console.log(`  Raw Signature: ${signature.signature.toString('hex')}`);

      // SignatureScript: 0x41 + 64-byte sig + 0x01
      const sigWithType = Buffer.concat([signature.signature, Buffer.from([signature.sigHashType])]);
      const sigScript = Buffer.concat([Buffer.from([sigWithType.length]), sigWithType]);

      console.log(`  SigScript: ${sigScript.toString('hex')}`);
      console.log(`  SigScript length: ${sigScript.length} bytes\n`);

      transaction.inputs[i].signatureScript = sigScript.toString('hex');
    }

    // Удаляем utxoEntry из inputs для финальной транзакции
    transaction.inputs.forEach(input => {
      delete input.utxoEntry;
    });

    console.log('🔐 === SIGNING PROCESS COMPLETE ===\n');

    return transaction;
  }

  estimateFee(feePerByte = HOOSAT_PARAMS.DEFAULT_FEE_PER_BYTE): string {
    return HoosatCrypto.calculateFee(this.inputs.length, this.outputs.length, feePerByte);
  }

  getTotalInputAmount(): bigint {
    return this.inputs.reduce((sum, { utxo }) => sum + BigInt(utxo.utxoEntry.amount), 0n);
  }

  getTotalOutputAmount(): bigint {
    return this.outputs.reduce((sum, output) => sum + BigInt(output.amount), 0n);
  }

  validate(): void {
    const totalInput = this.getTotalInputAmount();
    const totalOutput = this.getTotalOutputAmount();
    const fee = BigInt(this.fee);

    if (totalOutput + fee > totalInput) {
      throw new Error(`Insufficient funds: inputs ${totalInput}, outputs ${totalOutput}, fee ${fee}`);
    }
  }

  clear(): this {
    this.inputs = [];
    this.outputs = [];
    this.fee = '1000';
    this.lockTime = '0';
    this.reusedValues = {};
    return this;
  }
}
