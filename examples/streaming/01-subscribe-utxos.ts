/**
 * Example: Subscribe to UTXO Changes (Real-time Monitoring)
 *
 * Demonstrates:
 * - Subscribing to UTXO changes for specific addresses
 * - Listening for real-time notifications
 * - Handling added and removed UTXOs
 * - Error handling and reconnection
 * - Graceful cleanup
 *
 * Prerequisites:
 * - Access to Hoosat node with streaming support
 * - Valid Hoosat address to monitor
 *
 * Use case:
 * - Real-time balance monitoring
 * - Payment detection for merchants
 * - Wallet synchronization
 * - Transaction confirmation tracking
 */
import { HoosatClient, HoosatUtils, EventType, UtxoChangeNotification } from 'hoosat-sdk';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   📡 REAL-TIME UTXO MONITORING');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== CONFIGURATION ====================
  console.log('⚙️  Configuration');
  console.log('─────────────────────────────────────');

  const NODE_HOST = '54.38.176.95';
  const NODE_PORT = 42420;
  const MONITORED_ADDRESS = 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu';

  console.log(`Node:              ${NODE_HOST}:${NODE_PORT}`);
  console.log(`Monitored address: ${HoosatUtils.truncateAddress(MONITORED_ADDRESS)}`);
  console.log();

  // ==================== CONNECT TO NODE ====================
  console.log('1️⃣  Connecting to Node');
  console.log('═════════════════════════════════════\n');

  const client = new HoosatClient({
    host: NODE_HOST,
    port: NODE_PORT,
    timeout: 15000,
    events: {
      maxReconnectAttempts: 10,
      reconnectDelay: 2000,
      debug: false, // Set to true for detailed logs
    },
  });

  // Verify connection
  try {
    const info = await client.getInfo();
    if (!info.ok) {
      throw new Error('Failed to connect to node');
    }

    console.log('✅ Connected successfully');
    console.log(`   Server Version: ${info.result!.serverVersion}`);
    console.log(`   Is Synced:      ${info.result!.isSynced}`);
    console.log(`   UTXO Indexed:   ${info.result!.isUtxoIndexed}\n`);

    if (!info.result?.isUtxoIndexed) {
      throw new Error('Node must have UTXO index enabled for streaming');
    }
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }

  // ==================== CHECK INITIAL BALANCE ====================
  console.log('2️⃣  Initial Balance Check');
  console.log('═════════════════════════════════════\n');

  try {
    const balance = await client.getBalance(MONITORED_ADDRESS);
    if (balance.ok) {
      const htn = HoosatUtils.sompiToAmount(balance.result!.balance);
      console.log(`Current Balance: ${htn} HTN`);
    }

    const utxos = await client.getUtxosByAddresses([MONITORED_ADDRESS]);
    if (utxos.ok) {
      console.log(`Total UTXOs:     ${utxos.result!.utxos.length}`);
    }
    console.log();
  } catch (error) {
    console.error('❌ Failed to check balance:', error);
  }

  // ==================== SUBSCRIBE TO UTXO CHANGES ====================
  console.log('3️⃣  Subscribe to UTXO Changes');
  console.log('═════════════════════════════════════\n');

  try {
    await client.events.subscribeToUtxoChanges([MONITORED_ADDRESS]);
    console.log('✅ Subscribed successfully!\n');
  } catch (error) {
    console.error('❌ Subscription failed:', error);
    process.exit(1);
  }

  // ==================== SETUP EVENT LISTENERS ====================
  console.log('4️⃣  Event Listeners Active');
  console.log('═════════════════════════════════════\n');
  console.log('Listening for UTXO changes...');
  console.log('Press Ctrl+C to stop monitoring\n');

  // UTXO change event
  client.events.on(EventType.UtxoChange, async (notification: UtxoChangeNotification) => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔔 UTXO CHANGE DETECTED!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Address: ${HoosatUtils.truncateAddress(notification.address)}`);
    console.log(`Time:    ${new Date().toLocaleString()}`);
    console.log();

    // Added UTXOs (received funds)
    if (notification.changes.added.length > 0) {
      console.log(`✅ ADDED (${notification.changes.added.length} UTXOs):`);
      notification.changes.added.forEach((utxo, i) => {
        const amount = HoosatUtils.sompiToAmount(utxo.amount);
        const txId = HoosatUtils.truncateHash(utxo.outpoint.transactionId);
        console.log(`   ${i + 1}. +${amount} HTN`);
        console.log(`      TX:       ${txId}`);
        console.log(`      Index:    ${utxo.outpoint.index}`);
        console.log(`      Coinbase: ${utxo.isCoinbase ? 'Yes' : 'No'}`);
      });
      console.log();
    }

    // Removed UTXOs (spent funds)
    if (notification.changes.removed.length > 0) {
      console.log(`❌ REMOVED (${notification.changes.removed.length} UTXOs):`);
      notification.changes.removed.forEach((utxo, i) => {
        const amount = HoosatUtils.sompiToAmount(utxo.amount);
        const txId = HoosatUtils.truncateHash(utxo.outpoint.transactionId);
        console.log(`   ${i + 1}. -${amount} HTN`);
        console.log(`      TX:       ${txId}`);
        console.log(`      Index:    ${utxo.outpoint.index}`);
      });
      console.log();
    }

    // Get updated balance
    try {
      const balance = await client.getBalance(MONITORED_ADDRESS);
      if (balance.ok) {
        const htn = HoosatUtils.sompiToAmount(balance.result!.balance);
        console.log(`💰 Updated Balance: ${htn} HTN`);
      }
    } catch (error) {
      console.error('Failed to fetch updated balance:', error);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });

  // Error event
  client.events.on(EventType.Error, error => {
    console.error('\n❌ Streaming Error:');
    console.error(`   ${error}`);
    console.error();
  });

  // Disconnect event
  client.events.on(EventType.Disconnect, () => {
    console.log('\n⚠️  Disconnected from node');
    console.log('   Attempting to reconnect...\n');
  });

  // Reconnecting event
  client.events.on(EventType.Reconnecting, () => {
    console.log('🔄 Reconnecting to node...');
  });

  // Reconnected event
  client.events.on(EventType.Reconnected, () => {
    console.log('✅ Reconnected successfully!\n');
  });

  // Max reconnect attempts reached
  client.events.on(EventType.MaxReconnectAttemptsReached, () => {
    console.error('\n❌ Max reconnection attempts reached');
    console.error('   Unable to maintain connection to node');
    console.error('   Exiting...\n');
    process.exit(1);
  });

  // ==================== GRACEFUL SHUTDOWN ====================

  // Handle Ctrl+C
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    console.log('─────────────────────────────────────');

    try {
      // Get final stats
      const stats = client.events.getStats();
      console.log('📊 Final Statistics:');
      console.log(`   Connected:          ${stats.isConnected}`);
      console.log(`   Subscriptions:      ${stats.utxoSubscriptions.length}`);
      console.log(`   Reconnect attempts: ${stats.reconnectAttempts}`);
      console.log();

      // Unsubscribe
      console.log('Unsubscribing from UTXO changes...');
      await client.events.unsubscribeFromUtxoChanges();
      console.log('✅ Unsubscribed');

      // Disconnect
      console.log('Disconnecting from node...');
      client.disconnect();
      console.log('✅ Disconnected');

      console.log('\n✅ Cleanup complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during cleanup:', error);
      process.exit(1);
    }
  });

  // Handle uncaught errors
  process.on('uncaughtException', error => {
    console.error('\n💥 Uncaught Exception:', error);
    client.disconnect();
    process.exit(1);
  });

  process.on('unhandledRejection', reason => {
    console.error('\n💥 Unhandled Rejection:', reason);
    client.disconnect();
    process.exit(1);
  });

  // Keep process alive
  console.log('💡 Tip: Send a small amount to the monitored address to see real-time updates!\n');
}

// Run example
main().catch(error => {
  console.error('\n💥 Fatal Error:', error);
  process.exit(1);
});
