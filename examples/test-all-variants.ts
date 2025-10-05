import { CryptoUtils } from '../src/utils/crypto.utils';
import { HoosatNode } from '../src';
import { TransactionBuilder } from '../src/transaction/transaction.builder';
import { HoosatUtils } from '../src/utils/utils';

async function testAllVariants() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  const wallet = CryptoUtils.importKeyPair('33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43');
  console.log('🔑 Wallet:', wallet.address, '\n');

  const utxosRes = await node.getUtxosByAddresses([wallet.address]);
  if (!utxosRes.ok || utxosRes.result.utxos.length === 0) {
    console.error('❌ No UTXOs found');
    return;
  }

  const utxo = utxosRes.result.utxos[0];
  const scriptFull = Buffer.from(utxo.utxoEntry.scriptPublicKey.scriptPublicKey, 'hex');
  const pubkey = scriptFull.slice(1, 34);

  console.log('📦 UTXO:', utxo.outpoint.transactionId.slice(0, 20) + '...');
  console.log('💰 Amount:', HoosatUtils.sompiToAmount(utxo.utxoEntry.amount), 'HTN\n');

  const recipientAddress = 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74';
  const sendAmount = BigInt(HoosatUtils.amountToSompi('0.001'));
  const fee = 100000n;
  const inputAmount = BigInt(utxo.utxoEntry.amount);
  const change = inputAmount - sendAmount - fee;

  // Три варианта script для подписи
  const variants = [
    {
      name: 'VARIANT 1: Full script (0x21 + pubkey + 0xab)',
      script: scriptFull.toString('hex'),
    },
    {
      name: 'VARIANT 2: Without final opcode (0x21 + pubkey)',
      script: scriptFull.slice(0, -1).toString('hex'),
    },
    {
      name: 'VARIANT 3: Only pubkey (33 bytes)',
      script: pubkey.toString('hex'),
    },
  ];

  for (let i = 0; i < variants.length; i++) {
    const variant = variants[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 ${variant.name}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      // Создаем UTXO с нужным вариантом script
      const utxoForSigning = {
        outpoint: utxo.outpoint,
        utxoEntry: {
          amount: utxo.utxoEntry.amount,
          scriptPublicKey: {
            version: 0,
            script: variant.script,
          },
          blockDaaScore: utxo.utxoEntry.blockDaaScore,
          isCoinbase: utxo.utxoEntry.isCoinbase,
        },
      };

      // Строим транзакцию
      const builder = new TransactionBuilder();
      builder.addInput(utxoForSigning, wallet.privateKey);
      builder.addOutput(recipientAddress, sendAmount.toString());
      builder.addOutput(wallet.address, change.toString());
      builder.setFee(fee.toString());

      // Подписываем
      const signedTx = await builder.sign();
      const txId = CryptoUtils.getTransactionId(signedTx);

      console.log('✅ Signed successfully');
      console.log('📝 TX ID:', txId);
      console.log('🔏 SigScript:', signedTx.inputs[0].signatureScript.slice(0, 40) + '...');

      // Отправляем
      console.log('\n📤 Submitting to node...');
      const result = await node.submitTransaction(signedTx);

      // ✅ ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ
      console.log('\n🔍 Full result object:');
      console.log(JSON.stringify(result, null, 2));

      if (result.ok) {
        console.log('\n✅ SUCCESS! Transaction accepted!');
        console.log('🎉 This variant is CORRECT!');
        console.log('Transaction ID:', result.result.transactionId);
        break;
      } else {
        console.log('\n❌ Transaction rejected');
        console.log('Error object:', result.error);
        console.log('Error message:', result.error?.message);
        console.log('Error string:', String(result.error));
      }
    } catch (error: any) {
      console.log('\n💥 EXCEPTION:', error);
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
    }

    // Пауза между попытками
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

testAllVariants().catch(console.error);
