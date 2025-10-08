/**
 * Example: Network Statistics Monitoring
 *
 * Demonstrates:
 * - Fetching and displaying network metrics
 * - Monitoring mempool size and activity
 * - Tracking block production rate
 * - Connected peers information
 * - Network health indicators
 *
 * Prerequisites:
 * - Access to Hoosat node
 *
 * Use case:
 * - Network monitoring dashboards
 * - Health check systems
 * - Performance analysis
 * - Network congestion detection
 *
 * 💡 Best Practices:
 * - Poll at reasonable intervals (30-60 seconds)
 * - Cache results to reduce node load
 * - Monitor trends over time, not just snapshots
 */
import { HoosatClient, HoosatUtils } from '../../src';

interface NetworkSnapshot {
  timestamp: Date;
  blockCount: string;
  headerCount: string;
  mempoolSize: number;
  connectedPeers: number;
  isSynced: boolean;
}

class NetworkMonitor {
  private snapshots: NetworkSnapshot[] = [];

  addSnapshot(snapshot: NetworkSnapshot) {
    this.snapshots.push(snapshot);

    // Keep only last 100 snapshots
    if (this.snapshots.length > 100) {
      this.snapshots.shift();
    }
  }

  getAverageMempoolSize(): number {
    if (this.snapshots.length === 0) return 0;

    const sum = this.snapshots.reduce((acc, s) => acc + s.mempoolSize, 0);
    return Math.round(sum / this.snapshots.length);
  }

  getAveragePeerCount(): number {
    if (this.snapshots.length === 0) return 0;

    const sum = this.snapshots.reduce((acc, s) => acc + s.connectedPeers, 0);
    return Math.round(sum / this.snapshots.length);
  }

  getSnapshots() {
    return this.snapshots;
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   📈 NETWORK STATISTICS MONITORING');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== CONFIGURATION ====================
  console.log('⚙️  Configuration');
  console.log('─────────────────────────────────────');

  const NODE_HOST = '54.38.176.95';
  const NODE_PORT = 42420;
  const POLL_INTERVAL = 10000; // 10 seconds for demo (use 30-60s in production)

  console.log(`Node:          ${NODE_HOST}:${NODE_PORT}`);
  console.log(`Poll Interval: ${POLL_INTERVAL / 1000}s`);
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
    console.log(`   Is Synced:      ${info.result.isSynced}\n`);
  } catch (error) {
    console.error('❌ Failed to connect:', error);
    process.exit(1);
  }

  // ==================== INITIAL SNAPSHOT ====================
  console.log('2️⃣  Initial Network Snapshot');
  console.log('═════════════════════════════════════\n');

  const monitor = new NetworkMonitor();

  async function collectSnapshot(): Promise<NetworkSnapshot | null> {
    try {
      // Get node info
      const infoResult = await client.getInfo();
      if (!infoResult.ok || !infoResult.result) {
        throw new Error('Failed to get node info');
      }

      // Get block count
      const blockCountResult = await client.getBlockCount();
      if (!blockCountResult.ok || !blockCountResult.result) {
        throw new Error('Failed to get block count');
      }

      // Get mempool entries
      const mempoolResult = await client.getMempoolEntries(false, false);
      const mempoolSize = mempoolResult.ok && mempoolResult.result ? mempoolResult.result.entries.length : 0;

      // Get connected peers
      const peersResult = await client.getConnectedPeerInfo();
      const peerCount = peersResult.ok && peersResult.result ? peersResult.result.peers.length : 0;

      return {
        timestamp: new Date(),
        blockCount: blockCountResult.result.blockCount,
        headerCount: blockCountResult.result.headerCount,
        mempoolSize,
        connectedPeers: peerCount,
        isSynced: infoResult.result.isSynced,
      };
    } catch (error) {
      console.error('   ⚠️  Failed to collect snapshot:', error);
      return null;
    }
  }

  function displaySnapshot(snapshot: NetworkSnapshot) {
    console.log('📊 Network Statistics');
    console.log('─────────────────────────────────────');
    console.log(`   Time:          ${snapshot.timestamp.toLocaleTimeString()}`);
    console.log(`   Synced:        ${snapshot.isSynced ? '✅ Yes' : '⚠️  No'}`);
    console.log(`   Block Count:   ${snapshot.blockCount}`);
    console.log(`   Header Count:  ${snapshot.headerCount}`);
    console.log(`   Mempool Size:  ${snapshot.mempoolSize} transactions`);
    console.log(`   Peers:         ${snapshot.connectedPeers} connected`);
    console.log();
  }

  // Take initial snapshot
  const initialSnapshot = await collectSnapshot();
  if (initialSnapshot) {
    monitor.addSnapshot(initialSnapshot);
    displaySnapshot(initialSnapshot);
  }

  // ==================== DETAILED PEER INFORMATION ====================
  console.log('3️⃣  Connected Peers Details');
  console.log('═════════════════════════════════════\n');

  try {
    const peersResult = await client.getConnectedPeerInfo();

    if (peersResult.ok && peersResult.result) {
      const peers = peersResult.result.peers;

      if (peers.length === 0) {
        console.log('   No peers connected');
      } else {
        console.log(`   Total Peers: ${peers.length}\n`);

        peers.slice(0, 5).forEach((peer, i) => {
          console.log(`   Peer ${i + 1}:`);
          console.log(`     Address:     ${peer.address}`);
          console.log(`     Outbound:    ${peer.isOutbound ? 'Yes' : 'No'}`);
          console.log(`     User Agent:  ${peer.userAgent || 'N/A'}`);
          console.log(`     Time Offset: ${peer.timeOffset}ms`);
          console.log();
        });

        if (peers.length > 5) {
          console.log(`   ... and ${peers.length - 5} more peers\n`);
        }
      }
    }
  } catch (error) {
    console.error('   ⚠️  Failed to get peer info:', error);
  }

