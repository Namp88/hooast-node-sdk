/**
 * Example: Track Balance Changes in Real-time
 *
 * Demonstrates:
 * - Real-time balance tracking using UTXO subscriptions
 * - Calculating balance from UTXO changes
 * - Transaction history tracking
 * - Balance change analytics
 *
 * Prerequisites:
 * - Access to Hoosat node with streaming support
 * - Valid Hoosat address to monitor
 *
 * Use case:
 * - Wallet balance monitoring
 * - Payment notification system
 * - Balance change alerts
 * - Transaction analytics
 */
import { HoosatClient, HoosatUtils, EventType, UtxoChangeNotification } from 'hoosat-sdk';

// Balance tracker
let currentBalance = 0n;
let transactionCount = 0;
let totalReceived = 0n;
let totalSent = 0n;

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   💰 REAL-TIME BALANCE TRACKER');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== CONFIGURATION ====================
  const NODE_HOST = '54.38.176.95';
  const NODE_PORT = 42420;
  const MONITORED_ADDRESS = 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu';

  console.log('⚙️  Configuration');
  console.log('─────────────────────────────────────');
  console.log(`Node:    ${NODE_HOST}:${NODE_PORT}`);
  console.log(`Address: ${HoosatUtils.truncateAddress(MONITORED_ADDRESS)}`);
  console.log();

  // ==================== CONNECT ====================
  console.log('📡 Connecting to node...\n');

  const client = new HoosatClient({
    host: NODE_HOST,
    port: NODE_PORT,
    timeout: 15000,
    events: {
      maxReconnectAttempts: 10,
      debug: false,
    },
  });

  // Verify connection
  const info = await client.getInfo();
  if (!info.ok || !info.result?.isUtxoIndexed) {
    console.error('❌ Node must have UTXO index enabled');
    process.exit(1);
  }

  console.log('✅ Connected\n');

  // ==================== INITIAL BALANCE ====================
  console.log('📊 Initial State');
  console.log('─────────────────────────────────────');

  const balance = await client.getBalance(MONITORED_ADDRESS);
  if (balance.ok) {
    currentBalance = BigInt(balance.result!.balance);
    console.log(`Balance: ${HoosatUtils.sompiToAmount(currentBalance)} HTN`);
  }

  const utxos = await client.getUtxosByAddresses([MONITORED_ADDRESS]);
  if (utxos.ok) {
    console.log(`UTXOs:   ${utxos.result!.utxos.length}`);
  }
  console.log();

  // ==================== SUBSCRIBE ====================
  console.log('🔔 Starting real-time monitoring...\n');

  await client.events.subscribeToUtxoChanges([MONITORED_ADDRESS]);

  // ==================== TRACK CHANGES ====================
  client.events.on(EventType.UtxoChange, async (notification: UtxoChangeNotification) => {
    transactionCount++;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📝 Transaction #${transactionCount}`);
    console.log(`⏰ ${new Date().toLocaleString()}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Calculate changes
    let receivedAmount = 0n;
    let spentAmount = 0n;

    // Process added UTXOs (received)
    notification.changes.added.forEach(utxo => {
      const amount = BigInt(utxo.amount);
      receivedAmount += amount;
      totalReceived += amount;
      currentBalance += amount;

      console.log(`✅ RECEIVED: +${HoosatUtils.sompiToAmount(amount)} HTN`);
      console.log(`   TX: ${HoosatUtils.truncateHash(utxo.outpoint.transactionId)}`);
    });

    // Process removed UTXOs (spent)
    notification.changes.removed.forEach(utxo => {
      const amount = BigInt(utxo.amount);
      spentAmount += amount;
      totalSent += amount;
      currentBalance -= amount;

      console.log(`❌ SPENT: -${HoosatUtils.sompiToAmount(amount)} HTN`);
      console.log(`   TX: ${HoosatUtils.truncateHash(utxo.outpoint.transactionId)}`);
    });

    console.log();

    // Display balance change
    const netChange = receivedAmount - spentAmount;
    const changeSign = netChange > 0n ? '+' : '';
    console.log(`📊 Balance Change: ${changeSign}${HoosatUtils.sompiToAmount(netChange)} HTN`);
    console.log(`💰 Current Balance: ${HoosatUtils.sompiToAmount(currentBalance)} HTN`);
    console.log();

    // Display statistics
    console.log('📈 Statistics:');
    console.log(`   Total Transactions: ${transactionCount}`);
    console.log(`   Total Received:     ${HoosatUtils.sompiToAmount(totalReceived)} HTN`);
    console.log(`   Total Sent:         ${HoosatUtils.sompiToAmount(totalSent)} HTN`);
    console.log(`   Net:                ${HoosatUtils.sompiToAmount(totalReceived - totalSent)} HTN`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });

  // Error handling
  client.events.on(EventType.Error, error => {
    console.error('❌ Error:', error);
  });

  client.events.on(EventType.Reconnected, () => {
    console.log('✅ Reconnected - continuing monitoring\n');
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Stopping monitoring...');
    console.log('─────────────────────────────────────');
    console.log('📊 Final Statistics:');
    console.log(`   Transactions:   ${transactionCount}`);
    console.log(`   Total Received: ${HoosatUtils.sompiToAmount(totalReceived)} HTN`);
    console.log(`   Total Sent:     ${HoosatUtils.sompiToAmount(totalSent)} HTN`);
    console.log(`   Final Balance:  ${HoosatUtils.sompiToAmount(currentBalance)} HTN`);
    console.log();

    await client.events.unsubscribeFromUtxoChanges();
    client.disconnect();
    console.log('✅ Cleanup complete\n');
    process.exit(0);
  });

  console.log('💡 Monitoring active - press Ctrl+C to stop\n');
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
