/**
 * Example: Real-time Balance Tracking
 *
 * Demonstrates:
 * - Subscribing to UTXO changes for real-time balance updates
 * - Detecting incoming and outgoing transactions
 * - Calculating balance changes
 * - Logging transaction history
 * - Graceful reconnection on disconnects
 *
 * Prerequisites:
 * - Access to Hoosat node with UTXO index enabled
 * - Valid Hoosat address to monitor
 *
 * Use case:
 * - Real-time wallet applications
 * - Payment confirmation monitoring
 * - Balance notification systems
 * - Transaction history tracking
 *
 * 💡 Best Practices:
 * - Always handle disconnections gracefully
 * - Keep local balance cache for quick access
 * - Log all balance changes for audit trail
 * - Show pending vs confirmed transactions
 */
import { HoosatClient, HoosatUtils, UtxoChangeNotification } from 'hoosat-sdk';

// Balance tracker class
class BalanceTracker {
  private balance = 0n;
  private pendingBalance = 0n;
  private transactionHistory: Array<{
    timestamp: Date;
    type: 'incoming' | 'outgoing';
    amount: string;
    balance: string;
  }> = [];

  constructor(private address: string) {}

  updateBalance(confirmedBalance: bigint, pendingAmount = 0n) {
    const oldBalance = this.balance;
    this.balance = confirmedBalance;
    this.pendingBalance = pendingAmount;

    const change = confirmedBalance - oldBalance;

    if (change !== 0n) {
      this.logTransaction(change);
      console.log('\n💰 Balance Update:');
      console.log(`   Previous: ${HoosatUtils.sompiToAmount(oldBalance)} HTN`);
      console.log(`   Current:  ${HoosatUtils.sompiToAmount(this.balance)} HTN`);
      console.log(`   Change:   ${change > 0n ? '+' : ''}${HoosatUtils.sompiToAmount(change)} HTN`);

      if (this.pendingBalance > 0n) {
        console.log(`   Pending:  ${HoosatUtils.sompiToAmount(this.pendingBalance)} HTN`);
      }
      console.log();
    }
  }

  private logTransaction(change: bigint) {
    this.transactionHistory.push({
      timestamp: new Date(),
      type: change > 0n ? 'incoming' : 'outgoing',
      amount: HoosatUtils.sompiToAmount(change > 0n ? change : -change),
      balance: HoosatUtils.sompiToAmount(this.balance),
    });
  }

  getBalance(): string {
    return HoosatUtils.sompiToAmount(this.balance);
  }

  getPendingBalance(): string {
    return HoosatUtils.sompiToAmount(this.pendingBalance);
  }

  getTotalBalance(): string {
    return HoosatUtils.sompiToAmount(this.balance + this.pendingBalance);
  }

  getHistory() {
    return this.transactionHistory;
  }

