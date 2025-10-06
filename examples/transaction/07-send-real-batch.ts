/**
 * Example 07: Batch Payment with CORRECT MASS CALCULATION
 *
 * ⚠️  WARNING: This example broadcasts a REAL transaction to the network!
 *
 * This version uses the correct mass-based fee calculation from htn-core
 */
import { FeeEstimator, FeePriority, HoosatCrypto, HoosatNode, HoosatUtils, TransactionBuilder, UtxoForSigning } from '../../src';
import {
  calculateFeeFromMass,
  calculateTransactionMass,
  compareCalculationMethods,
  printMassCalculation,
} from '../../src/transaction/mass.calculator';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   📤 BATCH PAYMENT WITH CORRECT MASS CALCULATION');
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
      address: 'hoosat:qr97kz9ujwylwxd8jkh9zs0nexlkkuu0v3aj0a6htvapan0a0arjugmlqf5ur',
      amount: '0.005',
      label: 'Recipient 2',
    },
    {
      address: 'hoosat:qzr0pvne29vrvp2pud5j5qxx0xyuv0mjvw9qdswsu5q7z5ulgmxswemhkklu2',
      amount: '0.003',
      label: 'Recipient 3',
    },
  ];

  const FEE_PRIORITY = FeePriority.Normal;

  console.log(`Node:       ${NODE_HOST}:${NODE_PORT}`);
  console.log(`Priority:   ${FEE_PRIORITY}`);
  console.log(`Recipients: ${RECIPIENTS.length}\n`);

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
  console.log('3. This should NOT be rejected as spam anymore!');
  console.log();
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

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
    const utxoResponse = await node.getUtxosByAddresses([wallet.address]);

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

  const feeEstimator = new FeeEstimator(node);
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
  const selectedFeeRate = recommendations[FEE_PRIORITY].feeRate;
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
  const numOutputs = RECIPIENTS.length + 1;

  // Start with 1 input and calculate mass-based fee
  let numInputs = 1;

  // Show comparison between old and new methods
  console.log('📊 Comparison: Old SDK vs Mass-Based Calculation\n');
  compareCalculationMethods(numInputs, numOutputs, selectedFeeRate);

  // Calculate using mass-based method
  printMassCalculation(numInputs, numOutputs, selectedFeeRate);

  // ==================== STEP 7: SELECT UTXOs ====================
  console.log('7️⃣  Select UTXOs for Transaction');
  console.log('═════════════════════════════════════');

  let selectedUtxos: typeof utxos = [];
  let selectedAmount = 0n;

  // Keep adding UTXOs until we have enough
  for (const utxo of utxos) {
    selectedUtxos.push(utxo);
    selectedAmount += BigInt(utxo.utxoEntry.amount);

    // Recalculate fee with current number of inputs using MASS
    numInputs = selectedUtxos.length;
    const feeString = calculateFeeFromMass(numInputs, numOutputs, selectedFeeRate);
    const estimatedFeeBigInt = BigInt(feeString);

    console.log(`  Testing with ${numInputs} input(s):`);
    console.log(`    Total:     ${HoosatUtils.sompiToAmount(selectedAmount)} HTN`);
    console.log(`    Need:      ${HoosatUtils.sompiToAmount(totalSendSompi + estimatedFeeBigInt)} HTN`);
    console.log(`    Mass Fee:  ${HoosatUtils.sompiToAmount(estimatedFeeBigInt)} HTN`);

    // Check if we have enough
    if (selectedAmount >= totalSendSompi + estimatedFeeBigInt) {
      console.log(`    ✅ Sufficient funds!\n`);
      break;
    } else {
      console.log(`    ⏳ Need more...\n`);
    }
  }

  // Final fee calculation using mass
  const finalFeeString = calculateFeeFromMass(numInputs, numOutputs, selectedFeeRate);
  const finalFee = BigInt(finalFeeString);
  const changeAmount = selectedAmount - totalSendSompi - finalFee;

  if (changeAmount < 0n) {
    console.error('❌ Insufficient funds');
    console.error(`   Selected: ${HoosatUtils.sompiToAmount(selectedAmount)} HTN`);
    console.error(`   Need:     ${HoosatUtils.sompiToAmount(totalSendSompi + finalFee)} HTN`);
    console.error(`   Missing:  ${HoosatUtils.sompiToAmount(-changeAmount)} HTN`);
    process.exit(1);
  }

  console.log('Selected UTXOs:');
  console.log('─────────────────────────────────────');
  selectedUtxos.forEach((utxo, index) => {
    console.log(
      `  ${index + 1}. ${HoosatUtils.truncateHash(utxo.outpoint.transactionId)}:${utxo.outpoint.index} - ${HoosatUtils.sompiToAmount(utxo.utxoEntry.amount)} HTN`
    );
  });
  console.log();

  // ==================== STEP 8: TRANSACTION BREAKDOWN ====================
  console.log('8️⃣  Final Transaction Breakdown');
  console.log('═════════════════════════════════════');

  const massResult = calculateTransactionMass(numInputs, numOutputs);

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
  console.log('  Mass Details:');
  console.log(`    Transaction mass:    ${massResult.mass}`);
  console.log(`    Equivalent size:     ${massResult.equivalentSize} bytes`);
  console.log(`    Fee rate:            ${selectedFeeRate} sompi/byte`);
  console.log(`    Final fee:           ${finalFeeString} sompi`);
  console.log();

  // ==================== FEE COMPARISON ====================
  console.log('💰 Fee Analysis');
  console.log('─────────────────────────────────────');

  // Calculate what OLD method would have suggested
  const oldSize = 10 + numInputs * 150 + numOutputs * 35;
  const oldFee = Math.max(oldSize * selectedFeeRate, 1000);

  console.log('Old SDK Method (Incorrect):');
  console.log(`  Size: ${oldSize} bytes`);
  console.log(`  Fee:  ${oldFee} sompi (${HoosatUtils.sompiToAmount(oldFee.toString())} HTN)`);
  console.log();
  console.log('New Mass-Based Method (Correct):');
  console.log(`  Mass: ${massResult.mass}`);
  console.log(`  Equiv: ${massResult.equivalentSize} bytes`);
  console.log(`  Fee:  ${finalFeeString} sompi (${HoosatUtils.sompiToAmount(finalFee)} HTN)`);
  console.log();

  const difference = Number(finalFee) - oldFee;
  console.log(`Difference: ${difference > 0 ? '+' : ''}${difference} sompi (${((difference / oldFee) * 100).toFixed(1)}%)`);

  if (difference > 0) {
    console.log(`⚠️  Old method underestimated by ${difference} sompi - that's why it was rejected!`);
  }
  console.log();

  // ==================== STEP 9: BUILD & SIGN TRANSACTION ====================
  console.log('9️⃣  Build & Sign Transaction');
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

    // Add recipient outputs
    for (const recipient of RECIPIENTS) {
      const amountSompi = HoosatUtils.amountToSompi(recipient.amount);
      builder.addOutput(recipient.address, amountSompi);
    }

    // Add change output (if not dust)
    if (changeAmount >= 1000n) {
      builder.addOutput(wallet.address, changeAmount.toString());
    } else {
      console.log('ℹ️  Change amount is dust, adding to fee instead\n');
    }

    // Set mass-based fee
    builder.setFee(finalFeeString);

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
  console.log(`Fee: ${HoosatUtils.sompiToAmount(finalFee)} HTN (mass-based, correct calculation)\n`);

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
    console.log('✅ NOT rejected as spam (correct mass calculation!)');
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

    if (error!.toString().includes('spam')) {
      console.log('\n⚠️  Still rejected as spam!');
      console.log('This might indicate:');
      console.log('  1. Node has additional anti-spam rules');
      console.log('  2. Fee might still need to be higher');
      console.log('  3. Try using FeePriority.High or Urgent');
    }

    process.exit(1);
  }

  // ==================== STEP 11: VERIFY TRANSACTION ====================
  console.log('1️⃣1️⃣  Verify Transaction');
  console.log('═════════════════════════════════════');

  console.log('Checking mempool...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    const txId = HoosatCrypto.getTransactionId(signedTx);
    const mempoolEntry = await node.getMempoolEntry(txId);

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
  console.log('   ✅ BATCH PAYMENT COMPLETE (MASS-BASED)');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Summary:');
  console.log(`  ✅ Sent to ${RECIPIENTS.length} recipients in one transaction`);
  console.log(`  ✅ Total amount: ${totalAmount.toFixed(8)} HTN`);
  console.log(`  ✅ Fee: ${HoosatUtils.sompiToAmount(finalFee)} HTN (mass-based)`);
  console.log();
  console.log('Why This Works:');
  console.log('  • Used correct MASS calculation from htn-core');
  console.log('  • Mass = (txSize × 1) + (scriptPubKey × 10) + (sigOps × 1000)');
  console.log('  • Fee properly accounts for computational cost');
  console.log('  • No more "spam" rejection!');
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
