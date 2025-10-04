const { HoosatNode } = require('../dist');

async function testSpecific() {
    const node = new HoosatNode({
        host: '54.38.176.95',
        port: 42420
    });

    // Test: Get BlockDAG information
    const info = await node.getBlockDagInfo();
    console.log('BlockDAG information:', info);
}

testSpecific().catch(console.error);