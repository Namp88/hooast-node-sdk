const { HoosatNode } = require('../dist');

async function testSpecific() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  // Test: Get current virtual selected parent blue score
  const info = await node.getVirtualSelectedParentBlueScore();
  console.log(info);
}

testSpecific().catch(console.error);
