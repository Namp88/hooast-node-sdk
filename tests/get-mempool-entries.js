const { HoosatNode } = require('../dist');

async function testSpecific() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  const info = await node.getMempoolEntries();
  console.log(info);
}

testSpecific().catch(console.error);
