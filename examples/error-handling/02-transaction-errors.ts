/**
 * Example: Handling Transaction Errors
 *
 * Demonstrates:
 * - Insufficient balance errors
 * - Spam rejection (too many outputs)
 * - Invalid signatures
 * - UTXO already spent (double-spend)
 * - Fee too low errors
 * - Proper error recovery
 *
 * Prerequisites:
 * - None (demonstrates error scenarios)
 *
 * Use case:
 * - Building robust transaction handling
 * - Graceful error recovery
 * - User-friendly error messages
 *
 * 💡 Best Practices:
 * - Validate inputs before building transaction
 * - Check balance before attempting transaction
 * - Provide specific error messages
 * - Implement proper error recovery
 */
import { HoosatCrypto, HoosatUtils, TransactionBuilder, UtxoForSigning } from '../../src';

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   ⚠️  TRANSACTION ERROR HANDLING');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== SETUP ====================
  console.log('⚙️  Setup');
  console.log('─────────────────────────────────────');

  const privateKeyHex = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';
  const wallet = HoosatCrypto.importKeyPair(privateKeyHex);

  console.log('Test wallet:');
  console.log(`  Address: ${HoosatUtils.truncateAddress(wallet.address)}\n`);

  // ==================== SCENARIO 1: INSUFFICIENT BALANCE ====================
  console.log('1️⃣  Scenario: Insufficient Balance');
  console.log('═════════════════════════════════════');
  console.log('Attempting to send more than available...\n');

  const mockUtxo1: UtxoForSigning = {
    outpoint: {
      transactionId: 'a'.repeat(64),
      index: 0,
    },
    utxoEntry: {
      amount: '100000000', // 1 HTN
      scriptPublicKey: {
        script: HoosatCrypto.addressToScriptPublicKey(wallet.address).toString('hex'),
        version: 0,
      },
      blockDaaScore: '1000000',
      isCoinbase: false,
    },
  };

  try {
    const builder1 = new TransactionBuilder();
    builder1.addInput(mockUtxo1, wallet.privateKey);
    builder1.addOutput('hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74', '200000000'); // 2 HTN
    builder1.setFee('1000');
    builder1.addChangeOutput(wallet.address); // This will fail

    console.log('❌ This should not succeed!');
  } catch (error: any) {
    console.log('✅ Error caught (expected):');
    console.log(`   ${error.message}\n`);

    console.log('💡 How to prevent:');
    console.log('   1. Check balance before building transaction');
    console.log('   2. Select enough UTXOs to cover amount + fee');
    console.log('   3. Show user available balance clearly');
    console.log('   4. Validate amounts in UI before submission');
    console.log();

    console.log('   Code example:');
    console.log('   ```typescript');
    console.log('   const totalNeeded = sendAmount + estimatedFee;');
    console.log('   if (walletBalance < totalNeeded) {');
    console.log('     throw new Error("Insufficient balance");');
    console.log('   }');
    console.log('   ```\n');
  }

  // ==================== SCENARIO 2: SPAM PROTECTION (TOO MANY OUTPUTS) ====================
  console.log('2️⃣  Scenario: Spam Protection Violation');
  console.log('═════════════════════════════════════');
  console.log('Attempting to create 3+ recipient outputs...\n');

  const mockUtxo2: UtxoForSigning = {
    outpoint: {
      transactionId: 'b'.repeat(64),
      index: 0,
    },
    utxoEntry: {
      amount: '1000000000', // 10 HTN
      scriptPublicKey: {
        script: HoosatCrypto.addressToScriptPublicKey(wallet.address).toString('hex'),
        version: 0,
      },
      blockDaaScore: '1000000',
      isCoinbase: false,
    },
  };

  try {
    const builder2 = new TransactionBuilder();
    builder2.addInput(mockUtxo2, wallet.privateKey);
    builder2.addOutput('hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74', '100000000');
    builder2.addOutput('hoosat:qzr0pvne29vrvp2pud5j5qxx0xyuv0mjvw9qdswsu5q7z5ulgmxswemhkklu2', '100000000');
    builder2.addOutput('hoosat:qpx123456789abcdefghijklmnopqrstuvwxyz1234567890abcdefghijk', '100000000'); // 3rd recipient

    console.log('❌ This should not succeed!');
  } catch (error: any) {
    console.log('✅ Error caught (expected):');
    console.log(`   ${error.message}\n`);

    console.log('💡 How to handle:');
    console.log('   1. Limit recipients to 2 per transaction');
    console.log('   2. Split large batches into multiple transactions');
    console.log('   3. Show clear limit in UI: "Max 2 recipients per transaction"');
    console.log('   4. Use batching strategy for 3+ recipients');
    console.log();

    console.log('   Solution example:');
    console.log('   ```typescript');
    console.log('   const MAX_RECIPIENTS = 2;');
    console.log('   const batches = chunk(recipients, MAX_RECIPIENTS);');
    console.log('   for (const batch of batches) {');
    console.log('     await sendTransaction(batch);');
    console.log('   }');
    console.log('   ```\n');
  }

  // ==================== SCENARIO 3: INVALID ADDRESS ====================
  console.log('3️⃣  Scenario: Invalid Recipient Address');
  console.log('═════════════════════════════════════');
  console.log('Attempting to send to invalid address...\n');

  try {
    const builder3 = new TransactionBuilder();
    builder3.addInput(mockUtxo2, wallet.privateKey);
    builder3.addOutput('invalid_address_format', '100000000');

    console.log('❌ This should not succeed!');
  } catch (error: any) {
    console.log('✅ Error caught (expected):');
    console.log(`   ${error.message}\n`);

    console.log('💡 How to prevent:');
    console.log('   1. Validate address format before submission');
    console.log('   2. Use HoosatUtils.isValidAddress() for validation');
    console.log('   3. Show real-time validation in UI');
    console.log('   4. Double-check addresses from user input');
    console.log();

    console.log('   Validation example:');
    console.log('   ```typescript');
    console.log('   if (!HoosatUtils.isValidAddress(recipientAddress)) {');
    console.log('     throw new Error("Invalid Hoosat address format");');
    console.log('   }');
    console.log('   ```\n');
  }

  // ==================== SCENARIO 4: DUST OUTPUT ====================
  console.log('4️⃣  Scenario: Dust Output (Too Small Amount)');
  console.log('═════════════════════════════════════');
  console.log('Attempting to send extremely small amount...\n');

  const MIN_OUTPUT = 1000n; // Minimum meaningful output

  try {
    const builder4 = new TransactionBuilder();
    builder4.addInput(mockUtxo2, wallet.privateKey);
    builder4.addOutput('hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74', '100'); // 0.000001 HTN (dust)
    builder4.setFee('1000');

    const tx = builder4.sign();
    console.log('⚠️  Transaction built, but may be rejected by network');
    console.log('   Output is considered "dust" and wastes blockchain space\n');

    console.log('💡 Best Practice:');
    console.log('   1. Enforce minimum output amount in UI');
    console.log(`   2. Recommend at least ${HoosatUtils.sompiToAmount(MIN_OUTPUT)} HTN`);
    console.log('   3. Combine dust outputs during consolidation');
    console.log('   4. Warn users about uneconomical transactions');
    console.log();
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }

  // ==================== SCENARIO 5: UTXO ALREADY SPENT ====================
  console.log('5️⃣  Scenario: UTXO Already Spent (Double-Spend)');
  console.log('═════════════════════════════════════');
  console.log('Simulating attempt to spend same UTXO twice...\n');

  console.log('⚠️  This would happen if:');
  console.log('   1. You submit transaction');
  console.log('   2. Try to spend same UTXO again before confirmation');
  console.log('   3. Node rejects second transaction\n');

  console.log('Error from node would be:');
  console.log('   "Transaction references unknown UTXO" or');
  console.log('   "UTXO already spent"\n');

  console.log('💡 How to prevent:');
  console.log('   1. Track pending transactions locally');
  console.log('   2. Mark UTXOs as "pending" after submission');
  console.log('   3. Refresh UTXO list after confirmation');
  console.log("   4. Don't allow spending same UTXO twice");
  console.log();

  console.log('   Prevention example:');
  console.log('   ```typescript');
  console.log('   const pendingUtxos = new Set<string>();');
  console.log('   ');
  console.log('   function markAsPending(txId: string, index: number) {');
  console.log('     pendingUtxos.add(`${txId}:${index}`);');
  console.log('   }');
  console.log('   ');
  console.log('   function isUtxoPending(txId: string, index: number): boolean {');
  console.log('     return pendingUtxos.has(`${txId}:${index}`);');
  console.log('   }');
  console.log('   ```\n');

  // ==================== SCENARIO 6: FEE TOO LOW ====================
  console.log('6️⃣  Scenario: Fee Too Low');
  console.log('═════════════════════════════════════');
  console.log('Building transaction with minimal fee...\n');

  const MIN_FEE = 1000n;

  try {
    const builder6 = new TransactionBuilder();
    builder6.addInput(mockUtxo2, wallet.privateKey);
    builder6.addOutput('hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74', '100000000');
    builder6.setFee('100'); // Very low fee

    const tx = builder6.sign();

    console.log('⚠️  Transaction built with low fee');
    console.log('   May be rejected or take very long to confirm\n');

    console.log('💡 Recommendations:');
    console.log(`   1. Use minimum fee: ${HoosatUtils.sompiToAmount(MIN_FEE)} HTN`);
    console.log('   2. Use FeeEstimator for dynamic fees');
    console.log('   3. Check network conditions');
    console.log('   4. Allow users to choose fee priority');
    console.log();

    console.log('   Dynamic fee example:');
    console.log('   ```typescript');
    console.log('   const feeEstimator = new FeeEstimator(node);');
    console.log('   const estimate = await feeEstimator.estimateFee(');
    console.log('     FeePriority.Normal,');
    console.log('     numInputs,');
    console.log('     numOutputs');
    console.log('   );');
    console.log('   builder.setFee(estimate.totalFee);');
    console.log('   ```\n');
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }

  // ==================== PRODUCTION ERROR HANDLER ====================
  console.log('7️⃣  Production-Ready Error Handler');
  console.log('═════════════════════════════════════\n');

  console.log('Complete error handling function:');
  console.log('```typescript');
  console.log('async function sendTransactionWithErrorHandling(');
  console.log('  node: HoosatNode,');
  console.log('  signedTx: Transaction');
  console.log('): Promise<{ success: boolean; txId?: string; error?: string }> {');
  console.log('  try {');
  console.log('    const result = await node.submitTransaction(signedTx);');
  console.log('    ');
  console.log('    if (!result.ok) {');
  console.log('      // Categorize error');
  console.log('      const error = result.error;');
  console.log('      ');
  console.log('      if (error.includes("spam")) {');
  console.log('        return {');
  console.log('          success: false,');
  console.log('          error: "Too many outputs. Max 2 recipients per transaction."');
  console.log('        };');
  console.log('      }');
  console.log('      ');
  console.log('      if (error.includes("insufficient") || error.includes("balance")) {');
  console.log('        return {');
  console.log('          success: false,');
  console.log('          error: "Insufficient balance for transaction + fees."');
  console.log('        };');
  console.log('      }');
  console.log('      ');
  console.log('      if (error.includes("already spent") || error.includes("unknown")) {');
  console.log('        return {');
  console.log('          success: false,');
  console.log('          error: "UTXO already spent. Please refresh balance."');
  console.log('        };');
  console.log('      }');
  console.log('      ');
  console.log('      if (error.includes("fee")) {');
  console.log('        return {');
  console.log('          success: false,');
  console.log('          error: "Fee too low. Increase fee and try again."');
  console.log('        };');
  console.log('      }');
  console.log('      ');
  console.log('      // Generic error');
  console.log('      return {');
  console.log('        success: false,');
  console.log('        error: `Transaction failed: ${error}`');
  console.log('      };');
  console.log('    }');
  console.log('    ');
  console.log('    return {');
  console.log('      success: true,');
  console.log('      txId: result.result?.transactionId');
  console.log('    };');
  console.log('  } catch (error) {');
  console.log('    return {');
  console.log('      success: false,');
  console.log('      error: `Unexpected error: ${error}`');
  console.log('    };');
  console.log('  }');
  console.log('}');
  console.log('```\n');

  // ==================== ERROR TYPES REFERENCE ====================
  console.log('8️⃣  Transaction Error Types Reference');
  console.log('═════════════════════════════════════\n');

  const errorTypes = [
    {
      error: 'Insufficient balance',
      cause: 'Send amount + fee > available balance',
      solution: 'Check balance, select more UTXOs',
    },
    {
      error: 'Spam protection',
      cause: '3+ recipient outputs in transaction',
      solution: 'Limit to 2 recipients, use batching',
    },
    {
      error: 'Invalid address',
      cause: 'Malformed recipient address',
      solution: 'Validate with HoosatUtils.isValidAddress()',
    },
    {
      error: 'UTXO already spent',
      cause: 'Double-spend attempt or outdated UTXO',
      solution: 'Refresh UTXOs, track pending',
    },
    {
      error: 'Fee too low',
      cause: 'Below minimum or network requirement',
      solution: 'Use FeeEstimator, increase fee',
    },
    {
      error: 'Invalid signature',
      cause: 'Wrong private key used for signing',
      solution: 'Verify correct key for address',
    },
  ];

  console.log('Error                 | Cause                                | Solution');
  console.log('----------------------|--------------------------------------|----------------------------------');
  errorTypes.forEach(({ error, cause, solution }) => {
    console.log(`${error.padEnd(21)} | ${cause.padEnd(36)} | ${solution}`);
  });
  console.log();

  // ==================== VALIDATION CHECKLIST ====================
  console.log('9️⃣  Pre-Transaction Validation Checklist');
  console.log('═════════════════════════════════════\n');

  console.log('✅ Before building transaction:');
  console.log('   ☐ Validate all recipient addresses');
  console.log('   ☐ Check sufficient balance (amount + estimated fee)');
  console.log('   ☐ Verify max 2 recipients');
  console.log('   ☐ Ensure outputs meet minimum amount');
  console.log('   ☐ Select enough UTXOs to cover total');
  console.log();

  console.log('✅ Before submitting transaction:');
  console.log('   ☐ Verify transaction is signed');
  console.log('   ☐ Check fee is appropriate');
  console.log('   ☐ Confirm UTXOs not already pending');
  console.log('   ☐ Node is connected and synced');
  console.log('   ☐ Have error handling in place');
  console.log();

  console.log('✅ After submission:');
  console.log('   ☐ Check result.ok status');
  console.log('   ☐ Mark UTXOs as pending');
  console.log('   ☐ Save transaction ID');
  console.log('   ☐ Show confirmation to user');
  console.log('   ☐ Wait for confirmation');
  console.log();

  // ==================== SUMMARY ====================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   ✅ TRANSACTION ERROR HANDLING COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Key Takeaways:');
  console.log('  ✅ Validate inputs before building transaction');
  console.log('  ✅ Handle all error types with specific messages');
  console.log('  ✅ Respect spam protection (max 2 recipients)');
  console.log('  ✅ Use FeeEstimator for dynamic fees');
  console.log('  ✅ Track pending UTXOs to prevent double-spend');
  console.log();
  console.log('💡 Next Steps:');
  console.log('   See 03-retry-strategies.ts for automatic retry patterns');
  console.log('   See ../transaction/08-consolidate-utxos.ts for UTXO management');
  console.log();
}

// Run example
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
