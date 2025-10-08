/**
 * Example: Working with Mempool
 *
 * Demonstrates:
 * - Getting mempool entry by transaction ID
 * - Getting all mempool entries
 * - Getting mempool entries by addresses
 * - Analyzing pending transactions
 *
 * Prerequisites:
 * - Running Hoosat node
 * - Transaction ID for single entry lookup (optional)
 */
import { HoosatClient, HoosatUtils } from 'hoosat-sdk';

async function main() {
  console.log('🌊 Working with Mempool\n');

  const client = new HoosatClient({
    host: process.env.HOOSAT_NODE_HOST || '54.38.176.95',
    port: parseInt(process.env.HOOSAT_NODE_PORT || '42420'),
  });

  try {
    // Get all mempool entries
    console.log('1️⃣ Getting All Mempool Entries...');
    console.log('─────────────────────────────────────');

    const mempoolResult = await client.getMempoolEntries(true);

    if (!mempoolResult.ok) {
      console.error('Failed to get mempool:', mempoolResult.error);
      return;
    }

    const entries = mempoolResult.result!.entries;

    console.log(`Total Pending Transactions: ${entries.length}\n`);

    if (entries.length === 0) {
      console.log('Mempool is empty - no pending transactions');
      return;
    }

    // Analyze mempool statistics
    let totalFee = 0n;
    let totalMass = 0n;
    let orphanCount = 0;
    let regularCount = 0;

    entries.forEach(entry => {
      totalFee += BigInt(entry.fee || 0);
      totalMass += BigInt(entry.mass || 0);

      if (entry.isOrphan) {
        orphanCount++;
      } else {
        regularCount++;
      }
    });

    console.log('📊 Mempool Statistics:');
    console.log('─────────────────────────────────────');
    console.log(`Total Transactions:  ${entries.length}`);
    console.log(`Regular:             ${regularCount}`);
    console.log(`Orphans:             ${orphanCount}`);
    console.log(`Total Fees:          ${HoosatUtils.sompiToAmount(totalFee.toString())} HTN`);
    console.log(`Total Mass:          ${totalMass.toString()}`);
    console.log(`Average Fee:         ${HoosatUtils.sompiToAmount((totalFee / BigInt(entries.length)).toString())} HTN`);
    console.log(`Average Mass:        ${(totalMass / BigInt(entries.length)).toString()}`);
    console.log();

    // Show first few transactions
    console.log('📋 Sample Transactions (first 5):');
    console.log('─────────────────────────────────────');

    entries.slice(0, 5).forEach((entry, idx) => {
      console.log(`\nTransaction ${idx + 1}:`);
      console.log(`  TX ID:       ${HoosatUtils.truncateHash(entry.transaction!.transactionId)}`);
      console.log(`  Fee:         ${HoosatUtils.sompiToAmount(entry.fee || '')} HTN`);
      console.log(`  Mass:        ${entry.mass}`);
      console.log(`  Is Orphan:   ${entry.isOrphan ? '⚠️  Yes' : 'No'}`);
      console.log(`  Inputs:      ${entry.transaction!.inputs.length}`);
      console.log(`  Outputs:     ${entry.transaction!.outputs.length}`);
      console.log(`  Lock Time:   ${entry.transaction!.lockTime}`);
    });

    console.log('\n');

    // Get specific transaction if available
    if (entries.length > 0) {
      const firstTxId = entries[0].transaction!.transactionId;

      console.log('2️⃣ Getting Specific Mempool Entry...');
      console.log('─────────────────────────────────────');
      console.log(`TX ID: ${HoosatUtils.truncateHash(firstTxId)}\n`);

      const entryResult = await client.getMempoolEntry(firstTxId, true);

      if (entryResult.ok && entryResult.result) {
        const entry = entryResult.result;

        console.log('Transaction Details:');
        console.log(`  Version:     ${entry.transaction!.version}`);
        console.log(`  Lock Time:   ${entry.transaction!.lockTime}`);
        console.log(`  Subnetwork:  ${entry.transaction!.subnetworkId}`);
        console.log(`  Fee:         ${HoosatUtils.sompiToAmount(entry.fee || '')} HTN`);
        console.log(`  Mass:        ${entry.mass}`);
        console.log(`  Is Orphan:   ${entry.isOrphan}`);
        console.log();

        // Show inputs
        if (entry.transaction && entry.transaction.inputs.length > 0) {
          console.log('Inputs:');
          entry.transaction.inputs.slice(0, 3).forEach((input, idx) => {
            console.log(`  ${idx + 1}. ${HoosatUtils.truncateHash(input.previousOutpoint.transactionId)}:${input.previousOutpoint.index}`);
          });
          if (entry.transaction.inputs.length > 3) {
            console.log(`  ... and ${entry.transaction.inputs.length - 3} more`);
          }
          console.log();
        }

        // Show outputs
        if (entry.transaction && entry.transaction.outputs.length > 0) {
          console.log('Outputs:');
          entry.transaction.outputs.slice(0, 3).forEach((output, idx) => {
            const amount = HoosatUtils.sompiToAmount(output.amount);
            console.log(`  ${idx + 1}. ${amount} HTN`);
            if (output.verboseData?.scriptPublicKeyAddress) {
              console.log(`     → ${HoosatUtils.truncateAddress(output.verboseData.scriptPublicKeyAddress)}`);
            }
          });
          if (entry.transaction.outputs.length > 3) {
            console.log(`  ... and ${entry.transaction.outputs.length - 3} more`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
