const { HoosatNode } = require('../dist');

async function testSpecific() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  // Test: Get UTXOs grouped by address
  const info = await node.getUtxosByAddresses([
    'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu',
    'hoosat:qr97kz9ujwylwxd8jkh9zs0nexlkkuu0v3aj0a6htvapan0a0arjugmlqf5ur',
  ]);

  console.log(info);
}

testSpecific().catch(console.error);
