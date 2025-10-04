import { HoosatNode } from '../src';

async function testSpecific() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  const response = await node.getPeerAddresses();
  console.log(response);
}

testSpecific().catch(console.error);