  printHistory() {
    console.log('\n📜 Transaction History:');
    console.log('─────────────────────────────────────────────────────────');

    if (this.transactionHistory.length === 0) {
      console.log('  No transactions yet');
      return;
    }

    this.transactionHistory.forEach((tx, i) => {
      const arrow = tx.type === 'incoming' ? '📥' : '📤';
      const sign = tx.type === 'incoming' ? '+' : '-';
      console.log(`${i + 1}. ${arrow} ${tx.type.toUpperCase().padEnd(9)} ${sign}${tx.amount} HTN`);
      console.log(`   Time:    ${tx.timestamp.toLocaleString()}`);
      console.log(`   Balance: ${tx.balance} HTN`);
      console.log();
    });
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   📊 REAL-TIME BALANCE TRACKING');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== CONFIGURATION ====================
  console.log('⚙️  Configuration');
  console.log('─────────────────────────────────────');

  const NODE_HOST = '54.38.176.95';
  const NODE_PORT = 42420;

  // ⚠️ CHANGE THIS to your address
  const WATCH_ADDRESS = 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu';

  console.log(`Node:    ${NODE_HOST}:${NODE_PORT}`);
  console.log(`Address: ${HoosatUtils.truncateAddress(WATCH_ADDRESS)}`);
  console.log();

  // ==================== CONNECT TO NODE ====================
  console.log('1️⃣  Connecting to Node');
  console.log('═════════════════════════════════════');

  const client = new HoosatClient({
    host: NODE_HOST,
    port: NODE_PORT,
    timeout: 15000,
  });

  try {
    const info = await client.getInfo();
    if (!info.ok || !info.result) {
      throw new Error('Failed to connect to node');
    }

    console.log('✅ Connected successfully');
    console.log(`   Server Version: ${info.result.serverVersion}`);
    console.log(`   Is Synced:      ${info.result.isSynced}`);
    console.log(`   Has UTXO Index: ${info.result.isUtxoIndexed}\n`);

    if (!info.result.isUtxoIndexed) {
      throw new Error('Node must have UTXO index enabled (--utxoindex flag)');
    }
  } catch (error) {
    console.error('❌ Failed to connect:', error);
    process.exit(1);
  }

  // ==================== INITIALIZE BALANCE TRACKER ====================
  console.log('2️⃣  Initialize Balance Tracker');
  console.log('═════════════════════════════════════');

  const tracker = new BalanceTracker(WATCH_ADDRESS);

  // Get initial balance
  try {
    const balanceResult = await client.getBalance(WATCH_ADDRESS);

    if (!balanceResult.ok || !balanceResult.result) {
      throw new Error('Failed to get balance');
    }

    const initialBalance = BigInt(balanceResult.result.balance);
    tracker.updateBalance(initialBalance);

    console.log('✅ Initial balance loaded');
    console.log(`   Balance: ${HoosatUtils.sompiToAmount(initialBalance)} HTN\n`);
  } catch (error) {
    console.error('❌ Failed to get initial balance:', error);
    process.exit(1);
  }

  // ==================== SUBSCRIBE TO UTXO CHANGES ====================
  console.log('3️⃣  Subscribe to Real-time Updates');
  console.log('═════════════════════════════════════');

  try {
    // Subscribe to UTXO changes
    await client.subscribeToUtxoChanges([WATCH_ADDRESS]);

    console.log('✅ Subscribed to UTXO changes');
    console.log('   Monitoring for transactions...\n');
  } catch (error) {
    console.error('❌ Failed to subscribe:', error);
    process.exit(1);
  }

  // ==================== HANDLE UTXO CHANGES ====================
  console.log('4️⃣  Waiting for Transactions');
  console.log('═════════════════════════════════════');
  console.log('   Send HTN to this address to see real-time updates!');
  console.log(`   Address: ${WATCH_ADDRESS}`);
  console.log();
  console.log('   Press Ctrl+C to stop monitoring...\n');

  // Listen for UTXO changes
  client.on('utxoChange', async (notification: UtxoChangeNotification) => {
    console.log('🔔 UTXO Change Detected!');
    console.log('─────────────────────────────────────');

    const { added, removed } = notification.changes;

    console.log(`   Added UTXOs:   ${added.length}`);
    console.log(`   Removed UTXOs: ${removed.length}`);
    console.log();

    // Detect transaction type
    if (added.length > 0 && removed.length === 0) {
      console.log('📥 INCOMING TRANSACTION');
      console.log('   You received funds!');

      added.forEach((utxo, i) => {
        const amount = BigInt(utxo.amount);
        console.log(`   ${i + 1}. +${HoosatUtils.sompiToAmount(amount)} HTN`);
      });
    } else if (removed.length > 0 && added.length === 0) {
      console.log('📤 OUTGOING TRANSACTION');
      console.log('   You sent funds!');

      removed.forEach((utxo, i) => {
        const amount = BigInt(utxo.amount);
        console.log(`   ${i + 1}. -${HoosatUtils.sompiToAmount(amount)} HTN`);
      });
    } else if (added.length > 0 && removed.length > 0) {
      console.log('🔄 TRANSACTION WITH CHANGE');
      console.log('   You sent funds and received change');
    }

    console.log();

    // Update balance
    try {
      const balanceResult = await client.getBalance(WATCH_ADDRESS);

      if (balanceResult.ok && balanceResult.result) {
        const newBalance = BigInt(balanceResult.result.balance);
        tracker.updateBalance(newBalance);
      }
    } catch (error) {
      console.error('   ⚠️  Failed to update balance:', error);
    }

    console.log('   Waiting for next transaction...\n');
  });

  // Handle connection errors
  client.on('error', error => {
    console.error('\n❌ Connection Error:', error);
    console.log('   Attempting to reconnect...\n');
  });

  // Handle disconnection
  client.on('disconnect', () => {
    console.log('\n⚠️  Disconnected from node');
    console.log('   Streaming stopped\n');
  });

  // ==================== PERIODIC BALANCE CHECK ====================
  // Check balance every 30 seconds as backup
  const balanceCheckInterval = setInterval(async () => {
    try {
      const balanceResult = await client.getBalance(WATCH_ADDRESS);

      if (balanceResult.ok && balanceResult.result) {
        const currentBalance = BigInt(balanceResult.result.balance);
        tracker.updateBalance(currentBalance);
      }
    } catch (error) {
      // Silent fail - streaming should catch changes
    }
  }, 30000);

  // ==================== GRACEFUL SHUTDOWN ====================
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down gracefully...\n');

    clearInterval(balanceCheckInterval);

    // Print final summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   📊 SESSION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('Final Balance:');
    console.log(`  Confirmed: ${tracker.getBalance()} HTN`);
    console.log(`  Pending:   ${tracker.getPendingBalance()} HTN`);
    console.log(`  Total:     ${tracker.getTotalBalance()} HTN`);
    console.log();

    // Print transaction history
    tracker.printHistory();

    // Disconnect
    try {
      await client.unsubscribeFromUtxoChanges();
      client.disconnect();
      console.log('✅ Disconnected from node\n');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
    }

    process.exit(0);
  });

  // ==================== KEEP ALIVE ====================
  // Keep script running
  await new Promise(() => {}); // Run forever until Ctrl+C
}

// Run example
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
