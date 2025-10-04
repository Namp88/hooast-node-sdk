import { HoosatNode } from '../src';

async function testSpecific() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  const response = await node.getBlocks('b2d01b6fe15195f5a2f91b9db247deb7485de3b3fae98a1137e37450c6716a61');
  console.log(response);
}

testSpecific().catch(console.error);
