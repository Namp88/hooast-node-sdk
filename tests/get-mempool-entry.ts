import { HoosatNode } from '../src';

async function testSpecific() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  const response = await node.getMempoolEntry('5917281d47779c2b76a5c875ce6e702ed5513b305ba4b03c41a088dab652afe2');
  console.log(response);
}

testSpecific().catch(console.error);
