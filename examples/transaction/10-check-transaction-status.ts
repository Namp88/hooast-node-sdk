/**
 * Example 10: Check Transaction Status
 *
 * What you'll learn:
 * - How to check if a transaction is PENDING in mempool
 * - How to check if a transaction is CONFIRMED in blockchain
 * - How to handle NOT_FOUND status (rejected or spent UTXOs)
 * - How to get detailed transaction status information
 * - Real-time transaction monitoring strategies
 *
 * Prerequisites:
 * - Access to Hoosat node (mainnet or testnet)
 * - Node must have --utxoindex flag enabled
 * - Valid transaction ID to check
 * - Sender and recipient addresses
 */

import { HoosatClient, HoosatUtils } from 'hoosat-sdk';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   🔍 EXAMPLE 10: CHECK TRANSACTION STATUS');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== CONFIGURATION ====================
  console.log('⚙️  Configuration');
  console.log('─────────────────────────────────────────');

  const NODE_HOST = '54.38.176.95';
  const NODE_PORT = 42420;

  // Replace these with your actual transaction details
  const TX_ID = 'your_transaction_id_here'; // The transaction you want to check
  const SENDER_ADDRESS = 'hoosat:sender_address_here'; // Address that sent the transaction
  const RECIPIENT_ADDRESS = 'hoosat:recipient_address_here'; // Address that received the transaction

  console.log(`Node:      ${NODE_HOST}:${NODE_PORT}`);
  console.log(`TX ID:     ${HoosatUtils.truncateHash(TX_ID)}`);
  console.log(`Sender:    ${SENDER_ADDRESS.slice(0, 30)}...`);
  console.log(`Recipient: ${RECIPIENT_ADDRESS.slice(0, 30)}...\n`);

  // ==================== STEP 1: CONNECT TO NODE ====================
  console.log('1️⃣  Connecting to Hoosat Node');
  console.log('═════════════════════════════════════════');

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
      console.error('❌ Node must have UTXO index enabled (--utxoindex flag)');
      console.error('   Without UTXO index, CONFIRMED status cannot be detected\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to connect to node:', error);
    process.exit(1);
  }

  // ==================== STEP 2: VALIDATE INPUTS ====================
  console.log('2️⃣  Validate Input Data');
  console.log('═════════════════════════════════════════');

  try {
    if (!HoosatUtils.isValidTransactionId(TX_ID)) {
      throw new Error('Invalid transaction ID format');
    }

    if (!HoosatUtils.isValidAddress(SENDER_ADDRESS)) {
      throw new Error('Invalid sender address format');
    }

    if (!HoosatUtils.isValidAddress(RECIPIENT_ADDRESS)) {
      throw new Error('Invalid recipient address format');
    }

    console.log('✅ All inputs are valid\n');
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }

  // ==================== STEP 3: CHECK TRANSACTION STATUS ====================
  console.log('3️⃣  Check Transaction Status');
  console.log('═════════════════════════════════════════');

  try {
    const statusResult = await client.getTransactionStatus(TX_ID, SENDER_ADDRESS, RECIPIENT_ADDRESS);

    if (!statusResult.ok || !statusResult.result) {
      throw new Error(statusResult.error || 'Failed to get transaction status');
    }

    const status = statusResult.result;

    console.log('\n📊 Transaction Status Report');
    console.log('═════════════════════════════════════════');
    console.log(`Status: ${status.status}`);
    console.log(`TX ID:  ${status.details.txId}`);
    console.log();

    // ==================== HANDLE DIFFERENT STATUSES ====================

    if (status.status === 'PENDING') {
      console.log('⏳ Transaction Status: PENDING');
      console.log('─────────────────────────────────────────');
      console.log('The transaction is currently in the mempool, waiting to be included in a block.\n');

      console.log('Details:');
      console.log(`  • In Mempool:  ${status.details.inMempool}`);
      console.log(`  • Is Orphan:   ${status.details.isOrphan}`);

      if (status.details.fee) {
        console.log(`  • Fee:         ${HoosatUtils.sompiToAmount(status.details.fee)} HTN`);
      }

      if (status.details.mass) {
        console.log(`  • Mass:        ${status.details.mass} bytes`);
      }

      console.log();

      if (status.details.isOrphan) {
        console.log('⚠️  Warning: Transaction is in orphan pool');
        console.log('   This means the transaction references UTXOs that are not yet confirmed.');
        console.log('   The transaction will remain orphaned until parent transactions are confirmed.\n');
      } else {
        console.log('✅ Transaction is properly formatted and waiting for confirmation');
        console.log('   Estimated confirmation time: < 1 minute (typically)\n');
      }

      console.log('What happens next?');
      console.log('  1. Miners will include this transaction in the next block');
      console.log('  2. Once included, status will change to CONFIRMED');
      console.log('  3. You can monitor status using this same method\n');
    } else if (status.status === 'CONFIRMED') {
      console.log('✅ Transaction Status: CONFIRMED');
      console.log('─────────────────────────────────────────');
      console.log('The transaction has been included in the blockchain and is confirmed.\n');

      console.log('Details:');
      console.log(`  • In Mempool:       ${status.details.inMempool}`);
      console.log(`  • Block DAA Score:  ${status.details.blockDaaScore}`);

      if (status.details.confirmedAmount) {
        console.log(`  • Confirmed Amount: ${HoosatUtils.sompiToAmount(status.details.confirmedAmount)} HTN`);
      }

      if (status.details.confirmedAddress) {
        console.log(`  • Found at Address: ${status.details.confirmedAddress.slice(0, 40)}...`);
      }

      console.log(`  • Is Coinbase:      ${status.details.isCoinbase}`);
      console.log();

      console.log('✅ Transaction is final and cannot be reversed');
      console.log('   The funds have been successfully transferred.\n');

      if (status.details.message?.includes('change output')) {
        console.log('ℹ️  Note: Transaction was confirmed via change output detection');
        console.log("   This means the UTXO was found in the sender's address (change).\n");
      }
    } else if (status.status === 'NOT_FOUND') {
      console.log('❌ Transaction Status: NOT_FOUND');
      console.log('─────────────────────────────────────────');
      console.log('The transaction was not found in mempool or blockchain.\n');

      console.log('Message:');
      console.log(`  ${status.details.message}\n`);

      console.log('Possible reasons:');
      console.log('  • Transaction was rejected by the network');
      console.log('  • Transaction UTXOs have already been spent');
      console.log('  • Transaction ID is incorrect');
      console.log('  • Sender/recipient addresses are incorrect');
      console.log('  • Node does not have full transaction history');
      console.log('  • Transaction is too old and has been pruned\n');

      console.log('What to do?');
      console.log('  1. Verify the transaction ID is correct');
      console.log('  2. Check sender and recipient addresses');
      console.log('  3. Wait a few moments and try again (if just submitted)');
      console.log('  4. Check wallet balance to see if funds were spent\n');
    }

    console.log('Message from service:');
    console.log(`  "${status.details.message}"\n`);
  } catch (error) {
    console.error('❌ Failed to check transaction status:', error);
    console.error();
    console.error('Troubleshooting:');
    console.error('  • Ensure node is running and accessible');
    console.error('  • Verify node has --utxoindex flag enabled');
    console.error('  • Check that transaction ID is valid');
    console.error('  • Confirm sender and recipient addresses are correct\n');
    process.exit(1);
  }

  // ==================== STEP 4: ADVANCED - POLLING FOR CONFIRMATION ====================
  console.log('4️⃣  Advanced: Polling for Confirmation');
  console.log('═════════════════════════════════════════');
  console.log('You can continuously poll the status to monitor confirmation:\n');

  console.log('Example polling code:');
  console.log('─────────────────────────────────────────');
  console.log(`
async function waitForConfirmation(client, txId, senderAddr, recipientAddr) {
  const maxAttempts = 60; // Poll for max 5 minutes
  const pollInterval = 5000; // Check every 5 seconds

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await client.getTransactionStatus(txId, senderAddr, recipientAddr);

    if (result.ok && result.result.status === 'CONFIRMED') {
      console.log('✅ Transaction confirmed!');
      return result.result;
    }

    if (result.ok && result.result.status === 'NOT_FOUND') {
      console.log('❌ Transaction not found (may be rejected)');
      return null;
    }

    console.log(\`⏳ Still pending... (attempt \${attempt}/\${maxAttempts})\`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  console.log('⚠️  Timeout: Transaction still not confirmed');
  return null;
}
`);

  // ==================== COMPLETION ====================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   ✅ STATUS CHECK COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Summary:');
  console.log('  ✅ Connected to Hoosat node');
  console.log('  ✅ Validated input data');
  console.log('  ✅ Retrieved transaction status');
  console.log();
  console.log('Transaction Status Types:');
  console.log('  • PENDING:    Transaction is in mempool, waiting for confirmation');
  console.log('  • CONFIRMED:  Transaction is included in blockchain');
  console.log('  • NOT_FOUND:  Transaction not found (rejected or spent)');
  console.log();
  console.log('Best Practices:');
  console.log('  • Always check node has --utxoindex enabled');
  console.log('  • Use polling for real-time monitoring');
  console.log('  • Keep both sender and recipient addresses for reliable detection');
  console.log('  • Handle all three status types in your application');
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
