import { HoosatNode } from '../src';

async function monitorBlocks() {
    const node = new HoosatNode({
        host: '54.38.176.95',
        port: 42420,
    });

    console.log('🔍 Monitoring new blocks...\n');

    let lastBlueScore = '0';

    setInterval(async () => {
        try {
            const currentBlueScore = await node.getVirtualSelectedParentBlueScore();

            if (currentBlueScore !== lastBlueScore && lastBlueScore !== '0') {
                const blockdag = await node.getBlockDagInfo();
                console.log('🆕 New block detected!');
                console.log('   Blue Score:', currentBlueScore);
                console.log('   Difficulty:', blockdag.difficulty);
                console.log('   Block Count:', blockdag.blockCount);
                console.log('');
            }

            lastBlueScore = currentBlueScore;
        } catch (error) {
            console.error('Error:', error);
        }
    }, 2000); // Check every 2 seconds
}

monitorBlocks();