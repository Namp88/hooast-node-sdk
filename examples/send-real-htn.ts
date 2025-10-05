import { HoosatNode } from '../src';
import { CryptoUtils } from '../src/utils/crypto.utils';
import { TransactionBuilder } from '../src/transaction/transaction.builder';
import { HoosatUtils } from '../src/utils/utils';

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
  console.log(`   Address: ${wallet.address}`);
  console.log(`   PubKey: ${wallet.publicKey.toString('hex')}\n`);

  // 3. Проверяем баланс
  console.log('3️⃣ Checking balance...');
  const balance = await node.getBalance(wallet.address);

  if (!balance.ok) {
    console.error('❌ Error:', balance.error);
    return;
  }

  console.log(`   Balance: ${HoosatUtils.sompiToAmount(balance.result.balance)} HTN\n`);

  if (balance.result.balance === '0') {
    console.log('⚠️  No funds available for testing');
    return;
  }

  // 4. Получаем UTXOs
  console.log('4️⃣ Fetching UTXOs...');
  const utxos = await node.getUtxosByAddresses([wallet.address]);

  if (!utxos.ok || utxos.result.utxos.length === 0) {
    console.error('❌ No UTXOs found');
    return;
  }

  const utxo = utxos.result.utxos[0];
  console.log(`✅ Found ${utxos.result.utxos.length} UTXOs`);
  console.log(`   Using UTXO: ${utxo.outpoint.transactionId.slice(0, 20)}...`);
  console.log(`   Amount: ${HoosatUtils.sompiToAmount(utxo.utxoEntry.amount)} HTN`);
  console.log(`   ScriptPubKey: ${utxo.utxoEntry.scriptPublicKey.scriptPublicKey}`);
  console.log(`   Version: ${utxo.utxoEntry.scriptPublicKey.version}\n`);

  // 🔍 КРИТИЧНО: Проверяем соответствие pubkey
  const scriptBuf = Buffer.from(utxo.utxoEntry.scriptPublicKey.scriptPublicKey, 'hex');
  if (scriptBuf.length >= 35 && scriptBuf[0] === 0x21) {
    const pubkeyInScript = scriptBuf.slice(1, 34);
    console.log('🔑 PubKey verification:');
    console.log(`   From UTXO: ${pubkeyInScript.toString('hex')}`);
    console.log(`   Our wallet: ${wallet.publicKey.toString('hex')}`);

    if (!pubkeyInScript.equals(wallet.publicKey)) {
      console.error('❌ CRITICAL: PubKey mismatch! This UTXO belongs to different address!');
      return;
    }
    console.log('   ✅ Match!\n');
  }

  // 5. Создаем транзакцию
  const recipientAddress = 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74';
  const amountToSend = '0.01';

  console.log('5️⃣ Building transaction:');
  console.log(`   Send: ${amountToSend} HTN`);
  console.log(`   To: ${recipientAddress.slice(0, 30)}...\n`);

  try {
    const inputAmount = BigInt(utxo.utxoEntry.amount);
    const sendAmount = BigInt(HoosatUtils.amountToSompi(amountToSend));
    const fee = 100000n;
    const change = inputAmount - sendAmount - fee;

    if (change < 0n) {
      console.error('❌ Insufficient funds');
      return;
    }

    // ✅ ИСПРАВЛЕНО: Используем версию из ноды!
    const utxoForSigning = {
      outpoint: utxo.outpoint,
      utxoEntry: {
        amount: utxo.utxoEntry.amount,
        scriptPublicKey: {
          script: utxo.utxoEntry.scriptPublicKey.scriptPublicKey,
          version: utxo.utxoEntry.scriptPublicKey.version, // ✅ Из ноды!
        },
        blockDaaScore: utxo.utxoEntry.blockDaaScore,
        isCoinbase: utxo.utxoEntry.isCoinbase,
      },
    };

    console.log('📦 UTXO for signing prepared:');
    console.log(JSON.stringify(utxoForSigning, null, 2));

    const builder = new TransactionBuilder();
    builder.addInput(utxoForSigning, wallet.privateKey);
    builder.addOutput(recipientAddress, sendAmount.toString());
    builder.addOutput(wallet.address, change.toString());
    builder.setFee(fee.toString());

    console.log('\n📊 Transaction amounts:');
    console.log(`   Input: ${HoosatUtils.sompiToAmount(inputAmount)} HTN`);
    console.log(`   Send: ${HoosatUtils.sompiToAmount(sendAmount)} HTN`);
    console.log(`   Fee: ${HoosatUtils.sompiToAmount(fee)} HTN`);
    console.log(`   Change: ${HoosatUtils.sompiToAmount(change)} HTN\n`);

    // 6. Подписываем (с полным debug)
    console.log('6️⃣ Signing transaction...\n');
    const signedTx = await builder.sign();

    const txId = CryptoUtils.getTransactionId(signedTx);
    console.log(`✅ Transaction signed!`);
    console.log(`   TX ID: ${txId}\n`);

    // Детальный анализ signature
    console.log('🔍 Signature analysis:');
    const sigScript = signedTx.inputs[0].signatureScript;
    const sigScriptBuf = Buffer.from(sigScript, 'hex');

    console.log(`   SigScript length: ${sigScriptBuf.length} bytes`);
    console.log(`   SigScript hex: ${sigScript}`);
    console.log(`   First byte (length): 0x${sigScriptBuf[0].toString(16)} (${sigScriptBuf[0]})`);

    if (sigScriptBuf[0] === 0x41) {
      const signature = sigScriptBuf.slice(1, 65);
      const hashType = sigScriptBuf[65];
      console.log(`   ✅ Format correct: 0x41 + 64-byte sig + hashType`);
      console.log(`   Signature: ${signature.toString('hex')}`);
      console.log(`   HashType: 0x${hashType.toString(16)}\n`);
    } else {
      console.log(`   ⚠️  Unexpected format!\n`);
    }

    // 7. Отправляем
    console.log('7️⃣ Submitting to network...');
    console.log('⚠️  This will send REAL HTN!\n');

    const result = await node.submitTransaction(signedTx);

    if (result.ok) {
      console.log('🎉 SUCCESS! Transaction submitted!');
      console.log(`   TX ID: ${result.result.transactionId}`);
      console.log(`   Explorer: https://explorer.hoosat.fi/tx/${result.result.transactionId}`);
    } else {
      console.error('❌ FAILED:', result.error);

      // Подробный анализ ошибки
      if (result.error.includes('signature not empty on failed checksig')) {
        console.log('\n🔍 Signature verification failed on node side');
        console.log('Possible causes:');
        console.log('1. Wrong signature hash calculation');
        console.log('2. Wrong key used for signing');
        console.log('3. Wrong sighash type');
        console.log('4. Script format mismatch\n');

        // Выводим то, что видит нода
        const errorMatch = result.error.match(/input script bytes ([0-9a-f]+)/i);
        const prevScriptMatch = result.error.match(/prev output script bytes ([0-9a-f]+)/i);

        if (errorMatch && prevScriptMatch) {
          console.log('Node saw:');
          console.log(`   Input script: ${errorMatch[1]}`);
          console.log(`   Prev script: ${prevScriptMatch[1]}\n`);

          // Парсим prev script
          const prevScriptFull = prevScriptMatch[1];
          if (prevScriptFull.startsWith('0000')) {
            console.log('⚠️  Prev script has version prefix 0x0000');
            const scriptOnly = prevScriptFull.slice(4);
            console.log(`   Script only: ${scriptOnly}`);
            console.log(`   Expected: ${utxo.utxoEntry.scriptPublicKey.scriptPublicKey}`);
            console.log(`   Match: ${scriptOnly === utxo.utxoEntry.scriptPublicKey.scriptPublicKey ? '✅' : '❌'}\n`);
          }
        }
      }
    }
  } catch (error: any) {
    console.error('💥 Exception:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  }
}

testRealSigning().catch(console.error);
