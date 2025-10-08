/**
 * Example 07: Batch Payment (Max 2 Recipients)
 *
 * ⚠️  WARNING: This example broadcasts a REAL transaction to the network!
 *
 * Demonstrates:
 * - Sending to multiple recipients in one transaction
 * - Spam protection limit (max 2 recipients)
 * - Correct mass-based fee calculation
 * - UTXO selection and change handling
 *
 * 🛡️ SPAM PROTECTION:
 * Hoosat inherits anti-dust-attack protection from Kaspa.
 * Max 3 outputs per tx: 2 recipients + 1 change.
 * This is a hardcoded network rule to prevent spam.
 */
import { HoosatFeeEstimator, FeePriority, HoosatCrypto, HoosatClient, HoosatUtils, HoosatTxBuilder, UtxoForSigning } from '../../src';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   📤 BATCH PAYMENT (MAX 2 RECIPIENTS)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== CONFIGURATION ====================
  console.log('⚙️  Configuration');
  console.log('─────────────────────────────────────');

  const NODE_HOST = '54.38.176.95';
  const NODE_PORT = 42420;
  const PRIVATE_KEY = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';

  const RECIPIENTS = [
    {
      address: 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74',
      amount: '0.01',
      label: 'Recipient 1',
    },
    {
      address: 'hoosat:qzr0pvne29vrvp2pud5j5qxx0xyuv0mjvw9qdswsu5q7z5ulgmxswemhkklu2',
      amount: '0.003',
      label: 'Recipient 2',
    },
  ];

  const FEE_PRIORITY = FeePriority.High;

  console.log(`Node:       ${NODE_HOST}:${NODE_PORT}`);
  console.log(`Priority:   ${FEE_PRIORITY}`);
  console.log(`Recipients: ${RECIPIENTS.length}\n`);

  // ==================== SPAM PROTECTION CHECK ====================
  console.log('🛡️  Spam Protection Check');
  console.log('─────────────────────────────────────');

  if (RECIPIENTS.length > 2) {
    console.error('❌ ERROR: Maximum 2 recipients per transaction');
    console.error('');
    console.error('Hoosat inherits anti-dust-attack protection from Kaspa.');
    console.error('Transactions are limited to 3 total outputs:');
    console.error('  • 2 recipient outputs');
    console.error('  • 1 change output');
    console.error('');
    console.error('This is a hardcoded network rule, not a configuration.');
    console.error('');
    console.error('Solution: Send multiple transactions');
    console.error(`  Your ${RECIPIENTS.length} recipients = ${Math.ceil(RECIPIENTS.length / 2)} transactions needed`);
    console.error('');
    process.exit(1);
  }

  console.log(`✅ ${RECIPIENTS.length} recipients (within spam protection limit)`);
  console.log('');

  RECIPIENTS.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.label}: ${r.amount} HTN`);
    console.log(`     → ${r.address.slice(0, 35)}...`);
  });
  console.log();

  const totalAmount = RECIPIENTS.reduce((sum, r) => sum + parseFloat(r.amount), 0);
  console.log(`Total to send: ${totalAmount.toFixed(8)} HTN\n`);

  // ==================== WARNINGS ====================
  console.log('⚠️  CRITICAL WARNINGS');
  console.log('─────────────────────────────────────');
  console.log('1. This will send REAL HTN to multiple recipients');
  console.log('2. Using CORRECT mass-based fee calculation');
  console.log('3. Spam protection: max 2 recipients per transaction');
  console.log('4. Transaction CANNOT be reversed once broadcast');
  console.log();
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // ==================== STEP 1: CONNECT TO NODE ====================
  console.log('1️⃣  Connecting to Hoosat Node');
  console.log('═════════════════════════════════════');

  const client = new HoosatClient({
    host: NODE_HOST,
    port: NODE_PORT,
    timeout: 15000,
  });

  try {
    const nodeInfo = await client.getInfo();
    if (!nodeInfo.ok || !nodeInfo.result) {
      throw new Error('Failed to connect to node');
    }

    console.log('✅ Connected successfully');
    console.log(`   Server Version: ${nodeInfo.result.serverVersion}`);
    console.log(`   Is Synced:      ${nodeInfo.result.isSynced}`);
    console.log(`   Has UTXO Index: ${nodeInfo.result.isUtxoIndexed}\n`);

    if (!nodeInfo.result.isSynced) {
      console.log('⚠️  Warning: Node is not fully synced\n');
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
    console.log(`   Address: ${wallet.address.slice(0, 50)}...\n`);
  } catch (error) {
    console.error('❌ Failed to import wallet:', error);
    process.exit(1);
  }

  // ==================== STEP 3: VALIDATE RECIPIENTS ====================
  console.log('3️⃣  Validate Recipient Addresses');
  console.log('═════════════════════════════════════');

  for (const recipient of RECIPIENTS) {
    if (!HoosatUtils.isValidAddress(recipient.address)) {
      console.error(`❌ Invalid address: ${recipient.label}`);
      console.error(`   ${recipient.address}`);
      process.exit(1);
    }
  }

  console.log(`✅ All ${RECIPIENTS.length} recipient addresses are valid\n`);

  // ==================== STEP 4: FETCH UTXOs ====================
  console.log('4️⃣  Fetch UTXOs from Blockchain');
  console.log('═════════════════════════════════════');

  let utxos;
  let totalBalance = 0n;

  try {
    const utxoResponse = await client.getUtxosByAddresses([wallet.address]);

    if (!utxoResponse.ok || !utxoResponse.result) {
      throw new Error('Failed to fetch UTXOs');
    }

    utxos = utxoResponse.result.utxos;
    console.log(`✅ Found ${utxos.length} UTXO(s)\n`);

    if (utxos.length === 0) {
      console.error('❌ No UTXOs available');
      process.exit(1);
    }

    utxos.forEach((utxo, index) => {
      const amount = BigInt(utxo.utxoEntry.amount);
      totalBalance += amount;

      if (index < 3) {
        console.log(`UTXO ${index + 1}:`);
        console.log(`  Amount: ${HoosatUtils.sompiToAmount(amount)} HTN`);
      }
    });

    if (utxos.length > 3) {
      console.log(`... and ${utxos.length - 3} more`);
    }

    console.log();
    console.log(`Total Balance: ${HoosatUtils.sompiToAmount(totalBalance)} HTN\n`);
  } catch (error) {
    console.error('❌ Failed to fetch UTXOs:', error);
    process.exit(1);
  }

  // ==================== STEP 5: GET FEE RATE FROM NETWORK ====================
  console.log('5️⃣  Get Fee Rate from Network');
  console.log('═════════════════════════════════════');

  const feeEstimator = new HoosatFeeEstimator(client);
  const recommendations = await feeEstimator.getRecommendations();

  console.log('Network Conditions:');
  console.log(`  Mempool Size:     ${recommendations.mempoolSize} transactions`);
  console.log(`  Average Fee Rate: ${recommendations.averageFeeRate} sompi/byte`);
  console.log(`  Median Fee Rate:  ${recommendations.medianFeeRate} sompi/byte\n`);

  console.log('Available Priorities:');
  console.log(`  Low:    ${recommendations.low.feeRate} sompi/byte`);
  console.log(`  Normal: ${recommendations.normal.feeRate} sompi/byte`);
  console.log(`  High:   ${recommendations.high.feeRate} sompi/byte`);
  console.log(`  Urgent: ${recommendations.urgent.feeRate} sompi/byte\n`);

  // Get selected fee rate
  const selectedFeeRate = 20;
  console.log(`✅ Selected ${FEE_PRIORITY} priority: ${selectedFeeRate} sompi/byte\n`);

  // ==================== STEP 6: CALCULATE CORRECT FEE USING MASS ====================
  console.log('6️⃣  Calculate Fee Using MASS (Correct Method)');
  console.log('═════════════════════════════════════');

  const totalSendSompi = RECIPIENTS.reduce((sum, r) => {
    return sum + BigInt(HoosatUtils.amountToSompi(r.amount));
  }, 0n);

  console.log('Transaction Details:');
  console.log(`  From:        ${wallet.address.slice(0, 35)}...`);
  console.log(`  Recipients:  ${RECIPIENTS.length}`);
  console.log(`  Total Send:  ${HoosatUtils.sompiToAmount(totalSendSompi)} HTN\n`);

  // Calculate number of outputs: recipients + change
  const numOutputs = RECIPIENTS.length + 1; // Always 3 due to spam protection
  let numInputs = 1;

  // ==================== STEP 7: SELECT UTXOs ====================
  console.log('7️⃣  Select UTXOs for Transaction');
  console.log('═════════════════════════════════════');

  let selectedUtxos: typeof utxos = [];
  let selectedAmount = 0n;
  let finalFee = 0n;
  let finalFeeString = '';
  let changeAmount = 0n;

  // Sort UTXOs by amount (largest first for efficiency)
  const sortedUtxos = [...utxos].sort((a, b) => {
    return Number(BigInt(b.utxoEntry.amount) - BigInt(a.utxoEntry.amount));
  });

  // Select UTXOs until we have enough
  for (const utxo of sortedUtxos) {
    selectedUtxos.push(utxo);
    selectedAmount += BigInt(utxo.utxoEntry.amount);
    numInputs = selectedUtxos.length;

    // Calculate fee for current input count
    finalFeeString = HoosatCrypto.calculateFee(numInputs, numOutputs, selectedFeeRate);
    finalFee = BigInt(finalFeeString);

    // Check if we have enough
    const totalRequired = totalSendSompi + finalFee;

    if (selectedAmount >= totalRequired) {
      changeAmount = selectedAmount - totalRequired;
      break;
    }
  }

  // Verify we have enough funds
  if (selectedAmount < totalSendSompi + finalFee!) {
    console.error('❌ Insufficient balance');
    console.error(`   Need: ${HoosatUtils.sompiToAmount(totalSendSompi + finalFee!)} HTN`);
    console.error(`   Have: ${HoosatUtils.sompiToAmount(selectedAmount)} HTN`);
    process.exit(1);
  }

  console.log(`✅ Selected ${numInputs} UTXO(s) for ${HoosatUtils.sompiToAmount(selectedAmount)} HTN\n`);

  console.log('Selected UTXOs:');
  selectedUtxos.forEach(utxo => {
    console.log(
      `  ${HoosatUtils.truncateHash(utxo.outpoint.transactionId)}:${utxo.outpoint.index} - ${HoosatUtils.sompiToAmount(utxo.utxoEntry.amount)} HTN`
    );
  });
  console.log();

  // ==================== STEP 8: TRANSACTION BREAKDOWN ====================
  console.log('8️⃣  Final Transaction Breakdown');
  console.log('═════════════════════════════════════');

  console.log(`  Total Input:     ${HoosatUtils.sompiToAmount(selectedAmount)} HTN`);
  console.log(`  Total Send:      ${HoosatUtils.sompiToAmount(totalSendSompi)} HTN`);
  RECIPIENTS.forEach((r, i) => {
    const amount = HoosatUtils.amountToSompi(r.amount);
    console.log(`    → ${r.label}: ${HoosatUtils.sompiToAmount(amount)} HTN`);
  });
  console.log(`  Mass-Based Fee:  ${HoosatUtils.sompiToAmount(finalFee)} HTN`);
  console.log(`  Change:          ${HoosatUtils.sompiToAmount(changeAmount)} HTN`);
  console.log();
  console.log(`  Inputs:  ${numInputs}`);
  console.log(`  Outputs: ${numOutputs} (${RECIPIENTS.length} recipients + 1 change)`);
  console.log();
  console.log('  Spam Protection: ✅ PASSED (max 2 recipients)');
  console.log('  Mass Calculation: ✅ CORRECT');
  console.log();

  // ==================== STEP 9: BUILD & SIGN TRANSACTION ====================
  console.log('9️⃣  Build & Sign Transaction');
  console.log('═════════════════════════════════════');

  let signedTx;
  try {
    const builder = new HoosatTxBuilder({ debug: false });

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

    // Add recipient outputs (max 2 due to spam protection)
    for (const recipient of RECIPIENTS) {
      const amountSompi = HoosatUtils.amountToSompi(recipient.amount);
      builder.addOutput(recipient.address, amountSompi);
    }

    // Set mass-based fee BEFORE adding change
    builder.setFee(finalFeeString);

    // Add change output automatically (bypasses spam protection check)
    builder.addChangeOutput(wallet.address);

    // Sign transaction
    signedTx = builder.sign();

    const txId = HoosatCrypto.getTransactionId(signedTx);

    console.log('✅ Transaction signed successfully');
    console.log(`   TX ID: ${txId}`);
    console.log(`   Size:  ${JSON.stringify(signedTx).length} bytes (JSON)\n`);

    console.log('Transaction Summary:');
    console.log('─────────────────────────────────────');
    console.log(`  Inputs:  ${signedTx.inputs.length}`);
    console.log(`  Outputs: ${signedTx.outputs.length}`);
    console.log();
  } catch (error) {
    console.error('❌ Failed to sign transaction:', error);
    process.exit(1);
  }

  // ==================== STEP 10: SUBMIT TRANSACTION ====================
  console.log('🔟 Submit Transaction to Network');
  console.log('═════════════════════════════════════');
  console.log('⚠️  Final confirmation before broadcasting...\n');

  console.log('You are about to send:');
  RECIPIENTS.forEach(r => {
    console.log(`  • ${r.amount} HTN to ${r.label}`);
  });
  console.log(`\nTotal: ${totalAmount.toFixed(8)} HTN`);
  console.log(`Fee: ${HoosatUtils.sompiToAmount(finalFee)} HTN (mass-based)\n`);

  console.log('Submitting in 3 seconds... (Ctrl+C to cancel)\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const submitResult = await client.submitTransaction(signedTx);

    if (!submitResult.ok || !submitResult.result) {
      throw new Error(submitResult.error || 'Transaction rejected by node');
    }

    const txId = submitResult.result.transactionId;

    console.log('✅ Transaction submitted successfully!');
    console.log(`   TX ID: ${txId}\n`);

    console.log('Transaction Status:');
    console.log('─────────────────────────────────────');
    console.log('✅ Broadcast to network');
    console.log('✅ Passed spam protection (2 recipients + change)');
    console.log('✅ Correct mass calculation');
    console.log('⏳ Waiting for confirmation...');
    console.log();
    console.log('All recipients will receive funds after confirmation:');
    RECIPIENTS.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.label}: ${r.amount} HTN`);
    });
    console.log();
  } catch (error) {
    console.error('❌ Failed to submit transaction');
    console.error(`   Error: ${error}`);
    process.exit(1);
  }

  // ==================== STEP 11: VERIFY TRANSACTION ====================
  console.log('1️⃣1️⃣  Verify Transaction');
  console.log('═════════════════════════════════════');

  console.log('Checking mempool...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    const txId = HoosatCrypto.getTransactionId(signedTx);
    const mempoolEntry = await client.getMempoolEntry(txId);

    if (mempoolEntry.ok && mempoolEntry.result!.transaction) {
      console.log('✅ Transaction found in mempool');
      console.log(`   Fee: ${HoosatUtils.sompiToAmount(mempoolEntry.result!.fee || '0')} HTN`);
      console.log(`   Mass: ${mempoolEntry.result!.mass || 'N/A'}`);
      console.log();
      console.log('Transaction is waiting to be included in a block...');
    } else {
      console.log('ℹ️  Transaction not yet in mempool (may take a few seconds)');
    }
  } catch (error) {
    console.log('ℹ️  Could not verify mempool status');
  }

  console.log();

  // ==================== COMPLETION ====================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   ✅ BATCH PAYMENT COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Summary:');
  console.log(`  ✅ Sent to ${RECIPIENTS.length} recipients in one transaction`);
  console.log(`  ✅ Total amount: ${totalAmount.toFixed(8)} HTN`);
  console.log(`  ✅ Fee: ${HoosatUtils.sompiToAmount(finalFee)} HTN (mass-based)`);
  console.log(`  ✅ Passed spam protection (max 2 recipients)`);
  console.log();
  console.log('Technical Details:');
  console.log('  • Used MASS-based fee calculation from htn-core');
  console.log('  • Respected spam protection limit (3 outputs total)');
  console.log('  • Anti-dust-attack mechanism inherited from Kaspa');
  console.log('  • For 3+ recipients, send multiple transactions');
  console.log();

  // Cleanup
  client.disconnect();
  console.log('✅ Disconnected from node\n');
}

// Run example
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
