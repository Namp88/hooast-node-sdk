import { CryptoUtils, TransactionBuilder } from '../src/utils/crypto.utils';

async function testSigning() {
  console.log('🔐 Тест подписи транзакций\n');

  // 1. Создаем кошельки
  const sender = CryptoUtils.generateKeyPair();
  const recipient = CryptoUtils.generateKeyPair();

  console.log(`Sender: ${sender.address}`);
  console.log(`Recipient: ${recipient.address}\n`);

  // 2. Создаем mock UTXO
  const mockUtxo = {
    outpoint: {
      transactionId: 'a'.repeat(64),
      index: 0,
    },
    utxoEntry: {
      amount: '200000000', // 2 HTN
      scriptPublicKey: CryptoUtils.addressToScriptPublicKey(sender.address).toString('hex'),
      blockDaaScore: '1000',
      isCoinbase: false,
    },
  };

  console.log('📦 Mock UTXO created');
  console.log(`   Amount: ${CryptoUtils.formatAmount(mockUtxo.utxoEntry.amount)} HTN\n`);

  // 3. Создаем транзакцию
  const builder = new TransactionBuilder();

  try {
    const transaction = await builder
      .addInput(mockUtxo, sender.privateKey)
      .addOutput(recipient.address, '100000000') // 1 HTN
      .addOutput(sender.address, '99000000') // 0.99 HTN change
      .setFee('1000000') // 0.01 HTN fee
      .sign();

    console.log('✅ Транзакция создана и подписана:');
    console.log(`   Inputs: ${transaction.inputs.length}`);
    console.log(`   Outputs: ${transaction.outputs.length}`);
    console.log(`   Version: ${transaction.version}`);
    console.log(`   LockTime: ${transaction.lockTime}`);

    // Проверяем подписи
    const hasSignature = transaction.inputs[0].signatureScript && transaction.inputs[0].signatureScript.length > 0;
    console.log(`   ✅ Signature present: ${hasSignature}`);

    if (hasSignature) {
      console.log(`   Signature (first 40 chars): ${transaction.inputs[0].signatureScript.slice(0, 40)}...`);
    }

    // Получаем Transaction ID
    const txId = CryptoUtils.getTransactionId(transaction);
    console.log(`   Transaction ID: ${txId}\n`);

    // Проверяем верификацию подписи
    const sigScript = Buffer.from(transaction.inputs[0].signatureScript, 'hex');
    const sigLength = sigScript[0];
    const rawSig = sigScript.slice(1, 1 + sigLength - 1); // Без SigHashType байта

    const isValid = CryptoUtils.verifyTransactionSignature(transaction, 0, rawSig, sender.publicKey, mockUtxo);

    console.log(`✅ Signature verification: ${isValid ? 'VALID ✅' : 'INVALID ❌'}`);

    if (isValid) {
      console.log('\n🎉 Тест подписи ПОЛНОСТЬЮ пройден!');
    } else {
      console.log('\n⚠️  Подпись создана, но верификация не прошла - нужна проверка');
    }
  } catch (error) {
    console.error('❌ Ошибка:', error);
    throw error;
  }
}

// Запускаем тест
testSigning().catch(error => {
  console.error('💥 Критическая ошибка:', error);
  process.exit(1);
});
