const { HoosatNode } = require('./dist/index.js');

async function testAll() {
    console.log('🚀 Testing @hoosat/node-sdk - Extended Tests\n');
    console.log('='.repeat(60));

    const node = new HoosatNode({
        host: '54.38.176.95',
        port: 42420
    });

    let passedTests = 0;
    let failedTests = 0;

    // Helper function
    const test = async (name, fn) => {
        try {
            console.log(`\n📝 ${name}...`);
            await fn();
            console.log(`✅ PASSED`);
            passedTests++;
        } catch (error) {
            console.log(`❌ FAILED: ${error.message}`);
            failedTests++;
        }
    };

    // ==================== BASIC TESTS ====================

    await test('Test 1: Get Node Info', async () => {
        const info = await node.getInfo();
        console.log(`   Version: ${info.serverVersion}`);
        console.log(`   Synced: ${info.isSynced}`);
        console.log(`   UTXO Indexed: ${info.isUtxoIndexed}`);
        console.log(`   Mempool Size: ${info.mempoolSize}`);
        if (!info.serverVersion) throw new Error('No version returned');
    });

    await test('Test 2: Get BlockDAG Info', async () => {
        const blockdag = await node.getBlockDagInfo();
        console.log(`   Network: ${blockdag.networkName}`);
        console.log(`   Blocks: ${blockdag.blockCount}`);
        console.log(`   Headers: ${blockdag.headerCount}`);
        console.log(`   Difficulty: ${blockdag.difficulty}`);
        console.log(`   DAA Score: ${blockdag.virtualDaaScore}`);
        if (!blockdag.networkName) throw new Error('No network name');
    });

    await test('Test 3: Get Balance', async () => {
        const address = 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu';
        const balance = await node.getBalance(address);
        console.log(`   Address: ${address.substring(0, 20)}...`);
        console.log(`   Balance: ${node.formatAmount(balance.balance)} HOO`);
        console.log(`   Raw: ${balance.balance} sompi`);
        if (balance.balance === undefined) throw new Error('No balance returned');
    });

    // ==================== NEW TESTS ====================

    await test('Test 4: Get Block Count', async () => {
        const count = await node.getBlockCount();
        console.log(`   Total Blocks: ${count}`);
        if (!count) throw new Error('No block count');
    });

    await test('Test 5: Get Header Count', async () => {
        const count = await node.getHeaderCount();
        console.log(`   Total Headers: ${count}`);
        if (!count) throw new Error('No header count');
    });

    await test('Test 6: Get Selected Tip Hash', async () => {
        const tipHash = await node.getSelectedTipHash();
        console.log(`   Tip Hash: ${tipHash.substring(0, 20)}...`);
        if (!tipHash) throw new Error('No tip hash');
    });

    await test('Test 7: Get Single Block', async () => {
        const tipHash = await node.getSelectedTipHash();
        const block = await node.getBlock(tipHash, false);
        console.log(`   Block Hash: ${block.verboseData?.hash?.substring(0, 20) || 'N/A'}...`);
        console.log(`   Blue Score: ${block.header.blueScore}`);
        console.log(`   DAA Score: ${block.header.daaScore}`);
        console.log(`   Timestamp: ${new Date(parseInt(block.header.timestamp)).toISOString()}`);
        if (!block.header) throw new Error('No block header');
    });

    await test('Test 8: Get UTXOs', async () => {
        const address = 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu';
        const utxos = await node.getUtxos([address]);
        console.log(`   UTXOs found: ${utxos.length}`);
        if (utxos.length > 0) {
            console.log(`   First UTXO amount: ${node.formatAmount(utxos[0].utxoEntry.amount)} HOO`);
            console.log(`   First UTXO tx: ${utxos[0].outpoint.transactionId.substring(0, 20)}...`);
        }
        // UTXOs может не быть для адреса, это нормально
    });

    await test('Test 9: Get Transactions by Address', async () => {
        const address = 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu';
        const txs = await node.getTransactionsByAddress(address);
        console.log(`   Transactions found: ${txs.length}`);
        if (txs.length > 0) {
            console.log(`   First TX ID: ${txs[0].transactionId?.substring(0, 20) || 'N/A'}...`);
            console.log(`   Inputs: ${txs[0].inputs?.length || 0}`);
            console.log(`   Outputs: ${txs[0].outputs?.length || 0}`);
        }
        // Транзакций может не быть, это нормально
    });

    await test('Test 10: Get Mempool Entries', async () => {
        const entries = await node.getMempoolEntries(true);
        console.log(`   Mempool transactions: ${entries.length}`);
        if (entries.length > 0) {
            console.log(`   First TX: ${entries[0].transaction?.transactionId?.substring(0, 20) || 'N/A'}...`);
            console.log(`   Fee: ${entries[0].fee || 'N/A'} sompi`);
        }
        // Mempool может быть пустым
    });

    await test('Test 11: Get Coin Supply', async () => {
        const supply = await node.getCoinSupply();
        console.log(`   Circulating: ${node.formatAmount(supply.circulatingSupply)} HOO`);
        console.log(`   Max Supply: ${node.formatAmount(supply.maxSupply)} HOO`);
        const percentage = (parseFloat(supply.circulatingSupply) / parseFloat(supply.maxSupply) * 100).toFixed(2);
        console.log(`   Issued: ${percentage}%`);
        if (!supply.circulatingSupply) throw new Error('No supply data');
    });

    await test('Test 12: Estimate Network Hashrate', async () => {
        const hashrate = await node.estimateNetworkHashesPerSecond();
        const hashrateNum = parseFloat(hashrate);
        const hashrateGH = (hashrateNum / 1e9).toFixed(2);
        const hashrateTH = (hashrateNum / 1e12).toFixed(2);
        console.log(`   Hashrate: ${hashrate} H/s`);
        console.log(`   Hashrate: ${hashrateGH} GH/s`);
        console.log(`   Hashrate: ${hashrateTH} TH/s`);
        if (!hashrate) throw new Error('No hashrate');
    });

    await test('Test 13: Get Connected Peers', async () => {
        const peers = await node.getConnectedPeerInfo();
        console.log(`   Connected Peers: ${peers.length}`);
        if (peers.length > 0) {
            console.log(`   First Peer:`);
            console.log(`      Address: ${peers[0].address || 'N/A'}`);
            console.log(`      User Agent: ${peers[0].userAgent || 'N/A'}`);
            console.log(`      Outbound: ${peers[0].isOutbound || false}`);
        }
        if (peers.length === 0) throw new Error('No peers connected');
    });

    await test('Test 14: Get Blue Score', async () => {
        const blueScore = await node.getVirtualSelectedParentBlueScore();
        console.log(`   Current Blue Score: ${blueScore}`);
        if (!blueScore) throw new Error('No blue score');
    });

    // ==================== UTILITY TESTS ====================

    await test('Test 15: Validate Addresses', async () => {
        const validAddr = 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu';
        const invalidAddr1 = 'invalid-address';
        const invalidAddr2 = 'hoosat:abc';

        const valid = node.isValidAddress(validAddr);
        const invalid1 = node.isValidAddress(invalidAddr1);
        const invalid2 = node.isValidAddress(invalidAddr2);

        console.log(`   Valid address check: ${valid ? '✅' : '❌'}`);
        console.log(`   Invalid address 1: ${invalid1 ? '❌' : '✅'}`);
        console.log(`   Invalid address 2: ${invalid2 ? '❌' : '✅'}`);

        if (!valid || invalid1 || invalid2) throw new Error('Address validation failed');
    });

    await test('Test 16: Format/Parse Amounts', async () => {
        const sompi = '100000000';
        const hoo = node.formatAmount(sompi);
        const backToSompi = node.parseAmount(hoo);

        console.log(`   ${sompi} sompi = ${hoo} HOO`);
        console.log(`   ${hoo} HOO = ${backToSompi} sompi`);
        console.log(`   Round-trip: ${sompi === backToSompi ? '✅' : '❌'}`);

        if (sompi !== backToSompi) throw new Error('Amount conversion failed');
    });

    // ==================== SUMMARY ====================

    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Test Summary:');
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   Total: ${passedTests + failedTests}`);

    if (failedTests === 0) {
        console.log('\n🎉 All tests passed! SDK is working perfectly!\n');
    } else {
        console.log(`\n⚠️  ${failedTests} test(s) failed. Check the errors above.\n`);
        process.exit(1);
    }
}

testAll().catch(error => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
});