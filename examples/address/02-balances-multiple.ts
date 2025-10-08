/**
 * Example: Check Multiple Address Balances
 *
 * Demonstrates:
 * - Checking balances for multiple addresses at once
 * - Batch processing addresses
 * - Comparing balances
 * - Address validation for arrays
 *
 * Prerequisites:
 * - Running Hoosat node
 */
import { HoosatClient, HoosatUtils } from '../../src';

async function main() {
  console.log('💰 Check Multiple Address Balances\n');

  const client = new HoosatClient({
    host: process.env.HOOSAT_NODE_HOST || '54.38.176.95',
    port: parseInt(process.env.HOOSAT_NODE_PORT || '42420'),
  });

  // Addresses to check (use from environment or examples)
  const addresses = [
    process.env.HOOSAT_ADDRESS_1 || 'hoosat:qz8hek32xdryqstk6ptvvfzmrsrns95h7nd2r9f55epnxx7eummegyxa7f2lu',
    process.env.HOOSAT_ADDRESS_2 || 'hoosat:qzr0pvne29vrvp2pud5j5qxx0xyuv0mjvw9qdswsu5q7z5ulgmxswemhkklu2',
  ];

  console.log(`Checking ${addresses.length} addresses...\n`);

  // Validate all addresses
  const validAddresses = HoosatUtils.isValidAddresses(addresses);
  if (!validAddresses) {
    console.error('Invalid address(es) detected');
    return;
  }

  try {
    // Fetch balances
    const result = await client.getBalances(addresses);

    if (!result.ok) {
      console.error('Failed to fetch balances:', result.error);
      return;
    }

    // Display results
    console.log('📊 Balance Results:');
    console.log('═════════════════════════════════════\n');

    let totalBalance = 0n;
    const balanceData: Array<{ address: string; balance: string; type: string }> = [];

    result.result!.balances.forEach((entry, idx) => {
      const balance = BigInt(entry.balance);
      const addressType = HoosatUtils.getAddressType(entry.address);

      balanceData.push({
        address: entry.address,
        balance: entry.balance,
        type: addressType || 'unknown',
      });

      totalBalance += balance;

      console.log(`Address ${idx + 1}:`);
      console.log(`  Address:  ${HoosatUtils.truncateAddress(entry.address)}`);
      console.log(`  Type:     ${addressType?.toUpperCase()}`);
      console.log(`  Balance:  ${HoosatUtils.sompiToAmount(entry.balance)} HTN`);
      console.log(`  Formatted: ${HoosatUtils.formatAmount(HoosatUtils.sompiToAmount(entry.balance))} HTN`);
      console.log(`  Status:   ${balance === 0n ? '⚠️  Empty' : '✅ Has funds'}`);
      console.log();
    });

    // Summary
    console.log('═════════════════════════════════════');
    console.log('📈 Summary:');
    console.log('─────────────────────────────────────');
    console.log(`Total Addresses:  ${addresses.length}`);
    console.log(`Total Balance:    ${HoosatUtils.sompiToAmount(totalBalance.toString())} HTN`);
    console.log(`Formatted:        ${HoosatUtils.formatAmount(HoosatUtils.sompiToAmount(totalBalance.toString()))} HTN`);
    console.log('─────────────────────────────────────\n');

    // Address types breakdown
    const typeBreakdown = balanceData.reduce(
      (acc, item) => {
        acc[item.type] = (acc[item.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    console.log('🏷️  Address Types:');
    Object.entries(typeBreakdown).forEach(([type, count]) => {
      console.log(`  ${type.toUpperCase()}: ${count}`);
    });

    // Addresses with balance
    const fundedAddresses = balanceData.filter(item => BigInt(item.balance) > 0n);
    console.log(`\n💵 Funded Addresses: ${fundedAddresses.length}/${addresses.length}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
