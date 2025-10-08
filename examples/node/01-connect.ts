/**
 * Example: Connect to Hoosat Node
 *
 * Demonstrates:
 * - Connecting to a Hoosat node
 * - Retrieving node information
 * - Checking sync status
 * - Getting server version
 *
 * Prerequisites:
 * - Running Hoosat node (or public node access)
 */
import { HoosatClient } from 'hoosat-sdk';

async function main() {
  console.log('🔌 Connecting to Hoosat Node...\n');

  const client = new HoosatClient({
    host: process.env.HOOSAT_NODE_HOST || '54.38.176.95',
    port: parseInt(process.env.HOOSAT_NODE_PORT || '42420'),
  });

  try {
    // Get node information
    const info = await client.getInfo();

    if (!info.ok) {
      console.error('❌ Failed to connect:', info.error);
      return;
    }

    console.log('✅ Connected successfully!\n');

    console.log('📊 Node Information:');
    console.log('─────────────────────────────────────');
    console.log(`Server Version:     ${info.result!.serverVersion}`);
    console.log(`P2P ID:             ${info.result!.p2pId}`);
    console.log(`Is Synced:          ${info.result!.isSynced ? '✅' : '⏳ Syncing...'}`);
    console.log(`Is UTXOs Indexed:   ${info.result!.isUtxoIndexed ? '✅' : '⏳ Indexing...'}`);
    console.log(`Mempool Size:       ${info.result!.mempoolSize} transactions`);
    console.log('─────────────────────────────────────\n');

    // Get client info
    const clientInfo = client.getClientInfo();

    console.log('🔗 Connection Details:');
    console.log(`Host: ${clientInfo.host}:${clientInfo.port}`);
    console.log(`Timeout: ${clientInfo.timeout}ms\n`);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main().catch(console.error);
