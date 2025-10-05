// examples/test-real-signing.ts
import { HoosatNode } from '../src';
import { CryptoUtils, TransactionBuilder } from '../src/utils/crypto.utils';

async function testRealSigning() {
  console.log('🌐 Testing with Real Node\n');

  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  // 1. Проверка ноды
  console.log('1️⃣ Checking node connection...');
  const info = await node.getInfo();

  if (!info.ok) {
    console.error('❌ Node unavailable:', info.error);
    return;
  }

  console.log(`✅ Connected to ${info.result.serverVersion}`);
  console.log(`   Synced: ${info.result.isSynced}`);
  console.log(`   UTXO Indexed: ${info.result.isUtxoIndexed}\n`);

  // 2. Восстанавливаем тестовый кошелек
  const privateKeyHex = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';
  const wallet = CryptoUtils.importKeyPair(privateKeyHex);

  console.log('2️⃣ Wallet restored:');
  console.log(`   Address: ${wallet.address}\n`);

  // 3. Проверяем баланс
  console.log('3️⃣ Checking balance...');
  const balance = await node.getBalance(wallet.address);

  if (!balance.ok) {
    console.error('❌ Error:', balance.error);
    return;
  }

  console.log(`   Balance: ${node.formatAmount(balance.result.balance)} HTN\n`);

  if (balance.result.balance === '0') {
    console.log('⚠️  No funds available for testing');
    console.log(`   Send some HTN to: ${wallet.address}\n`);
    return;
  }

  // 4. Получаем UTXOs
  console.log('4️⃣ Fetching UTXOs...');
  const utxos = await node.getUtxosByAddresses([wallet.address]);

  if (!utxos.ok || utxos.result.utxos.length === 0) {
    console.error('❌ No UTXOs found');
    return;
  }

  console.log(`✅ Found ${utxos.result.utxos.length} UTXOs\n`);

  // 5. Создаем тестовую транзакцию
  const recipientAddress = 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74';
  const amountToSend = '0.01'; // Маленькая сумма для теста

  console.log('5️⃣ Building transaction:');
  console.log(`   Send: ${amountToSend} HTN`);
  console.log(`   To: ${recipientAddress.slice(0, 30)}...\n`);

  try {
    // Выбираем первый UTXO
    const utxo = utxos.result.utxos[0];

    console.log('\n🔍 UTXO Debug:');
    console.log('UTXO scriptPubKey:', utxo.utxoEntry.scriptPublicKey.scriptPublicKey);

    // Извлекаем pubkey из scriptPubKey
    const scriptBuf = Buffer.from(utxo.utxoEntry.scriptPublicKey.scriptPublicKey, 'hex');
    const pubkeyFromScript = scriptBuf.slice(1, -1); // Убираем первый байт (len) и последний (opcode)
    console.log('PubKey from UTXO:', pubkeyFromScript.toString('hex'));
    console.log('Our wallet PubKey:', wallet.publicKey.toString('hex'));
    console.log('Match:', pubkeyFromScript.equals(wallet.publicKey) ? '✅' : '❌');

    if (!pubkeyFromScript.equals(wallet.publicKey)) {
      console.log('\n⚠️  WARNING: UTXO belongs to different address!');
      console.log('This UTXO cannot be spent with this private key!');
      return;
    }
    const inputAmount = BigInt(utxo.utxoEntry.amount);
    const sendAmount = BigInt(node.parseAmount(amountToSend));
    const fee = 100000n; // 0.001 HTN
    const change = inputAmount - sendAmount - fee;

    if (change < 0n) {
      console.error('❌ Insufficient funds in UTXO');
      return;
    }

    // Создаем транзакцию
    const builder = new TransactionBuilder();

    // ВАЖНО: правильный формат UTXO для подписи
    const utxoForSigning = {
      outpoint: utxo.outpoint,
      utxoEntry: {
        amount: utxo.utxoEntry.amount,
        scriptPublicKey: {
          script: utxo.utxoEntry.scriptPublicKey.scriptPublicKey,
          version: 0, // ECDSA всегда версия 0
        },
        blockDaaScore: utxo.utxoEntry.blockDaaScore,
        isCoinbase: utxo.utxoEntry.isCoinbase,
      },
    };

    console.log('UTXO for signing:', JSON.stringify(utxoForSigning, null, 2));

    builder.addInput(utxoForSigning, wallet.privateKey);
    builder.addOutput(recipientAddress, sendAmount.toString());
    builder.addOutput(wallet.address, change.toString());
    builder.setFee(fee.toString());

    console.log('   Transaction details:');
    console.log(`   - Input: ${node.formatAmount(inputAmount)} HTN`);
    console.log(`   - Send: ${node.formatAmount(sendAmount)} HTN`);
    console.log(`   - Fee: ${node.formatAmount(fee)} HTN`);
    console.log(`   - Change: ${node.formatAmount(change)} HTN\n`);

    // Подписываем
    console.log('6️⃣ Signing transaction...');
    const signedTx = await builder.sign();

    const txId = CryptoUtils.getTransactionId(signedTx);
    console.log(`✅ Transaction signed`);
    console.log(`   TX ID: ${txId}\n`);

    // Проверяем signature script
    console.log('📝 SignatureScript check:');
    const sigScript = signedTx.inputs[0].signatureScript;
    console.log(`   Length: ${sigScript.length / 2} bytes`);
    console.log(`   Hex (first 40 chars): ${sigScript.slice(0, 40)}...\n`);

    // 7. Отправляем в сеть
    console.log('7️⃣ Submitting to network...');
    console.log('⚠️  This will send REAL HTN!\n');

    // Раскомментируй для реальной отправки:
    const result = await node.submitTransaction(signedTx);

    if (result.ok) {
      console.log('✅ Transaction submitted successfully!');
      console.log(`   TX ID: ${result.result.transactionId}`);
      console.log(`   Explorer: https://explorer.hoosat.fi/tx/${result.result.transactionId}`);
    } else {
      console.error('❌ Submission failed:', result.error);

      // Детальный анализ ошибки
      if (result.error.includes('signature')) {
        console.log('\n🔍 Signature error detected');
        console.log('   Possible issues:');
        console.log('   1. Wrong signature format');
        console.log('   2. Wrong signature hash calculation');
        console.log('   3. Wrong scriptPubKey interpretation');
      }
    }

    console.log('ℹ️  Transaction NOT submitted (test mode)');
    console.log('   Uncomment code above to send real transaction');
  } catch (error: any) {
    console.error('💥 Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

testRealSigning().catch(console.error);
