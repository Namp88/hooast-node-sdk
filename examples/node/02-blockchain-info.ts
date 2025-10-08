/**
 * Example: Blockchain Information
 *
 * Demonstrates:
 * - Getting DAG info (virtual parent hashes, tips, difficulty)
 * - Getting block count
 * - Getting selected tip hash
 * - Getting virtual blue score
 *
 * Prerequisites:
 * - Running Hoosat node
 */
import { HoosatClient, HoosatUtils } from 'hoosat-sdk';

async function main() {
  console.log('⛓️  Hoosat Blockchain Information\n');

  const client = new HoosatClient({
    host: process.env.HOOSAT_NODE_HOST || '54.38.176.95',
    port: parseInt(process.env.HOOSAT_NODE_PORT || '42420'),
  });

  try {
    // Get Block DAG Info
    console.log('📊 Block DAG Information:');
    console.log('─────────────────────────────────────');

    const dagInfo = await client.getBlockDagInfo();

    if (!dagInfo.ok) {
      console.error('Failed to fetch DAG info:', dagInfo.error);
      return;
    }

    console.log(`Network:              ${dagInfo.result!.networkName}`);
    console.log(`Block Count:          ${dagInfo.result!.blockCount}`);
    console.log(`Header Count:         ${dagInfo.result!.headerCount}`);
    console.log(`Tip Hashes:           ${dagInfo.result!.tipHashes.length}`);
    console.log(`Difficulty:           ${HoosatUtils.formatDifficulty(dagInfo.result!.difficulty)}`);
    console.log(`Past Median Time:     ${new Date(parseInt(dagInfo.result!.pastMedianTime)).toISOString()}`);
    console.log(`Virtual Parent Hash:  ${HoosatUtils.truncateHash(dagInfo.result!.virtualParentHashes[0])}`);
    console.log(`Pruning Point Hash:   ${HoosatUtils.truncateHash(dagInfo.result!.pruningPointHash)}`);
    console.log(`Virtual DAA Score:    ${dagInfo.result!.virtualDaaScore}`);

    console.log('\n');

    // Get Block Count
    console.log('🔢 Block Statistics:');
    console.log('─────────────────────────────────────');

    const blockCount = await client.getBlockCount();

    if (!blockCount.ok) {
      console.error('Failed to fetch block count:', blockCount.error);
      return;
    }

    console.log(`Total Blocks:         ${blockCount.result!.blockCount}`);
    console.log(`Total Headers:        ${blockCount.result!.headerCount}`);

    console.log('\n');

    // Get Selected Tip Hash
    console.log('🎯 Selected Tip:');
    console.log('─────────────────────────────────────');

    const tipHash = await client.getSelectedTipHash();

    if (!tipHash.ok) {
      console.error('Failed to fetch tip hash:', tipHash.error);
      return;
    }

    console.log(`Selected Tip Hash:    ${tipHash.result!.selectedTipHash}`);
    console.log(`Truncated:            ${HoosatUtils.truncateHash(tipHash.result!.selectedTipHash)}`);

    console.log('\n');

    // Get Virtual Blue Score
    console.log('💙 Virtual Blue Score:');
    console.log('─────────────────────────────────────');

    const blueScore = await client.getVirtualSelectedParentBlueScore();

    if (!blueScore.ok) {
      console.error('Failed to fetch blue score:', blueScore.error);
      return;
    }

    console.log(`Blue Score:           ${blueScore.result!.blueScore}`);

    console.log('\n');

    // Display tip hashes
    if (dagInfo.result!.tipHashes.length > 0) {
      console.log('📍 Current Tip Hashes:');
      console.log('─────────────────────────────────────');
      dagInfo.result!.tipHashes.slice(0, 5).forEach((hash, idx) => {
        console.log(`${idx + 1}. ${HoosatUtils.truncateHash(hash)}`);
      });

      if (dagInfo.result!.tipHashes.length > 5) {
        console.log(`... and ${dagInfo.result!.tipHashes.length - 5} more`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
