import { HoosatNode } from '../src';

async function main() {
    // Connect to the node
    const node = new HoosatNode({
        host: '54.38.176.95',
        port: 42420,
    });

    try {
        // Get information about node
        console.log('📡 Getting node info...');
        const info = await node.getInfo();
        console.log('Node version:', info.serverVersion);
        console.log('Is synced:', info.isSynced);

        // Get information about blockchain
        console.log('\n⛓️  Getting BlockDAG info...');
        const blockdag = await node.getBlockDagInfo();
        console.log('Network:', blockdag.networkName);
        console.log('Block count:', blockdag.blockCount);
        console.log('Difficulty:', blockdag.difficulty);

        // Check balance address
        console.log('\n💰 Checking balance...');
        const balance = await node.getBalance('hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu');
        console.log('Balance:', node.formatAmount(balance.balance), 'HOO');

    } catch (error) {
        console.error('Error:', error);
    }
}

main();