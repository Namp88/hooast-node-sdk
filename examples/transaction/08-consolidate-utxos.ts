/**
 * Example 08: Consolidate UTXOs (UTXO Cleanup)
 *
 * Demonstrates:
 * - Consolidating many small UTXOs into one large UTXO
 * - Reducing future transaction fees
 * - Optimizing wallet structure
 * - Handling large number of inputs
 *
 * Prerequisites:
 * - Access to Hoosat node with UTXO index enabled
 * - Wallet with multiple UTXOs
 *
 * Use case:
 * - You've received many small payments (mining, faucet, etc.)
 * - Want to reduce future transaction complexity and fees
 * - Wallet has too many UTXOs and transactions are expensive
 *
 * ⚠️  WARNING: This broadcasts a REAL transaction!
 *
 * 💡 Best Practice:
 * - Run consolidation during low network activity (lower fees)
 * - Don't consolidate if you rarely make transactions
 * - Consider privacy implications (all UTXOs linked to one address)
 */

import { HoosatClient, HoosatCrypto, HoosatTxBuilder, HoosatUtils, UtxoForSigning } from 'hoosat-sdk';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   🔄 UTXO CONSOLIDATION (CLEANUP)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== CONFIGURATION ====================
  console.log('⚙️  Configuration');
  console.log('─────────────────────────────────────');

  const NODE_HOST = '54.38.176.95';
  const NODE_PORT = 42420;
  const PRIVATE_KEY = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';

  // Consolidation settings
  const MAX_INPUTS = 50; // Maximum inputs to consolidate in one tx
  const MIN_UTXO_VALUE = 10000n; // Minimum UTXO value to include (0.0001 HTN)

  console.log(`Node:              ${NODE_HOST}:${NODE_PORT}`);
  console.log(`Max inputs/tx:     ${MAX_INPUTS}`);
  console.log(`Min UTXO value:    ${HoosatUtils.sompiToAmount(MIN_UTXO_VALUE)} HTN`);
  console.log();

  // ==================== WARNINGS ====================
  console.log('⚠️  IMPORTANT INFORMATION');
  console.log('─────────────────────────────────────');
  console.log('Consolidation Trade-offs:');
  console.log('  ✅ Reduces future transaction fees');
  console.log('  ✅ Simplifies wallet structure');
  console.log('  ✅ Faster transaction building');
  console.log('  ❌ Costs fees NOW to save fees LATER');
  console.log('  ❌ Links all UTXOs together (privacy impact)');
  console.log('  ❌ May not be worth it if you rarely send');
  console.log();
  console.log('Best time to consolidate:');
  console.log('  • During low network activity (cheaper fees)');
  console.log('  • When you have many small UTXOs (> 20)');
  console.log('  • Before making large transactions');
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
    console.error('   Make sure to set your private key in PRIVATE_KEY variable');
    process.exit(1);
  }

  // ==================== STEP 3: FETCH ALL UTXOs ====================
  console.log('3️⃣  Fetch UTXOs from Blockchain');
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

    if (utxos.length < 3) {
      console.log('⚠️  You only have', utxos.length, 'UTXO(s)');
      console.log('   Consolidation is not beneficial with so few UTXOs');
      console.log('   Consider consolidating when you have 10+ UTXOs\n');
      process.exit(0);
    }

    utxos.forEach(utxo => {
      const amount = BigInt(utxo.utxoEntry.amount);
      totalBalance += amount;
    });

    console.log(`Total Balance: ${HoosatUtils.sompiToAmount(totalBalance)} HTN`);
    console.log(`Total UTXOs:   ${utxos.length}`);
    console.log();
  } catch (error) {
    console.error('❌ Failed to fetch UTXOs:', error);
    process.exit(1);
  }

  // ==================== STEP 4: ANALYZE UTXOs ====================
  console.log('4️⃣  Analyze UTXO Distribution');
  console.log('═════════════════════════════════════');

  // Sort UTXOs by amount
  const sortedUtxos = [...utxos].sort((a, b) => {
    return Number(BigInt(a.utxoEntry.amount) - BigInt(b.utxoEntry.amount));
  });

  // Categorize UTXOs
  const dust = sortedUtxos.filter(u => BigInt(u.utxoEntry.amount) < MIN_UTXO_VALUE);
  const small = sortedUtxos.filter(u => {
    const amt = BigInt(u.utxoEntry.amount);
    return amt >= MIN_UTXO_VALUE && amt < 100000000n; // < 1 HTN
  });
  const medium = sortedUtxos.filter(u => {
    const amt = BigInt(u.utxoEntry.amount);
    return amt >= 100000000n && amt < 1000000000n; // 1-10 HTN
  });
  const large = sortedUtxos.filter(u => BigInt(u.utxoEntry.amount) >= 1000000000n); // > 10 HTN

  console.log('UTXO Distribution:');
  console.log(`  Dust    (< ${HoosatUtils.sompiToAmount(MIN_UTXO_VALUE)} HTN): ${dust.length} UTXOs`);
  console.log(`  Small   (< 1 HTN):       ${small.length} UTXOs`);
  console.log(`  Medium  (1-10 HTN):      ${medium.length} UTXOs`);
  console.log(`  Large   (> 10 HTN):      ${large.length} UTXOs`);
  console.log();

  // Show smallest and largest
  const smallest = sortedUtxos[0];
  const largest = sortedUtxos[sortedUtxos.length - 1];

  console.log('Range:');
  console.log(`  Smallest: ${HoosatUtils.sompiToAmount(smallest.utxoEntry.amount)} HTN`);
  console.log(`  Largest:  ${HoosatUtils.sompiToAmount(largest.utxoEntry.amount)} HTN`);
  console.log();

  // ==================== STEP 5: SELECT UTXOs TO CONSOLIDATE ====================
  console.log('5️⃣  Select UTXOs for Consolidation');
  console.log('═════════════════════════════════════');

  // Filter out dust and select up to MAX_INPUTS
  const eligibleUtxos = sortedUtxos.filter(u => BigInt(u.utxoEntry.amount) >= MIN_UTXO_VALUE);

  if (eligibleUtxos.length === 0) {
    console.log('❌ No UTXOs meet minimum value threshold');
    process.exit(1);
  }

  // Select UTXOs to consolidate (smallest first to clean up wallet)
  const utxosToConsolidate = eligibleUtxos.slice(0, Math.min(MAX_INPUTS, eligibleUtxos.length));

  const consolidateAmount = utxosToConsolidate.reduce((sum, utxo) => {
    return sum + BigInt(utxo.utxoEntry.amount);
  }, 0n);

  console.log(`Selected ${utxosToConsolidate.length} UTXOs for consolidation`);
  console.log(`Total amount: ${HoosatUtils.sompiToAmount(consolidateAmount)} HTN`);
  console.log();

  if (utxosToConsolidate.length < 3) {
    console.log('⚠️  Less than 3 eligible UTXOs - consolidation not beneficial');
    process.exit(0);
  }

  // Show first few UTXOs
  console.log('Sample of selected UTXOs:');
  utxosToConsolidate.slice(0, 5).forEach((utxo, i) => {
    console.log(`  ${i + 1}. ${HoosatUtils.sompiToAmount(utxo.utxoEntry.amount)} HTN`);
  });
  if (utxosToConsolidate.length > 5) {
    console.log(`  ... and ${utxosToConsolidate.length - 5} more`);
  }
  console.log();

  // ==================== STEP 6: CALCULATE FEE ====================
  console.log('6️⃣  Calculate Consolidation Fee');
  console.log('═════════════════════════════════════');

  // Calculate fee for consolidation
  // Many inputs (selected UTXOs) → 1 output (consolidated)
  const numInputs = utxosToConsolidate.length;
  const numOutputs = 1; // Single consolidated output

  const feeString = HoosatCrypto.calculateMinFee(numInputs, numOutputs);
  const fee = BigInt(feeString);

  console.log('Fee Calculation:');
  console.log(`  Inputs:  ${numInputs}`);
  console.log(`  Outputs: ${numOutputs}`);
  console.log(`  Fee:     ${HoosatUtils.sompiToAmount(fee)} HTN`);
  console.log();

  const outputAmount = consolidateAmount - fee;

  if (outputAmount <= 0n) {
    console.error('❌ Fee exceeds total UTXO value - cannot consolidate');
    console.error('   Try selecting larger UTXOs or wait for lower network fees');
    process.exit(1);
  }

  // ==================== STEP 7: COST-BENEFIT ANALYSIS ====================
  console.log('7️⃣  Cost-Benefit Analysis');
  console.log('═════════════════════════════════════');

  // Calculate average fee per UTXO if used in future transactions
  const futureFeeSavings = BigInt(numInputs) * 2000n; // Rough estimate per input

  console.log('Cost-Benefit:');
  console.log(`  Cost NOW:         ${HoosatUtils.sompiToAmount(fee)} HTN`);
  console.log(`  Future savings:   ~${HoosatUtils.sompiToAmount(futureFeeSavings)} HTN (estimated)`);
  console.log(`  UTXOs reduced:    ${numInputs} → 1`);
  console.log();

  if (fee > futureFeeSavings) {
    console.log('⚠️  WARNING: Consolidation cost exceeds estimated savings');
    console.log('   Consider waiting for lower fees or more UTXOs to accumulate');
    console.log();
  }

  console.log('After consolidation:');
  console.log(`  Before: ${utxos.length} UTXOs totaling ${HoosatUtils.sompiToAmount(totalBalance)} HTN`);
  console.log(`  After:  ${utxos.length - numInputs + 1} UTXOs totaling ${HoosatUtils.sompiToAmount(totalBalance - fee)} HTN`);
  console.log();

  // ==================== STEP 8: BUILD CONSOLIDATION TRANSACTION ====================
  console.log('8️⃣  Build Consolidation Transaction');
  console.log('═════════════════════════════════════');

  let signedTx;
  try {
    const builder = new HoosatTxBuilder({ debug: false });

    // Add all selected UTXOs as inputs
    for (const utxo of utxosToConsolidate) {
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

    // Add single output - all funds back to our address
    builder.addOutput(wallet.address, outputAmount.toString());

    // Set fee
    builder.setFee(feeString);

    // Sign transaction
    signedTx = builder.sign();

    const txId = HoosatCrypto.getTransactionId(signedTx);

    console.log('✅ Transaction built successfully');
    console.log(`   TX ID: ${txId}`);
    console.log(`   Inputs:  ${signedTx.inputs.length}`);
    console.log(`   Outputs: ${signedTx.outputs.length}`);
    console.log();
  } catch (error) {
    console.error('❌ Failed to build transaction:', error);
    process.exit(1);
  }

  // ==================== STEP 9: FINAL CONFIRMATION ====================
  console.log('9️⃣  Final Confirmation');
  console.log('═════════════════════════════════════');
  console.log('⚠️  You are about to:');
  console.log(`   • Consolidate ${numInputs} UTXOs into 1 UTXO`);
  console.log(`   • Pay ${HoosatUtils.sompiToAmount(fee)} HTN in fees`);
  console.log(`   • Result: ${HoosatUtils.sompiToAmount(outputAmount)} HTN in single UTXO`);
  console.log();
  console.log('This transaction CANNOT be reversed once broadcast!');
  console.log();
  console.log('Submitting in 5 seconds... (Ctrl+C to cancel)\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // ==================== STEP 10: SUBMIT TRANSACTION ====================
  console.log('🔟 Submit Consolidation Transaction');
  console.log('═════════════════════════════════════');

  try {
    const submitResult = await client.submitTransaction(signedTx);

    if (!submitResult.ok || !submitResult.result) {
      throw new Error(submitResult.error || 'Transaction rejected by node');
    }

    const txId = submitResult.result.transactionId;

    console.log('✅ Consolidation transaction submitted!');
    console.log(`   TX ID: ${txId}\n`);

    console.log('Transaction Status:');
    console.log('─────────────────────────────────────');
    console.log('✅ Broadcast to network');
    console.log('⏳ Waiting for confirmation...');
    console.log();
    console.log('After confirmation:');
    console.log(`  • ${numInputs} small UTXOs will be spent`);
    console.log(`  • 1 large UTXO will be created`);
    console.log(`  • Future transactions will be cheaper!`);
    console.log();
  } catch (error) {
    console.error('❌ Failed to submit transaction');
    console.error(`   Error: ${error}`);
    process.exit(1);
  }

  // ==================== COMPLETION ====================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   ✅ UTXO CONSOLIDATION COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Summary:');
  console.log(`  ✅ Consolidated ${numInputs} UTXOs into 1 UTXO`);
  console.log(`  ✅ Fee paid: ${HoosatUtils.sompiToAmount(fee)} HTN`);
  console.log(`  ✅ Final amount: ${HoosatUtils.sompiToAmount(outputAmount)} HTN`);
  console.log(`  ✅ Wallet structure optimized!`);
  console.log();
  console.log('💡 Tips:');
  console.log('  • Run consolidation periodically when UTXOs accumulate');
  console.log('  • Consider privacy implications when consolidating');
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
