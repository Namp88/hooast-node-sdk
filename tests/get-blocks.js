const { HoosatNode } = require('../dist');

async function testSpecific() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  // Test: Get block by hash
  const info = await node.getBlocks([
    '41df979ad08ab489408a06d54f71bbc3d55652a16941f77746b99680636ddb67',
    '17c33a675e6b60b5a28dd97d0337e166e8bcbead318845c9b0fef36234544ced',
  ]);
  console.log(info);
}

testSpecific().catch(console.error);
