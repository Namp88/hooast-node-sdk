import { HoosatNode } from '../src';

async function showNetworkStats() {
    const node = new HoosatNode({
        host: '54.38.176.95',
        port: 42420,
    });

    console.log('📊 Hoosat Network Statistics\n');

    try {
        // Node info
        const info = await node.getInfo();
        console.log('🖥️  Node Info:');
        console.log('   Version:', info.serverVersion);
        console.log('   Synced:', info.isSynced ? '✅' : '❌');
        console.log('   Mempool:', info.mempoolSize, 'transactions\n');

        // Blockchain info
        const blockdag = await node.getBlockDagInfo();
        console.log('⛓️  Blockchain:');
        console.log('   Network:', blockdag.networkName);
        console.log('   Blocks:', blockdag.blockCount);
        console.log('   Headers:', blockdag.headerCount);
        console.log('   Difficulty:', blockdag.difficulty.toFixed(2));
        console.log('   DAA Score:', blockdag.virtualDaaScore, '\n');

        // Hashrate
        const hashrate = await node.estimateNetworkHashesPerSecond();
        const hashrateNum = parseFloat(hashrate);
        const hashrateGH = (hashrateNum / 1e9).toFixed(2);
        console.log('⚡ Hashrate:', hashrateGH, 'GH/s\n');

        // Coin supply
        const supply = await node.getCoinSupply();
        console.log('💰 Supply:');
        console.log('   Circulating:', node.formatAmount(supply.circulatingSupply), 'HOO');
        console.log('   Max:', node.formatAmount(supply.maxSupply), 'HOO\n');

        // Peers
        const peers = await node.getConnectedPeerInfo();
        console.log('👥 Peers:', peers.length, 'connected');

    } catch (error) {
        console.error('Error:', error);
    }
}

showNetworkStats();