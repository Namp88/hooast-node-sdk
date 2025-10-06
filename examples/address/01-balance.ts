/**
 * Example: Check Address Balance
 *
 * Demonstrates:
 * - Checking balance for a single address
 * - Converting sompi to HTN
 * - Validating addresses
 * - Error handling
 *
 * Prerequisites:
 * - Running Hoosat node
 * - Valid Hoosat address to check
 */
import { HoosatNode, HoosatUtils } from '../../src';

async function main() {
  console.log('💰 Check Address Balance\n');

  // Connect to node
  const node = new HoosatNode({
    host: process.env.HOOSAT_NODE_HOST || '54.38.176.95',
    port: parseInt(process.env.HOOSAT_NODE_PORT || '42420'),
  });

  // Address to check (use from environment or example)
  const address = process.env.HOOSAT_ADDRESS || 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu';

  console.log(`Checking address: ${HoosatUtils.truncateAddress(address)}\n`);

  // Validate address format
  if (!HoosatUtils.isValidAddress(address)) {
    console.error('❌ Invalid address format');
    return;
  }

  // Get address type
  const addressType = HoosatUtils.getAddressType(address);
  console.log(`Address Type: ${addressType?.toUpperCase()}\n`);

  try {
    // Fetch balance
    const result = await node.getBalance(address);

    if (!result.ok) {
      console.error('❌ Failed to fetch balance:', result.error);
      return;
    }

    // Display balance
    console.log('📊 Balance Information:');
    console.log('─────────────────────────────────────');
    console.log(`Balance (sompi): ${result.result!.balance}`);
    console.log(`Balance (HTN):   ${HoosatUtils.sompiToAmount(result.result!.balance)} HTN`);
    console.log(`Formatted:       ${HoosatUtils.formatAmount(HoosatUtils.sompiToAmount(result.result!.balance))} HTN`);
    console.log('─────────────────────────────────────\n');

    // Check if address has balance
    if (BigInt(result.result!.balance) === 0n) {
      console.log('⚠️  Address has zero balance');
    } else {
      console.log('✅ Address has funds');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main().catch(console.error);
