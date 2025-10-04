const { HoosatNode, HoosatUtils } = require('../dist');

async function testSpecific() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  // Test: Get balance for an address
  const info = await node.getBalance('hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu');
  console.log(`Balance for an ${info.address}: ${HoosatUtils.formatAmount(info.balance)} HTN`);
}

testSpecific().catch(console.error);
