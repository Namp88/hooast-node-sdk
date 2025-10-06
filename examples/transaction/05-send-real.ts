/**
 * Example 05: Send Real Transaction
 *
 * ⚠️  WARNING: This example broadcasts a REAL transaction to the network!
 *
 * What you'll learn:
 * - Connect to real Hoosat node
 * - Import existing wallet from private key
 * - Fetch real UTXOs from blockchain
 * - Estimate optimal fee from network conditions
 * - Build and sign transaction with real data
 * - Submit transaction to network
 * - Monitor transaction confirmation
 *
 * Prerequisites:
 * - Access to Hoosat node (mainnet or testnet)
 * - Private key with sufficient balance
 * - Valid recipient address
 */
import { FeeEstimator, FeePriority, HoosatCrypto, HoosatNode, HoosatUtils, TransactionBuilder, UtxoForSigning } from '../../src';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   💸 EXAMPLE 05: SEND REAL TRANSACTION');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== CONFIGURATION ====================
  console.log('⚙️  Configuration');
  console.log('─────────────────────────────────────');

  const NODE_HOST = '54.38.176.95';
  const NODE_PORT = 42420;
  const PRIVATE_KEY = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';
  const RECIPIENT = 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74';
  const AMOUNT_HTN = '0.01'; // Amount to send in HTN
  const FEE_PRIORITY = FeePriority.Normal; // Fee priority: Low, Normal, High, Urgent

  console.log(`Node:      ${NODE_HOST}:${NODE_PORT}`);
  console.log(`Recipient: ${RECIPIENT.slice(0, 30)}...`);
  console.log(`Amount:    ${AMOUNT_HTN} HTN`);
  console.log(`Priority:  ${FEE_PRIORITY}\n`);

  // ==================== WARNINGS ====================
  console.log('⚠️  CRITICAL WARNINGS');
  console.log('─────────────────────────────────────');
  console.log('1. This will send REAL HTN on the network');
  console.log('2. Transaction CANNOT be reversed once confirmed');
  console.log('3. Double-check recipient address carefully');
  console.log('4. Make sure you have enough balance + fees');
  console.log('5. Test on testnet first before using mainnet');
  console.log();
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  // Wait 5 seconds to allow user to cancel
  await new Promise(resolve => setTimeout(resolve, 5000));

  // ==================== STEP 1: CONNECT TO NODE ====================
  console.log('1️⃣  Connecting to Hoosat Node');
  console.log('═════════════════════════════════════');

  const node = new HoosatNode({
    host: NODE_HOST,
    port: NODE_PORT,
    timeout: 15000,
  });

  try {
    const nodeInfo = await node.getInfo();
    if (!nodeInfo.ok || !nodeInfo.result) {
      throw new Error('Failed to connect to node');
    }

    console.log('✅ Connected successfully');
    console.log(`   Server Version: ${nodeInfo.result.serverVersion}`);
    console.log(`   Is Synced:      ${nodeInfo.result.isSynced}`);
    console.log(`   Has UTXO Index: ${nodeInfo.result.isUtxoIndexed}\n`);

    if (!nodeInfo.result.isSynced) {
      console.log('⚠️  Warning: Node is not fully synced');
      console.log('   Transaction may fail or be delayed\n');
    }

    if (!nodeInfo.result.isUtxoIndexed) {
      throw new Error('Node must have UTXO index enabled (--utxoindex flag)');
    }
  } catch (error) {
    console.error('❌ Failed to connect to node:', error);
    process.exit(1);
  }

  // ==================== STEP 2: IMPORT WALLET ====================
  console.log('2️⃣  Import Wallet from Private Key');
  console.log('═════════════════════════════════════');

  let wallet;
  try {
    wallet = HoosatCrypto.importKeyPair(PRIVATE_KEY);
    console.log('✅ Wallet imported successfully');
    console.log(`   Address:     ${wallet.address}`);
    console.log(`   Public Key:  ${wallet.publicKey.toString('hex').slice(0, 32)}...`);
    console.log(`   Private Key: ${'*'.repeat(64)}\n`);
  } catch (error) {
    console.error('❌ Failed to import wallet:', error);
    process.exit(1);
  }

  // ==================== STEP 3: VALIDATE RECIPIENT ====================
  console.log('3️⃣  Validate Recipient Address');
  console.log('═════════════════════════════════════');

  if (!HoosatUtils.isValidAddress(RECIPIENT)) {
    console.error('❌ Invalid recipient address');
    process.exit(1);
  }

  console.log('✅ Recipient address is valid');
  console.log(`   Address: ${RECIPIENT}\n`);

  // ==================== STEP 4: FETCH UTXOs ====================
  console.log('4️⃣  Fetch UTXOs from Blockchain');
  console.log('═════════════════════════════════════');

  let utxos;
  try {
    const utxoResponse = await node.getUtxosByAddresses([wallet.address]);

    if (!utxoResponse.ok || !utxoResponse.result) {
      throw new Error('Failed to fetch UTXOs');
    }

    utxos = utxoResponse.result.utxos;
    console.log(`✅ Found ${utxos.length} UTXO(s)\n`);

    if (utxos.length === 0) {
      console.error('❌ No UTXOs available');
      console.error('   Wallet has no funds or all funds are unconfirmed');
      process.exit(1);
    }

    // Display UTXOs
    console.log('Available UTXOs:');
    console.log('─────────────────────────────────────');
    let totalBalance = 0n;

    utxos.forEach((utxo, index) => {
      const amount = BigInt(utxo.utxoEntry.amount);
      totalBalance += amount;

      console.log(`UTXO ${index + 1}:`);
      console.log(`  TX ID:    ${HoosatUtils.truncateHash(utxo.outpoint.transactionId)}`);
      console.log(`  Index:    ${utxo.outpoint.index}`);
      console.log(`  Amount:   ${HoosatUtils.sompiToAmount(amount)} HTN`);
      console.log(`  Coinbase: ${utxo.utxoEntry.isCoinbase}`);
      console.log();
    });

    console.log(`Total Balance: ${HoosatUtils.sompiToAmount(totalBalance)} HTN\n`);
  } catch (error) {
    console.error('❌ Failed to fetch UTXOs:', error);
    process.exit(1);
  }

  // ==================== STEP 5: ESTIMATE FEE FROM NETWORK ====================
  console.log('5️⃣  Estimate Fee from Network');
  console.log('═════════════════════════════════════');

  const feeEstimator = new FeeEstimator(node);
  const feeRecommendations = await feeEstimator.getRecommendations();

  console.log('Network Conditions:');
  console.log(`  Mempool Size:     ${feeRecommendations.mempoolSize} transactions`);
  console.log(`  Average Fee Rate: ${feeRecommendations.averageFeeRate} sompi/byte`);
  console.log(`  Median Fee Rate:  ${feeRecommendations.medianFeeRate} sompi/byte\n`);

  console.log('Fee Rate Options:');
  console.log(`  Low:    ${feeRecommendations.low.feeRate} sompi/byte`);
  console.log(`  Normal: ${feeRecommendations.normal.feeRate} sompi/byte`);
  console.log(`  High:   ${feeRecommendations.high.feeRate} sompi/byte`);
  console.log(`  Urgent: ${feeRecommendations.urgent.feeRate} sompi/byte\n`);

  const selectedFeeRate = feeRecommendations[FEE_PRIORITY].feeRate;
  console.log(`✅ Selected ${FEE_PRIORITY} priority: ${selectedFeeRate} sompi/byte\n`);

  // ==================== STEP 6: BUILD TRANSACTION ====================
  console.log('6️⃣  Build Transaction');
  console.log('═════════════════════════════════════');

  const sendAmountSompi = HoosatUtils.amountToSompi(AMOUNT_HTN);
  const sendAmount = BigInt(sendAmountSompi);

  console.log('Transaction Details:');
  console.log(`  From:   ${wallet.address.slice(0, 30)}...`);
  console.log(`  To:     ${RECIPIENT.slice(0, 30)}...`);
  console.log(`  Amount: ${AMOUNT_HTN} HTN (${sendAmountSompi} sompi)\n`);

  // Select UTXOs for transaction
  let selectedUtxos: typeof utxos = [];
  let selectedAmount = 0n;

  for (const utxo of utxos) {
    selectedUtxos.push(utxo);
    selectedAmount += BigInt(utxo.utxoEntry.amount);

    // Estimate fee for current number of inputs using dynamic rate
    const estimatedFee = BigInt(HoosatCrypto.calculateFee(selectedUtxos.length, 2, selectedFeeRate));

    // Check if we have enough (amount + fee + some buffer)
    if (selectedAmount >= sendAmount + estimatedFee) {
      break;
    }
  }

  console.log('Selected UTXOs:');
  console.log('─────────────────────────────────────');
  selectedUtxos.forEach((utxo, index) => {
    console.log(
      `  ${index + 1}. ${HoosatUtils.truncateHash(utxo.outpoint.transactionId)}:${utxo.outpoint.index} - ${HoosatUtils.sompiToAmount(utxo.utxoEntry.amount)} HTN`
    );
  });
  console.log();

  // Calculate final amounts
  const numInputs = selectedUtxos.length;
  const numOutputs = 2; // Recipient + change
  const estimatedFee = BigInt(HoosatCrypto.calculateFee(numInputs, numOutputs, selectedFeeRate));
  const changeAmount = selectedAmount - sendAmount - estimatedFee;

  if (changeAmount < 0n) {
    console.error('❌ Insufficient funds');
    console.error(`   Selected: ${HoosatUtils.sompiToAmount(selectedAmount)} HTN`);
    console.error(`   Need:     ${HoosatUtils.sompiToAmount(sendAmount + estimatedFee)} HTN`);
    console.error(`   Missing:  ${HoosatUtils.sompiToAmount(-changeAmount)} HTN`);
    process.exit(1);
  }

  console.log('Transaction Breakdown:');
  console.log('─────────────────────────────────────');
  console.log(`  Total Input:     ${HoosatUtils.sompiToAmount(selectedAmount)} HTN`);
  console.log(`  Send Amount:     ${HoosatUtils.sompiToAmount(sendAmount)} HTN`);
  console.log(`  Estimated Fee:   ${HoosatUtils.sompiToAmount(estimatedFee)} HTN`);
  console.log(`  Change:          ${HoosatUtils.sompiToAmount(changeAmount)} HTN`);
  console.log();
  console.log(`  Inputs:  ${numInputs}`);
  console.log(`  Outputs: ${numOutputs}`);
  console.log(`  Est. Size: ~${HoosatCrypto.estimateTransactionSize(numInputs, numOutputs)} bytes\n`);

  // ==================== STEP 7: SIGN TRANSACTION ====================
  console.log('7️⃣  Sign Transaction');
  console.log('═════════════════════════════════════');

  let signedTx;
  try {
    const builder = new TransactionBuilder({ debug: false });

    // Add all selected inputs
    for (const utxo of selectedUtxos) {
      const utxoForSigning: UtxoForSigning = {
        outpoint: {
          transactionId: utxo.outpoint.transactionId,
          index: utxo.outpoint.index,
        },
        utxoEntry: {
          amount: utxo.utxoEntry.amount,
          scriptPublicKey: {
            script: utxo.utxoEntry.scriptPublicKey.scriptPublicKey,
            version: utxo.utxoEntry.scriptPublicKey.version,
          },
          blockDaaScore: utxo.utxoEntry.blockDaaScore,
          isCoinbase: utxo.utxoEntry.isCoinbase,
        },
      };

      builder.addInput(utxoForSigning, wallet.privateKey);
    }

    // Add recipient output
    builder.addOutput(RECIPIENT, sendAmount.toString());

    // Add change output (if not dust)
    if (changeAmount >= 1000n) {
      builder.addOutput(wallet.address, changeAmount.toString());
    } else {
      console.log('ℹ️  Change amount is dust, adding to fee instead\n');
    }

    // Set fee
    builder.setFee(estimatedFee.toString());

    // Sign transaction
    signedTx = builder.sign();

    const txId = HoosatCrypto.getTransactionId(signedTx);

    console.log('✅ Transaction signed successfully');
    console.log(`   TX ID: ${txId}`);
    console.log(`   Size:  ${JSON.stringify(signedTx).length} bytes (JSON)\n`);

    // Display transaction summary
    console.log('Transaction Summary:');
    console.log('─────────────────────────────────────');
    console.log(`  Inputs:  ${signedTx.inputs.length}`);
    console.log(`  Outputs: ${signedTx.outputs.length}`);
    console.log();

    signedTx.inputs.forEach((input, index) => {
      console.log(`  Input ${index + 1}:`);
      console.log(`    Outpoint: ${HoosatUtils.truncateHash(input.previousOutpoint.transactionId)}:${input.previousOutpoint.index}`);
      console.log(`    SigScript: ${input.signatureScript.slice(0, 40)}...`);
    });
    console.log();

    signedTx.outputs.forEach((output, index) => {
      const addr = output.scriptPublicKey.scriptPublicKey;
      console.log(`  Output ${index + 1}:`);
      console.log(`    Amount: ${HoosatUtils.sompiToAmount(output.amount)} HTN`);
      console.log(`    Script: ${addr.slice(0, 40)}...`);
    });
    console.log();
  } catch (error) {
    console.error('❌ Failed to sign transaction:', error);
    process.exit(1);
  }

  // ==================== STEP 8: SUBMIT TRANSACTION ====================
  console.log('8️⃣  Submit Transaction to Network');
  console.log('═════════════════════════════════════');
  console.log('⚠️  Final confirmation before broadcasting...\n');

  console.log('You are about to send:');
  console.log(`  ${AMOUNT_HTN} HTN to ${RECIPIENT.slice(0, 30)}...`);
  console.log(`  Fee: ~${HoosatUtils.sompiToAmount(estimatedFee)} HTN\n`);

  console.log('Submitting in 3 seconds... (Ctrl+C to cancel)\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const submitResult = await node.submitTransaction(signedTx);

    if (!submitResult.ok || !submitResult.result) {
      throw new Error(submitResult.error || 'Transaction rejected by node');
    }

    const txId = submitResult.result.transactionId;

    console.log('✅ Transaction submitted successfully!');
    console.log(`   TX ID: ${txId}\n`);

    console.log('Transaction Status:');
    console.log('─────────────────────────────────────');
    console.log('✅ Broadcast to network');
    console.log('⏳ Waiting for confirmation...');
    console.log();
    console.log('You can track your transaction:');
    console.log(`   TX ID: ${txId}`);
    console.log();
  } catch (error) {
    console.error('❌ Failed to submit transaction');
    console.error(`   Error: ${error}`);
    console.error();
    console.error('Common reasons for rejection:');
    console.error('  • Insufficient balance (balance changed since UTXOs fetched)');
    console.error('  • UTXOs already spent (double-spend attempt)');
    console.error('  • Fee too low');
    console.error('  • Invalid signature');
    console.error('  • Network congestion');
    process.exit(1);
  }

  // ==================== STEP 9: VERIFY TRANSACTION ====================
  console.log('9️⃣  Verify Transaction');
  console.log('═════════════════════════════════════');

  console.log('Checking mempool...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    const txId = HoosatCrypto.getTransactionId(signedTx);
    const mempoolEntry = await node.getMempoolEntry(txId);

    if (mempoolEntry.ok && mempoolEntry.result) {
      console.log('✅ Transaction found in mempool');
      console.log(`   Fee: ${HoosatUtils.sompiToAmount(mempoolEntry.result!.fee!.toString())} HTN`);
      console.log(`   Size: ${mempoolEntry.result.mass} bytes`);
      console.log();
      console.log('Transaction is waiting to be included in a block...');
    } else {
      console.log('ℹ️  Transaction not yet in mempool (may take a few seconds)');
      console.log('   This is normal - check again in a few moments');
    }
  } catch (error) {
    console.log('ℹ️  Could not verify mempool status');
    console.log('   Transaction may still be processing');
  }

  console.log();

  // ==================== COMPLETION ====================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   ✅ TRANSACTION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Summary:');
  console.log(`  ✅ Sent ${AMOUNT_HTN} HTN to recipient`);
  console.log(`  ✅ Fee: ~${HoosatUtils.sompiToAmount(estimatedFee)} HTN`);
  console.log(`  ✅ Transaction broadcast to network`);
  console.log();
  console.log('Next Steps:');
  console.log('  • Monitor your wallet for confirmation');
  console.log('  • Wait for block inclusion (usually < 1 minute)');
  console.log('  • Transaction is final after confirmation');
  console.log();
  console.log('⚠️  Remember:');
  console.log('  • Blockchain transactions are irreversible');
  console.log('  • Always verify recipient address carefully');
  console.log('  • Keep your private keys secure');
  console.log();

  // Cleanup
  node.disconnect();
  console.log('✅ Disconnected from node\n');
}

// Run example
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
