/**
 * Example 09: Split UTXO (Privacy & Preparation)
 *
 * Demonstrates:
 * - Splitting one large UTXO into multiple smaller UTXOs
 * - Preparing for future batch payments
 * - Privacy enhancement (breaking transaction links)
 * - Respecting spam protection (max 2 outputs + change)
 *
 * Prerequisites:
 * - Access to Hoosat node with UTXO index enabled
 * - Wallet with at least one UTXO
 *
 * Use case:
 * - Need to prepare multiple outputs for future payments
 * - Want to enhance privacy by breaking UTXO links
 * - Planning to send many transactions in the future
 *
 * ⚠️  WARNING: This broadcasts a REAL transaction!
 *
 * 💡 Limitation:
 * Due to spam protection, you can only create 2 new UTXOs per transaction.
 * To create more, run multiple split transactions.
 */
import { HoosatFeeEstimator, FeePriority, HoosatCrypto, HoosatNode, HoosatUtils, HoosatTxBuilder, UtxoForSigning } from '../../src';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   ✂️  SPLIT UTXO (CREATE MULTIPLE OUTPUTS)');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== CONFIGURATION ====================
  console.log('⚙️  Configuration');
  console.log('─────────────────────────────────────');

  const NODE_HOST = '54.38.176.95';
  const NODE_PORT = 42420;
  const PRIVATE_KEY = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43'; //

  // Split configuration
  const NUM_OUTPUTS = 2; // Max 2 due to spam protection (2 splits + change = 3 total)
  const AMOUNT_PER_OUTPUT = '0.1'; // Amount for each output in HTN
  const FEE_PRIORITY = FeePriority.Normal;

  console.log(`Node:              ${NODE_HOST}:${NODE_PORT}`);
  console.log(`Outputs to create: ${NUM_OUTPUTS}`);
  console.log(`Amount per output: ${AMOUNT_PER_OUTPUT} HTN`);
  console.log(`Fee priority:      ${FEE_PRIORITY}`);
  console.log();

  // ==================== SPAM PROTECTION WARNING ====================
  console.log('🛡️  Spam Protection Limitation');
  console.log('─────────────────────────────────────');
  console.log(`Due to anti-dust-attack protection, transactions are limited to`);
  console.log(`3 total outputs (2 new UTXOs + 1 change).`);
  console.log();
  console.log(`To create more UTXOs:`);
  console.log(`  • Run this script multiple times`);
  console.log(`  • Each run creates 2 new UTXOs`);
  console.log(`  • Example: 10 UTXOs = 5 transactions`);
  console.log();

  if (NUM_OUTPUTS > 2) {
    console.error('❌ ERROR: Cannot create more than 2 outputs per transaction');
    console.error('   Please set NUM_OUTPUTS to 1 or 2');
    process.exit(1);
  }

  // ==================== WARNINGS ====================
  console.log('⚠️  IMPORTANT INFORMATION');
  console.log('─────────────────────────────────────');
  console.log('Why split UTXOs:');
  console.log('  ✅ Prepare for future batch payments');
  console.log('  ✅ Enhance privacy (break transaction links)');
  console.log('  ✅ Have multiple UTXOs ready for concurrent txs');
  console.log();
  console.log('Considerations:');
  console.log('  ❌ Costs fees NOW (no immediate benefit)');
  console.log('  ❌ Increases wallet complexity');
  console.log('  ❌ May need consolidation later');
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

  // ==================== STEP 3: FETCH UTXOs ====================
  console.log('3️⃣  Fetch UTXOs from Blockchain');
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

  // ==================== STEP 4: SELECT UTXO TO SPLIT ====================
  console.log('4️⃣  Select UTXO to Split');
  console.log('═════════════════════════════════════');

  // Sort UTXOs by amount (largest first)
  const sortedUtxos = [...utxos].sort((a, b) => {
    return Number(BigInt(b.utxoEntry.amount) - BigInt(a.utxoEntry.amount));
  });

  // Calculate required amount
  const amountPerOutputSompi = BigInt(HoosatUtils.amountToSompi(AMOUNT_PER_OUTPUT));
  const totalOutputAmount = amountPerOutputSompi * BigInt(NUM_OUTPUTS);

  // Estimate fee (1 input, NUM_OUTPUTS + change)
  const feeEstimator = new HoosatFeeEstimator(node);
  const recommendations = await feeEstimator.getRecommendations();
  const feeRate = recommendations[FEE_PRIORITY].feeRate;

  const estimatedFeeString = HoosatCrypto.calculateFee(1, NUM_OUTPUTS + 1, feeRate);
  const estimatedFee = BigInt(estimatedFeeString);

  const requiredAmount = totalOutputAmount + estimatedFee;

  console.log('Required funds:');
  console.log(`  ${NUM_OUTPUTS} outputs × ${AMOUNT_PER_OUTPUT} HTN = ${HoosatUtils.sompiToAmount(totalOutputAmount)} HTN`);
  console.log(`  Estimated fee:              ${HoosatUtils.sompiToAmount(estimatedFee)} HTN`);
  console.log(`  Total required:             ${HoosatUtils.sompiToAmount(requiredAmount)} HTN`);
  console.log();

  // Find first UTXO that's large enough
  const selectedUtxo = sortedUtxos.find(u => BigInt(u.utxoEntry.amount) >= requiredAmount);

  if (!selectedUtxo) {
    console.error('❌ No single UTXO large enough to split');
    console.error(`   Need at least ${HoosatUtils.sompiToAmount(requiredAmount)} HTN in one UTXO`);
    console.error(`   Largest UTXO: ${HoosatUtils.sompiToAmount(sortedUtxos[0].utxoEntry.amount)} HTN`);
    console.error();
    console.error('💡 Solutions:');
    console.error('   1. Reduce AMOUNT_PER_OUTPUT');
    console.error('   2. Consolidate UTXOs first (see example 08)');
    process.exit(1);
  }

  const selectedAmount = BigInt(selectedUtxo.utxoEntry.amount);
  const changeAmount = selectedAmount - totalOutputAmount - estimatedFee;

  console.log('Selected UTXO:');
  console.log(`  TX ID:   ${HoosatUtils.truncateHash(selectedUtxo.outpoint.transactionId)}`);
  console.log(`  Index:   ${selectedUtxo.outpoint.index}`);
  console.log(`  Amount:  ${HoosatUtils.sompiToAmount(selectedAmount)} HTN`);
  console.log();

  console.log('Split breakdown:');
  for (let i = 0; i < NUM_OUTPUTS; i++) {
    console.log(`  Output ${i + 1}: ${AMOUNT_PER_OUTPUT} HTN`);
  }
  console.log(`  Change:   ${HoosatUtils.sompiToAmount(changeAmount)} HTN`);
  console.log(`  Fee:      ${HoosatUtils.sompiToAmount(estimatedFee)} HTN`);
  console.log();

  // ==================== STEP 5: BUILD SPLIT TRANSACTION ====================
  console.log('5️⃣  Build Split Transaction');
  console.log('═════════════════════════════════════');

  let signedTx;
  try {
    const builder = new HoosatTxBuilder({ debug: false });

    // Add input (UTXO to split)
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

    // Add outputs (new split UTXOs) - all go back to our address
    for (let i = 0; i < NUM_OUTPUTS; i++) {
      builder.addOutput(wallet.address, amountPerOutputSompi.toString());
    }

    // Set fee BEFORE adding change
    builder.setFee(estimatedFeeString);

    // Add change output automatically
    builder.addChangeOutput(wallet.address);

    // Sign transaction
    signedTx = builder.sign();

    const txId = HoosatCrypto.getTransactionId(signedTx);

    console.log('✅ Transaction built successfully');
    console.log(`   TX ID: ${txId}`);
    console.log(`   Inputs:  ${signedTx.inputs.length}`);
    console.log(`   Outputs: ${signedTx.outputs.length} (${NUM_OUTPUTS} splits + change)`);
    console.log();
  } catch (error) {
    console.error('❌ Failed to build transaction:', error);
    process.exit(1);
  }

  // ==================== STEP 6: SUMMARY ====================
  console.log('6️⃣  Transaction Summary');
  console.log('═════════════════════════════════════');

  console.log('Before split:');
  console.log(`  UTXOs: ${utxos.length}`);
  console.log(`  Balance: ${HoosatUtils.sompiToAmount(totalBalance)} HTN`);
  console.log();

  console.log('After split:');
  console.log(`  UTXOs: ${utxos.length + NUM_OUTPUTS} (${NUM_OUTPUTS} new + change)`);
  console.log(`  Balance: ${HoosatUtils.sompiToAmount(totalBalance - estimatedFee)} HTN (after fee)`);
  console.log();

  console.log('New UTXOs created:');
  for (let i = 0; i < NUM_OUTPUTS; i++) {
    console.log(`  ${i + 1}. ${AMOUNT_PER_OUTPUT} HTN → ${wallet.address.slice(0, 40)}...`);
  }
  console.log();

  // ==================== STEP 7: SUBMIT TRANSACTION ====================
  console.log('7️⃣  Submit Split Transaction');
  console.log('═════════════════════════════════════');
  console.log('⚠️  Final confirmation...\n');

  console.log('You are about to:');
  console.log(`  • Split 1 UTXO into ${NUM_OUTPUTS} new UTXOs + change`);
  console.log(`  • Pay ${HoosatUtils.sompiToAmount(estimatedFee)} HTN in fees`);
  console.log(`  • Create ${NUM_OUTPUTS} × ${AMOUNT_PER_OUTPUT} HTN outputs`);
  console.log();
  console.log('Submitting in 3 seconds... (Ctrl+C to cancel)\n');

  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    const submitResult = await node.submitTransaction(signedTx);

    if (!submitResult.ok || !submitResult.result) {
      throw new Error(submitResult.error || 'Transaction rejected by node');
    }

    const txId = submitResult.result.transactionId;

    console.log('✅ Split transaction submitted!');
    console.log(`   TX ID: ${txId}\n`);

    console.log('Transaction Status:');
    console.log('─────────────────────────────────────');
    console.log('✅ Broadcast to network');
    console.log('⏳ Waiting for confirmation...');
    console.log();
    console.log('After confirmation:');
    console.log(`  • 1 UTXO will be spent`);
    console.log(`  • ${NUM_OUTPUTS} new UTXOs will be created`);
    console.log(`  • 1 change UTXO will be created`);
    console.log(`  • Ready for ${NUM_OUTPUTS} concurrent transactions!`);
    console.log();
  } catch (error) {
    console.error('❌ Failed to submit transaction');
    console.error(`   Error: ${error}`);
    process.exit(1);
  }

  // ==================== COMPLETION ====================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   ✅ UTXO SPLIT COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Summary:');
  console.log(`  ✅ Split 1 UTXO into ${NUM_OUTPUTS} new UTXOs`);
  console.log(`  ✅ Fee paid: ${HoosatUtils.sompiToAmount(estimatedFee)} HTN`);
  console.log(`  ✅ ${NUM_OUTPUTS} UTXOs ready for future use`);
  console.log();
  console.log('💡 Next steps:');
  console.log('  • Run this script again to create more UTXOs');
  console.log(`  • Each run creates ${NUM_OUTPUTS} new UTXOs`);
  console.log('  • Use split UTXOs for batch payments or privacy');
  console.log();
  console.log('🛡️  Spam Protection:');
  console.log('  • Max 2 new UTXOs per transaction (+ change)');
  console.log('  • This is a network-level security feature');
  console.log('  • Protects against dust attacks');
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
