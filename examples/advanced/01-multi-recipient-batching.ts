/**
 * Example: Multi-Recipient Batching Strategy
 *
 * Demonstrates:
 * - Splitting 3+ recipients into multiple transactions
 * - Respecting spam protection (max 2 recipients per tx)
 * - Optimal batching strategy
 * - Fee optimization across multiple transactions
 * - Progress tracking and error recovery
 *
 * Prerequisites:
 * - Access to Hoosat node with UTXO index enabled
 * - Wallet with sufficient balance
 *
 * Use case:
 * - Payroll systems (paying multiple employees)
 * - Airdrop distributions
 * - Batch payment processing
 * - Bulk transfers
 *
 * ⚠️  WARNING: This broadcasts REAL transactions!
 *
 * 💡 Strategy:
 * - Max 2 recipients per transaction due to spam protection
 * - Add delay between transactions to avoid node overload
 * - Track success/failure for each batch
 * - Calculate total fees upfront
 */
import { HoosatClient, HoosatCrypto, HoosatTxBuilder, HoosatUtils, UtxoForSigning } from 'hoosat-sdk';

interface Recipient {
  address: string;
  amount: string; // HTN amount as string
  label?: string;
}

interface BatchResult {
  batchNumber: number;
  recipients: Recipient[];
  success: boolean;
  txId?: string;
  error?: string;
}

