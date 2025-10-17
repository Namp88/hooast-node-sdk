/**
 * Example 02: Multi-Node Configuration with Automatic Failover
 *
 * What you'll learn:
 * - How to configure SDK with multiple Hoosat nodes
 * - How to designate primary node with automatic fallback
 * - How automatic health checking works
 * - How to monitor node status in real-time
 * - How failover happens transparently during requests
 * - Best practices for production deployments
 *
 * Prerequisites:
 * - Access to 2+ Hoosat nodes (can be mainnet or testnet)
 * - Nodes should have --utxoindex flag enabled
 * - Nodes should be synced
 */

import { HoosatClient } from 'hoosat-sdk';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   🔄 EXAMPLE 02: MULTI-NODE FAILOVER');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== CONFIGURATION ====================
  console.log('⚙️  Multi-Node Configuration');
  console.log('─────────────────────────────────────────');

  /**
   * Multi-node configuration allows you to specify multiple Hoosat nodes
   * for automatic failover and high availability.
   *
   * Key features:
   * - Primary node designation (primary: true)
   * - Automatic health checking every 30 seconds (customizable)
   * - Retry with automatic node switching on failure
   * - UTXO index and sync status validation
   * - Transparent failover - your code doesn't change!
   */
  const client = new HoosatClient({
    // Array of nodes for failover
    nodes: [
      {
        host: '54.38.176.95',
        port: 42420,
        primary: true, // This is the primary node
        name: 'Primary Node (France)',
      },
      {
        host: '10.0.0.2', // Replace with your backup node
        port: 42420,
        name: 'Backup Node 1',
      },
      {
        host: '10.0.0.3', // Replace with your backup node
        port: 42420,
        name: 'Backup Node 2',
      },
    ],

    // Health check configuration
    healthCheckInterval: 30000, // Check health every 30 seconds
    requireUtxoIndex: true, // Only use nodes with UTXO index
    requireSynced: true, // Only use synced nodes

    // Retry configuration
    retryAttempts: 3, // Retry failed requests up to 3 times
    retryDelay: 1000, // Wait 1 second between retries

    // Enable debug mode to see failover in action
    debug: true, // Will log node switching and health checks
  });

  console.log('✅ Multi-node client initialized');
  console.log('   Primary node:        Primary Node (France)');
  console.log('   Backup nodes:        2');
  console.log('   Health check:        Every 30 seconds');
  console.log('   Retry attempts:      3');
  console.log('   Require UTXO index:  Yes');
  console.log('   Require synced:      Yes\n');

  // ==================== STEP 1: INITIAL CONNECTION ====================
  console.log('1️⃣  Connecting to Primary Node');
  console.log('═════════════════════════════════════════');

  try {
    const info = await client.getInfo();
    if (!info.ok || !info.result) {
      throw new Error('Failed to connect to node');
    }

    console.log('✅ Connected to primary node successfully');
    console.log(`   Server Version: ${info.result.serverVersion}`);
    console.log(`   Network:        ${info.result.networkName}`);
    console.log(`   Is Synced:      ${info.result.isSynced}`);
    console.log(`   Has UTXO Index: ${info.result.isUtxoIndexed}\n`);
  } catch (error) {
    console.error('❌ Failed to connect:', error);
    console.error('   Make sure at least one node is accessible\n');
    process.exit(1);
  }

  // ==================== STEP 2: CHECK NODE HEALTH STATUS ====================
  console.log('2️⃣  Check All Nodes Health Status');
  console.log('═════════════════════════════════════════');

  // Wait a moment for initial health checks to complete
  console.log('⏳ Waiting for initial health checks to complete...\n');
  await sleep(3000);

  const nodesStatus = client.getNodesStatus();
  if (nodesStatus) {
    console.log('📊 Node Health Report:');
    console.log('─────────────────────────────────────────');

    nodesStatus.forEach((node, index) => {
      const nodeName = node.config.name || `${node.config.host}:${node.config.port}`;
      const isPrimary = node.config.primary ? ' (PRIMARY)' : '';

      console.log(`\n${index + 1}. ${nodeName}${isPrimary}`);
      console.log(`   Host:              ${node.config.host}:${node.config.port}`);
      console.log(`   Status:            ${node.health.isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);
      console.log(`   Synced:            ${node.health.isSynced ? '✅ Yes' : '❌ No'}`);
      console.log(`   UTXO Indexed:      ${node.health.isUtxoIndexed ? '✅ Yes' : '❌ No'}`);
      console.log(`   Consecutive Fails: ${node.health.consecutiveFailures}`);

      if (node.health.lastCheck) {
        const lastCheckAgo = Date.now() - node.health.lastCheck;
        console.log(`   Last Check:        ${Math.floor(lastCheckAgo / 1000)}s ago`);
      }
    });

    console.log();

    // Count healthy nodes
    const healthyCount = nodesStatus.filter((n) => n.health.isHealthy).length;
    console.log(`\n📈 Summary: ${healthyCount}/${nodesStatus.length} nodes are healthy and ready\n`);
  }

  // ==================== STEP 3: DEMONSTRATE AUTOMATIC FAILOVER ====================
  console.log('3️⃣  Demonstrate Automatic Failover');
  console.log('═════════════════════════════════════════');
  console.log('Making multiple requests to demonstrate transparent failover...\n');

  /**
   * IMPORTANT: All SDK methods automatically benefit from failover!
   *
   * When a request fails:
   * 1. SDK automatically switches to next healthy node
   * 2. Request is retried on the new node
   * 3. If new node also fails, switches to next one
   * 4. Process continues until success or all nodes tried
   *
   * Your code stays the same - failover is completely transparent!
   */

  try {
    // Example 1: Get blockchain info
    console.log('Request 1: Getting block DAG info...');
    const dagInfo = await client.getBlockDagInfo();
    if (dagInfo.ok) {
      console.log('✅ Success! Block count:', dagInfo.result?.blockCount);
    }

    // Example 2: Get balance
    console.log('\nRequest 2: Getting balance...');
    const balance = await client.getBalance('hoosat:qz7ulu8sckqyz7ps3kt3fved2hc05du2gx25q2nm6kk5c6y4e7j76ptvrj6jm');
    if (balance.ok) {
      console.log('✅ Success! Balance:', balance.result?.balance);
    }

    // Example 3: Get network info
    console.log('\nRequest 3: Getting network info...');
    const network = await client.getCurrentNetwork();
    if (network.ok) {
      console.log('✅ Success! Network:', network.result?.currentNetwork);
    }

    console.log('\n✅ All requests completed successfully!');
    console.log('   Note: If primary node had failed, SDK would have automatically');
    console.log('   switched to backup nodes without you noticing!\n');
  } catch (error) {
    console.error('❌ All nodes failed:', error);
    console.error('   This happens when all configured nodes are unreachable\n');
  }

  // ==================== STEP 4: UNDERSTANDING HEALTH CHECKS ====================
  console.log('4️⃣  Understanding Health Checks');
  console.log('═════════════════════════════════════════');

  console.log(`
How health checks work:

1️⃣  Periodic Checks:
   - SDK checks all nodes every ${30} seconds (configurable)
   - Makes getInfo() request to each node
   - Validates isSynced and isUtxoIndexed flags

2️⃣  Health Criteria:
   - Node must respond to requests (not timeout)
   - Node must be synced (if requireSynced: true)
   - Node must have UTXO index (if requireUtxoIndex: true)

3️⃣  Automatic Switching:
   - When request fails, SDK switches to next healthy node
   - Nodes are checked for health before switching
   - Primary node is always preferred when healthy

4️⃣  Monitoring:
   - Use client.getNodesStatus() to check health anytime
   - Enable debug: true to see logs in console
   - Track consecutiveFailures to identify problem nodes
`);

  // ==================== STEP 5: PRODUCTION BEST PRACTICES ====================
  console.log('5️⃣  Production Best Practices');
  console.log('═════════════════════════════════════════');

  console.log(`
📋 Recommended Configuration:

1️⃣  Minimum 2-3 Nodes:
   - At least one primary and one backup
   - Distribute across different data centers
   - Use geographically diverse locations

2️⃣  Health Check Settings:
   - healthCheckInterval: 30000 (30 seconds)
   - requireUtxoIndex: true (for balance/UTXO queries)
   - requireSynced: true (for accurate data)

3️⃣  Retry Settings:
   - retryAttempts: 3 (try up to 3 nodes)
   - retryDelay: 1000 (1 second between retries)

4️⃣  Monitoring:
   - Enable debug: true in development
   - Monitor getNodesStatus() periodically
   - Set up alerts for all nodes unhealthy

5️⃣  Node Requirements:
   - All nodes must have --utxoindex flag
   - All nodes must be fully synced
   - All nodes should have similar versions

Example production config:

const client = new HoosatClient({
  nodes: [
    { host: 'node1.example.com', port: 42420, primary: true, name: 'US-East' },
    { host: 'node2.example.com', port: 42420, name: 'EU-West' },
    { host: 'node3.example.com', port: 42420, name: 'Asia-Pacific' }
  ],
  healthCheckInterval: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  requireUtxoIndex: true,
  requireSynced: true,
  debug: false // Disable in production
});
`);

  // ==================== COMPLETION ====================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   ✅ MULTI-NODE FAILOVER EXAMPLE COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Summary:');
  console.log('  ✅ Configured multi-node client with automatic failover');
  console.log('  ✅ Checked health status of all nodes');
  console.log('  ✅ Made requests with transparent failover');
  console.log('  ✅ Learned about health checks and monitoring');
  console.log('  ✅ Reviewed production best practices');
  console.log();

  console.log('Key Takeaways:');
  console.log('  • Multi-node setup provides high availability');
  console.log('  • Failover is completely transparent to your code');
  console.log('  • Health checks ensure only healthy nodes are used');
  console.log('  • Primary node is always preferred when healthy');
  console.log('  • All SDK methods automatically benefit from failover');
  console.log();

  console.log('What happens during failover?');
  console.log('  1. Request fails on primary node');
  console.log('  2. SDK checks health of next node');
  console.log('  3. If healthy, request is retried on that node');
  console.log('  4. Process repeats until success or all nodes tried');
  console.log('  5. Your code never knows the difference!');
  console.log();

  // Cleanup
  client.disconnect();
  console.log('✅ Disconnected from all nodes\n');
}

/**
 * Helper function to sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Run example
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