  // ==================== MEMPOOL ANALYSIS ====================
  console.log('4️⃣  Mempool Analysis');
  console.log('═════════════════════════════════════\n');

  try {
    const mempoolResult = await client.getMempoolEntries(false, false);

    if (mempoolResult.ok && mempoolResult.result) {
      const entries = mempoolResult.result.entries;

      if (entries.length === 0) {
        console.log('   Mempool is empty - network is clear!');
      } else {
        console.log(`   Total Transactions: ${entries.length}\n`);

        // Calculate fee statistics
        const fees = entries
          .map(e => BigInt(e.fee || '0'))
          .filter(f => f > 0n)
          .sort((a, b) => Number(a - b));

        if (fees.length > 0) {
          const totalFees = fees.reduce((sum, fee) => sum + fee, 0n);
          const avgFee = totalFees / BigInt(fees.length);
          const medianFee = fees[Math.floor(fees.length / 2)];
          const minFee = fees[0];
          const maxFee = fees[fees.length - 1];

          console.log('   Fee Statistics:');
          console.log(`     Total Fees:  ${HoosatUtils.sompiToAmount(totalFees)} HTN`);
          console.log(`     Average Fee: ${HoosatUtils.sompiToAmount(avgFee)} HTN`);
          console.log(`     Median Fee:  ${HoosatUtils.sompiToAmount(medianFee)} HTN`);
          console.log(`     Min Fee:     ${HoosatUtils.sompiToAmount(minFee)} HTN`);
          console.log(`     Max Fee:     ${HoosatUtils.sompiToAmount(maxFee)} HTN`);
          console.log();
        }

        // Show recent transactions
        console.log('   Recent Transactions:');
        entries.slice(0, 3).forEach((entry, i) => {
          const fee = BigInt(entry.fee || '0');
          console.log(`     ${i + 1}. Fee: ${HoosatUtils.sompiToAmount(fee)} HTN`);
        });
        console.log();
      }
    }
  } catch (error) {
    console.error('   ⚠️  Failed to analyze mempool:', error);
  }

  // ==================== CONTINUOUS MONITORING ====================
  console.log('5️⃣  Continuous Monitoring');
  console.log('═════════════════════════════════════');
  console.log(`   Monitoring every ${POLL_INTERVAL / 1000} seconds...`);
  console.log('   Press Ctrl+C to stop\n');

  let pollCount = 0;

  const monitoringInterval = setInterval(async () => {
    pollCount++;

    const snapshot = await collectSnapshot();
    if (!snapshot) return;

    monitor.addSnapshot(snapshot);

    console.log(`\n📊 Update #${pollCount} - ${snapshot.timestamp.toLocaleTimeString()}`);
    console.log('─────────────────────────────────────');
    console.log(`   Blocks:   ${snapshot.blockCount}`);
    console.log(`   Mempool:  ${snapshot.mempoolSize} txs`);
    console.log(`   Peers:    ${snapshot.connectedPeers}`);

    // Detect changes
    const snapshots = monitor.getSnapshots();
    if (snapshots.length > 1) {
      const prev = snapshots[snapshots.length - 2];

      const blockDiff = Number(BigInt(snapshot.blockCount) - BigInt(prev.blockCount));
      const mempoolDiff = snapshot.mempoolSize - prev.mempoolSize;
      const peerDiff = snapshot.connectedPeers - prev.connectedPeers;

      if (blockDiff > 0) {
        console.log(`   📦 +${blockDiff} new block(s)`);
      }

      if (mempoolDiff !== 0) {
        console.log(`   ${mempoolDiff > 0 ? '📈' : '📉'} Mempool ${mempoolDiff > 0 ? '+' : ''}${mempoolDiff} txs`);
      }

      if (peerDiff !== 0) {
        console.log(`   ${peerDiff > 0 ? '📶' : '📵'} Peers ${peerDiff > 0 ? '+' : ''}${peerDiff}`);
      }
    }

    // Show averages every 5 polls
    if (pollCount % 5 === 0) {
      console.log(`\n   Averages (last ${snapshots.length} snapshots):`);
      console.log(`     Mempool: ${monitor.getAverageMempoolSize()} txs`);
      console.log(`     Peers:   ${monitor.getAveragePeerCount()}`);
    }

    console.log();
  }, POLL_INTERVAL);

  // ==================== GRACEFUL SHUTDOWN ====================
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down monitoring...\n');

    clearInterval(monitoringInterval);

    // Print final summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   📊 MONITORING SESSION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    const snapshots = monitor.getSnapshots();

    if (snapshots.length > 0) {
      const first = snapshots[0];
      const last = snapshots[snapshots.length - 1];

      console.log('Session Info:');
      console.log(`  Duration:    ${Math.round((last.timestamp.getTime() - first.timestamp.getTime()) / 1000)}s`);
      console.log(`  Snapshots:   ${snapshots.length}`);
      console.log();

      console.log('Network Changes:');
      console.log(`  Blocks:      ${first.blockCount} → ${last.blockCount}`);
      console.log(`  Mempool:     ${first.mempoolSize} → ${last.mempoolSize} txs`);
      console.log(`  Peers:       ${first.connectedPeers} → ${last.connectedPeers}`);
      console.log();

      console.log('Averages:');
      console.log(`  Mempool:     ${monitor.getAverageMempoolSize()} txs`);
      console.log(`  Peers:       ${monitor.getAveragePeerCount()}`);
      console.log();
    }

    client.disconnect();
    console.log('✅ Disconnected from node\n');

    process.exit(0);
  });

  // Keep alive
  await new Promise(() => {});
}

// Run example
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