// Chunk array into smaller arrays
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   📤 MULTI-RECIPIENT BATCHING STRATEGY');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== CONFIGURATION ====================
  console.log('⚙️  Configuration');
  console.log('─────────────────────────────────────');

  const NODE_HOST = '54.38.176.95';
  const NODE_PORT = 42420;
  const PRIVATE_KEY = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43'; // ⚠️ CHANGE THIS!

  const MAX_RECIPIENTS_PER_TX = 2; // Spam protection limit
  const DELAY_BETWEEN_TXS = 2000; // 2 seconds delay

  // Example: 7 recipients (will need 4 transactions)
  // ⚠️ IMPORTANT: Replace with valid Hoosat addresses before running!
  const RECIPIENTS: Recipient[] = [
    {
      address: 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74',
      amount: '0.01',
      label: 'Employee 1',
    },
    {
      address: 'hoosat:qzr0pvne29vrvp2pud5j5qxx0xyuv0mjvw9qdswsu5q7z5ulgmxswemhkklu2',
      amount: '0.015',
      label: 'Employee 2',
    },
    {
      address: 'hoosat:qr97kz9ujwylwxd8jkh9zs0nexlkkuu0v3aj0a6htvapan0a0arjugmlqf5ur',
      amount: '0.02',
      label: 'Employee 3',
    },
    {
      address: 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74',
      amount: '0.012',
      label: 'Employee 4',
    },
    {
      address: 'hoosat:qzr0pvne29vrvp2pud5j5qxx0xyuv0mjvw9qdswsu5q7z5ulgmxswemhkklu2',
      amount: '0.018',
      label: 'Employee 5',
    },
    {
      address: 'hoosat:qr97kz9ujwylwxd8jkh9zs0nexlkkuu0v3aj0a6htvapan0a0arjugmlqf5ur',
      amount: '0.025',
      label: 'Contractor 1',
    },
    {
      address: 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74',
      amount: '0.03',
      label: 'Contractor 2',
    },
  ];

  console.log(`Node:              ${NODE_HOST}:${NODE_PORT}`);
  console.log(`Total Recipients:  ${RECIPIENTS.length}`);
  console.log(`Max per TX:        ${MAX_RECIPIENTS_PER_TX}`);
  console.log(`Delay between TXs: ${DELAY_BETWEEN_TXS}ms`);
  console.log();

  // ==================== CALCULATE BATCHES ====================
  console.log('1️⃣  Calculate Batching Strategy');
  console.log('═════════════════════════════════════');

  const batches = chunk(RECIPIENTS, MAX_RECIPIENTS_PER_TX);
  const totalAmount = RECIPIENTS.reduce((sum, r) => sum + parseFloat(r.amount), 0);

  console.log(`Total to send:     ${totalAmount.toFixed(8)} HTN`);
  console.log(`Batches needed:    ${batches.length} transactions`);
  console.log();

  batches.forEach((batch, i) => {
    const batchTotal = batch.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    console.log(`Batch ${i + 1}:`);
    batch.forEach(r => {
      console.log(`  • ${r.label || 'Recipient'}: ${r.amount} HTN`);
    });
    console.log(`  Subtotal: ${batchTotal.toFixed(8)} HTN`);
    console.log();
  });

  // ==================== WARNINGS ====================
  console.log('⚠️  CRITICAL WARNINGS');
  console.log('─────────────────────────────────────');
  console.log(`1. This will send ${totalAmount.toFixed(8)} HTN to ${RECIPIENTS.length} recipients`);
  console.log(`2. Total of ${batches.length} transactions will be broadcast`);
  console.log('3. Transactions CANNOT be reversed once broadcast');
  console.log('4. Ensure sufficient balance for all payments + fees');
  console.log();
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // ==================== CONNECT TO NODE ====================
  console.log('2️⃣  Connecting to Node');
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
    console.log(`   Is Synced:      ${nodeInfo.result.isSynced}\n`);

    if (!nodeInfo.result.isUtxoIndexed) {
      throw new Error('Node must have UTXO index enabled');
    }
  } catch (error) {
    console.error('❌ Failed to connect:', error);
    process.exit(1);
  }

  // ==================== IMPORT WALLET ====================
  console.log('3️⃣  Import Wallet');
  console.log('═════════════════════════════════════');

  let wallet;
  try {
    wallet = HoosatCrypto.importKeyPair(PRIVATE_KEY);
    console.log('✅ Wallet imported');
    console.log(`   Address: ${wallet.address.slice(0, 50)}...\n`);
  } catch (error) {
    console.error('❌ Failed to import wallet:', error);
    process.exit(1);
  }

  // ==================== CHECK BALANCE ====================
  console.log('4️⃣  Check Balance');
  console.log('═════════════════════════════════════');

  let utxos;
  let totalBalance = 0n;

  try {
    const utxoResponse = await client.getUtxosByAddresses([wallet.address]);
    if (!utxoResponse.ok || !utxoResponse.result) {
      throw new Error('Failed to fetch UTXOs');
    }

    utxos = utxoResponse.result.utxos;
    utxos.forEach(utxo => {
      totalBalance += BigInt(utxo.utxoEntry.amount);
    });

    console.log(`Balance: ${HoosatUtils.sompiToAmount(totalBalance)} HTN`);
    console.log(`UTXOs:   ${utxos.length}`);
    console.log();

    // Calculate total minimum fees
    let estimatedTotalFees = 0n;
    for (const batch of batches) {
      const feeString = HoosatCrypto.calculateMinFee(1, batch.length + 1);
      estimatedTotalFees += BigInt(feeString);
    }

    const totalNeeded = BigInt(HoosatUtils.amountToSompi(totalAmount.toString())) + estimatedTotalFees;

    console.log(`Total needed: ${HoosatUtils.sompiToAmount(totalNeeded)} HTN`);
    console.log(`  Payments:   ${totalAmount.toFixed(8)} HTN`);
    console.log(`  Min fees:   ${HoosatUtils.sompiToAmount(estimatedTotalFees)} HTN (${batches.length} txs)`);
    console.log();

    if (totalBalance < totalNeeded) {
      console.error('❌ Insufficient balance!');
      console.error(`   Need: ${HoosatUtils.sompiToAmount(totalNeeded)} HTN`);
      console.error(`   Have: ${HoosatUtils.sompiToAmount(totalBalance)} HTN`);
      process.exit(1);
    }

    console.log('✅ Sufficient balance\n');
  } catch (error) {
    console.error('❌ Failed to check balance:', error);
    process.exit(1);
  }

  // ==================== PROCESS BATCHES ====================
  console.log('5️⃣  Process Batches');
  console.log('═════════════════════════════════════\n');

  const results: BatchResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const batchNumber = i + 1;

    console.log(`📦 Batch ${batchNumber}/${batches.length}`);
    console.log('─────────────────────────────────────');

    try {
      // Get fresh UTXOs
      const utxoResponse = await client.getUtxosByAddresses([wallet.address]);
      if (!utxoResponse.ok || !utxoResponse.result) {
        throw new Error('Failed to fetch UTXOs');
      }

      const availableUtxos = utxoResponse.result.utxos;
      if (availableUtxos.length === 0) {
        throw new Error('No UTXOs available');
      }

      // Calculate amount needed for this batch
      const batchAmountSompi = batch.reduce((sum, r) => {
        return sum + BigInt(HoosatUtils.amountToSompi(r.amount));
      }, 0n);

      // Calculate minimum fee for this batch
      const minFeeString = HoosatCrypto.calculateMinFee(1, batch.length + 1);
      const minFee = BigInt(minFeeString);

      // Select UTXO (use largest for simplicity)
      const sortedUtxos = [...availableUtxos].sort((a, b) => {
        return Number(BigInt(b.utxoEntry.amount) - BigInt(a.utxoEntry.amount));
      });

      const selectedUtxo = sortedUtxos[0];
      const selectedAmount = BigInt(selectedUtxo.utxoEntry.amount);

      console.log(`  Recipients: ${batch.length}`);
      batch.forEach(r => console.log(`    • ${r.label}: ${r.amount} HTN`));
      console.log(`  Min Fee:    ${HoosatUtils.sompiToAmount(minFee)} HTN`);
      console.log();

      // Build transaction
      const builder = new HoosatTxBuilder({ debug: false });

      const utxoForSigning: UtxoForSigning = {
        outpoint: {
          transactionId: selectedUtxo.outpoint.transactionId,
          index: selectedUtxo.outpoint.index,
        },
        utxoEntry: {
          amount: selectedUtxo.utxoEntry.amount,
          scriptPublicKey: {
            script: selectedUtxo.utxoEntry.scriptPublicKey.scriptPublicKey,
            version: selectedUtxo.utxoEntry.scriptPublicKey.version,
          },
          blockDaaScore: selectedUtxo.utxoEntry.blockDaaScore,
          isCoinbase: selectedUtxo.utxoEntry.isCoinbase,
        },
      };

      builder.addInput(utxoForSigning, wallet.privateKey);

      // Add recipient outputs
      for (const recipient of batch) {
        const amountSompi = HoosatUtils.amountToSompi(recipient.amount);
        builder.addOutput(recipient.address, amountSompi);
      }

      // Set fee and add change
      builder.setFee(minFeeString);
      builder.addChangeOutput(wallet.address);

      // Sign
      const signedTx = builder.sign();
      const txId = HoosatCrypto.getTransactionId(signedTx);

      // Submit
      console.log('  📡 Submitting transaction...');
      const submitResult = await client.submitTransaction(signedTx);

      if (!submitResult.ok || !submitResult.result) {
        throw new Error(submitResult.error || 'Transaction rejected');
      }

      console.log(`  ✅ Success!`);
      console.log(`     TX ID: ${submitResult.result.transactionId}`);
      console.log();

      results.push({
        batchNumber,
        recipients: batch,
        success: true,
        txId: submitResult.result.transactionId,
      });

      successCount++;

      // Wait before next batch
      if (i < batches.length - 1) {
        console.log(`  ⏳ Waiting ${DELAY_BETWEEN_TXS}ms before next batch...\n`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_TXS));
      }
    } catch (error: any) {
      console.log(`  ❌ Failed: ${error.message}\n`);

      results.push({
        batchNumber,
        recipients: batch,
        success: false,
        error: error.message,
      });

      failureCount++;
    }
  }

  // ==================== SUMMARY ====================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   📊 BATCH PAYMENT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Results:');
  console.log(`  Total Batches:    ${batches.length}`);
  console.log(`  ✅ Successful:    ${successCount}`);
  console.log(`  ❌ Failed:        ${failureCount}`);
  console.log();

  if (successCount > 0) {
    console.log('Successful Transactions:');
    results
      .filter(r => r.success)
      .forEach(r => {
        console.log(`  Batch ${r.batchNumber}: ${r.txId}`);
      });
    console.log();
  }

  if (failureCount > 0) {
    console.log('Failed Transactions:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`  Batch ${r.batchNumber}: ${r.error}`);
        console.log('    Recipients:');
        r.recipients.forEach(rec => console.log(`      • ${rec.label}: ${rec.amount} HTN`));
      });
    console.log();
  }

  console.log('💡 Next Steps:');
  if (failureCount > 0) {
    console.log('  • Review failed batches above');
    console.log('  • Check balance and retry failed payments');
    console.log('  • Verify recipient addresses are correct');
  } else {
    console.log('  ✅ All payments completed successfully!');
    console.log(`  • ${RECIPIENTS.length} recipients paid`);
    console.log(`  • ${totalAmount.toFixed(8)} HTN total sent`);
  }
  console.log();

  client.disconnect();
  console.log('✅ Disconnected from node\n');
}

// Run example
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
