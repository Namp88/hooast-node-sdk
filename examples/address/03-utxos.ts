/**
 * Example: Get UTXOs by Address
 *
 * Demonstrates:
 * - Fetching all UTXOs for addresses
 * - Analyzing UTXO details
 * - Calculating total balance from UTXOs
 * - Understanding coinbase UTXOs
 *
 * Prerequisites:
 * - Running Hoosat node
 */
import { HoosatClient, HoosatUtils } from '../../src';

async function main() {
  console.log('🔍 Get UTXOs by Address\n');

  const client = new HoosatClient({
    host: process.env.HOOSAT_NODE_HOST || '54.38.176.95',
    port: parseInt(process.env.HOOSAT_NODE_PORT || '42420'),
  });

  const addresses = [process.env.HOOSAT_ADDRESS || 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu'];

  console.log(`Fetching UTXOs for ${addresses.length} address(es)...\n`);

  try {
    const result = await client.getUtxosByAddresses(addresses);

    if (!result.ok) {
      console.error('Failed to fetch UTXOs:', result.error);
      return;
    }

    const utxos = result.result!.utxos;

    console.log(`✅ Found ${utxos.length} UTXO(s)\n`);

    if (utxos.length === 0) {
      console.log('No UTXOs found for this address');
      return;
    }

    // Display each UTXO
    console.log('📦 UTXO Details:');
    console.log('═════════════════════════════════════\n');

    let totalBalance = 0n;
    let coinbaseCount = 0;
    let regularCount = 0;

    utxos.forEach((utxo, idx) => {
      const amount = BigInt(utxo.utxoEntry.amount);
      totalBalance += amount;

      if (utxo.utxoEntry.isCoinbase) {
        coinbaseCount++;
      } else {
        regularCount++;
      }

      console.log(`UTXO #${idx + 1}:`);
      console.log(`  Transaction ID:  ${HoosatUtils.truncateHash(utxo.outpoint.transactionId)}`);
      console.log(`  Output Index:    ${utxo.outpoint.index}`);
      console.log(`  Amount:          ${HoosatUtils.sompiToAmount(utxo.utxoEntry.amount)} HTN`);
      console.log(`  Formatted:       ${HoosatUtils.formatAmount(HoosatUtils.sompiToAmount(utxo.utxoEntry.amount))} HTN`);
      console.log(`  Block DAA Score: ${utxo.utxoEntry.blockDaaScore}`);
      console.log(`  Is Coinbase:     ${utxo.utxoEntry.isCoinbase ? '⛏️  Yes (Mining reward)' : '💸 No (Regular transaction)'}`);
      console.log(`  Script Version:  ${utxo.utxoEntry.scriptPublicKey.version}`);
      console.log(`  Script:          ${HoosatUtils.truncateHash(utxo.utxoEntry.scriptPublicKey.scriptPublicKey)}`);
      console.log();
    });

    // Summary
    console.log('═════════════════════════════════════');
    console.log('📊 Summary:');
    console.log('─────────────────────────────────────');
    console.log(`Total UTXOs:         ${utxos.length}`);
    console.log(`  Coinbase:          ${coinbaseCount}`);
    console.log(`  Regular:           ${regularCount}`);
    console.log(`Total Balance:       ${HoosatUtils.sompiToAmount(totalBalance.toString())} HTN`);
    console.log(`Formatted:           ${HoosatUtils.formatAmount(HoosatUtils.sompiToAmount(totalBalance.toString()))} HTN`);
    console.log('─────────────────────────────────────\n');

    // UTXO size distribution
    if (utxos.length > 0) {
      const amounts = utxos.map(u => BigInt(u.utxoEntry.amount));
      const largest = amounts.reduce((a, b) => (a > b ? a : b));
      const smallest = amounts.reduce((a, b) => (a < b ? a : b));

      console.log('💎 UTXO Distribution:');
      console.log(`  Largest UTXO:    ${HoosatUtils.sompiToAmount(largest.toString())} HTN`);
      console.log(`  Smallest UTXO:   ${HoosatUtils.sompiToAmount(smallest.toString())} HTN`);
      console.log(`  Average UTXO:    ${HoosatUtils.sompiToAmount((totalBalance / BigInt(utxos.length)).toString())} HTN`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
