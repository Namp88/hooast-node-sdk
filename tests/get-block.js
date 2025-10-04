const { HoosatNode } = require('../dist');

async function testSpecific() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  // Test: Get block by hash
  const info = await node.getBlock('41df979ad08ab489408a06d54f71bbc3d55652a16941f77746b99680636ddb67');
  console.log('Node information:', info);
}

testSpecific().catch(console.error);
