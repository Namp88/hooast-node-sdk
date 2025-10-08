/**
 * Example: Working with Blocks
 *
 * Demonstrates:
 * - Getting a single block by hash
 * - Getting multiple blocks
 * - Analyzing block structure
 * - Understanding block parents and transactions
 *
 * Prerequisites:
 * - Running Hoosat node
 */
import { HoosatClient, HoosatUtils } from '../../src';

async function main() {
  console.log('🧱 Working with Blocks\n');

  const client = new HoosatClient({
    host: process.env.HOOSAT_NODE_HOST || '54.38.176.95',
    port: parseInt(process.env.HOOSAT_NODE_PORT || '42420'),
  });

  try {
    // First, get the selected tip hash
    console.log('1️⃣ Getting Selected Tip Block...');
    console.log('─────────────────────────────────────');

    const tipResult = await client.getSelectedTipHash();

    if (!tipResult.ok) {
      console.error('Failed to get tip hash:', tipResult.error);
      return;
    }

    const tipHash = tipResult.result!.selectedTipHash;
    console.log(`Selected Tip: ${HoosatUtils.truncateHash(tipHash)}`);
    console.log(`Full Hash:    ${tipHash}\n`);

    // Get the block details
    console.log('2️⃣ Getting Block Details...');
    console.log('─────────────────────────────────────');

    const blockResult = await client.getBlock(tipHash, false);

    if (!blockResult.ok) {
      console.error('Failed to get block:', blockResult.error);
      return;
    }

    const block = blockResult.result!;

    console.log('📦 Block Information:');
    console.log(`Hash:            ${HoosatUtils.truncateHash(block.verboseData.hash)}`);
    console.log(`Version:         ${block.header.version}`);
    console.log(`Timestamp:       ${new Date(parseInt(block.header.timestamp)).toISOString()}`);
    console.log(`Bits:            ${block.header.bits}`);
    console.log(`Nonce:           ${block.header.nonce}`);
    console.log(`DAA Score:       ${block.header.daaScore}`);
    console.log(`Blue Score:      ${block.header.blueScore}`);
    console.log(`Blue Work:       ${block.header.blueWork}`);
    console.log(`Parents:         ${block.header.parents.length} parent(s)`);
    console.log(`Transactions:    ${block.transactions.length}`);
    console.log();

    // Display parent blocks
    if (block.header.parents.length > 0) {
      console.log('👪 Parent Blocks:');
      block.header.parents.forEach((parentLevel, idx) => {
        console.log(`  Level ${idx}: ${parentLevel.parentHashes.length} parent(s)`);
        parentLevel.parentHashes.slice(0, 3).forEach(hash => {
          console.log(`    - ${HoosatUtils.truncateHash(hash)}`);
        });
        if (parentLevel.parentHashes.length > 3) {
          console.log(`    ... and ${parentLevel.parentHashes.length - 3} more`);
        }
      });
      console.log();
    }

    // Analyze transactions
    console.log('💸 Transactions Summary:');
    console.log('─────────────────────────────────────');

    let totalInputs = 0;
    let totalOutputs = 0;
    let coinbaseCount = 0;

    block.transactions.forEach(tx => {
      totalInputs += tx.inputs.length;
      totalOutputs += tx.outputs.length;

      // Check if coinbase (no inputs or special input)
      if (tx.inputs.length === 0 || tx.inputs[0].previousOutpoint.transactionId === '0'.repeat(64)) {
        coinbaseCount++;
      }
    });

    console.log(`Total Transactions: ${block.transactions.length}`);
    console.log(`Coinbase:           ${coinbaseCount}`);
    console.log(`Regular:            ${block.transactions.length - coinbaseCount}`);
    console.log(`Total Inputs:       ${totalInputs}`);
    console.log(`Total Outputs:      ${totalOutputs}`);
    console.log();

    // Get multiple blocks (starting from a parent hash)
    console.log('3️⃣ Getting Multiple Blocks...');
    console.log('─────────────────────────────────────');

    // Use first parent hash as lowHash
    const firstParentHash = block.header.parents[0]?.parentHashes[0];

    if (firstParentHash) {
      console.log(`Getting blocks starting from: ${HoosatUtils.truncateHash(firstParentHash)}\n`);

      const blocksResult = await client.getBlocks(firstParentHash, false);

      if (blocksResult.ok) {
        console.log(`Retrieved ${blocksResult.result!.blocks.length} block(s):\n`);

        blocksResult.result!.blocks.slice(0, 5).forEach((b, idx) => {
          console.log(`Block ${idx + 1}:`);
          console.log(`  Hash:         ${HoosatUtils.truncateHash(b.verboseData.hash)}`);
          console.log(`  DAA Score:    ${b.header.daaScore}`);
          console.log(`  Blue Score:   ${b.header.blueScore}`);
          console.log(`  Timestamp:    ${new Date(parseInt(b.header.timestamp)).toISOString()}`);
          console.log(`  Transactions: ${b.transactions.length}`);
          console.log();
        });

        if (blocksResult.result!.blocks.length > 5) {
          console.log(`... and ${blocksResult.result!.blocks.length - 5} more blocks`);
          console.log();
        }
      }
    } else {
      console.log('No parent hashes available\n');
    }

    // Block hashes for reference
    console.log('📋 Hash Information:');
    console.log('─────────────────────────────────────');
    console.log(`Hash Merkle Root:      ${HoosatUtils.truncateHash(block.header.hashMerkleRoot)}`);
    console.log(`Accepted ID Merkle:    ${HoosatUtils.truncateHash(block.header.acceptedIdMerkleRoot)}`);
    console.log(`UTXO Commitment:       ${HoosatUtils.truncateHash(block.header.utxoCommitment)}`);
    console.log(`Pruning Point:         ${HoosatUtils.truncateHash(block.header.pruningPoint)}`);
    console.log();
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
