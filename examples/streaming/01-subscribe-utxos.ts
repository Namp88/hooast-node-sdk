/**
 * Example: Subscribe to UTXO Changes
 *
 * Demonstrates:
 * - Subscribing to real-time UTXO updates
 * - Listening to utxoChanged events
 * - Handling connection status
 * - Graceful shutdown
 *
 * Prerequisites:
 * - Running Hoosat node with streaming support
 * - Valid address to monitor
 *
 * Note: This example runs continuously until interrupted (Ctrl+C)
 */

import { HoosatNode, HoosatUtils, UtxoChangeNotification } from '../../src';

async function main() {
  console.log('📡 Real-time UTXO Monitoring\n');

  // Connect to node
  const node = new HoosatNode({
    host: process.env.HOOSAT_NODE_HOST || '54.38.176.95',
    port: parseInt(process.env.HOOSAT_NODE_PORT || '42420'),
  });

  // Address to monitor (use from environment or example)
  const address = process.env.HOOSAT_ADDRESS || 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu';

  console.log(`Monitoring address: ${HoosatUtils.truncateAddress(address)}\n`);

  // Validate address
  if (!HoosatUtils.isValidAddress(address)) {
    console.error('❌ Invalid address format');
    return;
  }

  try {
    // Set up event listeners BEFORE subscribing
    node.on('utxoChanged', (change: UtxoChangeNotification) => {
      console.log('\n🔔 UTXO Change Detected!');
      console.log('─────────────────────────────────────');
      console.log(`Address: ${HoosatUtils.truncateAddress(change.address)}`);
      console.log(`Added UTXOs:   ${change.changes.added.length}`);
      console.log(`Removed UTXOs: ${change.changes.removed.length}`);

      // Display added UTXOs
      if (change.changes.added.length > 0) {
        console.log('\n✅ Added UTXOs:');
        change.changes.added.forEach((utxo, idx) => {
          console.log(`  ${idx + 1}. Amount: ${HoosatUtils.sompiToAmount(utxo.amount)} HTN`);
          console.log(`     TxID: ${HoosatUtils.truncateHash(utxo.outpoint.transactionId)}`);
          console.log(`     Index: ${utxo.outpoint.index}`);
        });
      }

      // Display removed UTXOs
      if (change.changes.removed.length > 0) {
        console.log('\n❌ Removed UTXOs:');
        change.changes.removed.forEach((utxo, idx) => {
          console.log(`  ${idx + 1}. Amount: ${HoosatUtils.sompiToAmount(utxo.amount)} HTN`);
          console.log(`     TxID: ${HoosatUtils.truncateHash(utxo.outpoint.transactionId)}`);
          console.log(`     Index: ${utxo.outpoint.index}`);
        });
      }

      console.log('─────────────────────────────────────\n');
    });

    // Handle streaming events
    node.on('streamReconnected', () => {
      console.log('🔄 Stream reconnected successfully\n');
    });

    node.on('streamingError', (error: unknown) => {
      console.error('❌ Streaming error:', error);
    });

    node.on('streamEnded', () => {
      console.log('⚠️  Stream ended unexpectedly\n');
    });

    node.on('streamMaxReconnectAttemptsReached', () => {
      console.error('❌ Max reconnection attempts reached\n');
      process.exit(1);
    });

    // Subscribe to address
    console.log('📡 Subscribing to UTXO changes...\n');
    await node.subscribeToUtxoChanges([address]);

    console.log('✅ Subscription active!\n');
    console.log('Waiting for UTXO changes...');
    console.log('(Send HTN to this address to see updates)');
    console.log('Press Ctrl+C to stop\n');

    // Check connection status
    setInterval(() => {
      const isConnected = node.isStreamingConnected();
      const subscribed = node.getSubscribedAddresses();

      if (isConnected) {
        console.log(`📊 Status: Connected | Monitoring ${subscribed.length} address(es)`);
      }
    }, 30000); // Every 30 seconds
  } catch (error) {
    console.error('❌ Error:', error);
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n\n🛑 Shutting down...');

    try {
      await node.unsubscribeFromUtxoChanges();
      node.disconnect();
      console.log('✅ Disconnected successfully');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }

    process.exit(0);
  });
}

main().catch(console.error);
