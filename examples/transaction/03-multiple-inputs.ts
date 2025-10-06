/**
 * Example: Transaction with Multiple Inputs
 *
 * Demonstrates:
 * - Adding multiple UTXOs to one transaction
 * - UTXO consolidation (combining small UTXOs)
 * - UTXO selection strategies
 * - Signing multiple inputs
 * - Fee calculation for complex transactions
 *
 * Prerequisites:
 * - None (works offline with mock data)
 *
 * Note: This example uses mock UTXO data and does NOT broadcast to network.
 */
import { HoosatCrypto, HoosatUtils, TransactionBuilder, UtxoForSigning } from '../../src';

function main() {
  console.log('🔗 Transaction with Multiple Inputs\n');

  // ==================== SETUP ====================
  console.log('1️⃣  Setup');
  console.log('═════════════════════════════════════');

  const privateKeyHex = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';
  const wallet = HoosatCrypto.importKeyPair(privateKeyHex);

  console.log('Wallet:');
  console.log(`  Address: ${HoosatUtils.truncateAddress(wallet.address)}`);
  console.log();

  const recipientAddress = 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74';
  console.log('Recipient:');
  console.log(`  Address: ${HoosatUtils.truncateAddress(recipientAddress)}`);
  console.log();

  // ==================== MOCK UTXOs ====================
  console.log('2️⃣  Available UTXOs (Mock Data)');
  console.log('═════════════════════════════════════');

  // Create multiple mock UTXOs with different amounts
  const mockUtxos: UtxoForSigning[] = [
    {
      outpoint: {
        transactionId: 'aaaaaaaaaaaaaaaa1111111111111111111111111111111111111111111111aa',
        index: 0,
      },
      utxoEntry: {
        amount: '50000000', // 0.5 HTN
        scriptPublicKey: {
          script: HoosatCrypto.addressToScriptPublicKey(wallet.address).toString('hex'),
          version: 0,
        },
        blockDaaScore: '1000001',
        isCoinbase: false,
      },
    },
    {
      outpoint: {
        transactionId: 'bbbbbbbbbbbbbbbb2222222222222222222222222222222222222222222222bb',
        index: 1,
      },
      utxoEntry: {
        amount: '30000000', // 0.3 HTN
        scriptPublicKey: {
          script: HoosatCrypto.addressToScriptPublicKey(wallet.address).toString('hex'),
          version: 0,
        },
        blockDaaScore: '1000002',
        isCoinbase: false,
      },
    },
    {
      outpoint: {
        transactionId: 'cccccccccccccccc3333333333333333333333333333333333333333333333cc',
        index: 0,
      },
      utxoEntry: {
        amount: '25000000', // 0.25 HTN
        scriptPublicKey: {
          script: HoosatCrypto.addressToScriptPublicKey(wallet.address).toString('hex'),
          version: 0,
        },
        blockDaaScore: '1000003',
        isCoinbase: false,
      },
    },
    {
      outpoint: {
        transactionId: 'dddddddddddddddd4444444444444444444444444444444444444444444444dd',
        index: 2,
      },
      utxoEntry: {
        amount: '15000000', // 0.15 HTN
        scriptPublicKey: {
          script: HoosatCrypto.addressToScriptPublicKey(wallet.address).toString('hex'),
          version: 0,
        },
        blockDaaScore: '1000004',
        isCoinbase: false,
      },
    },
  ];

  // Display available UTXOs
  let totalAvailable = 0n;
  mockUtxos.forEach((utxo, idx) => {
    const amount = BigInt(utxo.utxoEntry.amount);
    totalAvailable += amount;
    console.log(`UTXO ${idx + 1}:`);
    console.log(`  TX ID:   ${HoosatUtils.truncateHash(utxo.outpoint.transactionId)}`);
    console.log(`  Index:   ${utxo.outpoint.index}`);
    console.log(`  Amount:  ${HoosatUtils.sompiToAmount(utxo.utxoEntry.amount)} HTN`);
  });

  console.log();
  console.log(`Total Available: ${HoosatUtils.sompiToAmount(totalAvailable)} HTN`);
  console.log(`Total UTXOs:     ${mockUtxos.length}`);
  console.log();

  // ==================== SCENARIO 1: USE ALL UTXOs ====================
  console.log('3️⃣  Scenario 1: Consolidation (Use All UTXOs)');
  console.log('═════════════════════════════════════');

  const builder1 = new TransactionBuilder();

  console.log('Strategy: Consolidate all UTXOs into one output');
  console.log();

  // Add all UTXOs as inputs
  mockUtxos.forEach((utxo, idx) => {
    builder1.addInput(utxo, wallet.privateKey);
    console.log(`✅ Added UTXO ${idx + 1} (${HoosatUtils.sompiToAmount(utxo.utxoEntry.amount)} HTN)`);
  });

  console.log();

  // Send to recipient (will calculate change automatically)
  const sendAmount1 = '80000000'; // 0.8 HTN
  const fee1 = '2000'; // Higher fee for multiple inputs

  console.log('Transaction Parameters:');
  console.log(`  Total Input:     ${HoosatUtils.sompiToAmount(totalAvailable)} HTN`);
  console.log(`  Send Amount:     ${HoosatUtils.sompiToAmount(sendAmount1)} HTN`);
  console.log(`  Fee:             ${HoosatUtils.sompiToAmount(fee1)} HTN`);

  const expectedChange1 = totalAvailable - BigInt(sendAmount1) - BigInt(fee1);
  console.log(`  Expected Change: ${HoosatUtils.sompiToAmount(expectedChange1)} HTN`);
  console.log();

  builder1.addOutput(recipientAddress, sendAmount1);
  builder1.setFee(fee1);
  builder1.addChangeOutput(wallet.address);

  const tx1 = builder1.sign();
  const txId1 = HoosatCrypto.getTransactionId(tx1);

  console.log('✅ Consolidation transaction built');
  console.log(`   TX ID:    ${HoosatUtils.truncateHash(txId1)}`);
  console.log(`   Inputs:   ${tx1.inputs.length}`);
  console.log(`   Outputs:  ${tx1.outputs.length}`);
  console.log(`   Size:     ~${JSON.stringify(tx1).length} bytes (JSON)`);
  console.log();

  // ==================== SCENARIO 2: SELECTIVE UTXOs ====================
  console.log('4️⃣  Scenario 2: Selective UTXO Usage (Largest First)');
  console.log('═════════════════════════════════════');

  const targetAmount = '60000000'; // 0.6 HTN
  const fee2 = '1500';

  console.log(`Target: Send ${HoosatUtils.sompiToAmount(targetAmount)} HTN + ${HoosatUtils.sompiToAmount(fee2)} HTN fee`);
  console.log();

  // Sort UTXOs by amount (largest first)
  const sortedUtxos = [...mockUtxos].sort((a, b) => {
    return Number(BigInt(b.utxoEntry.amount) - BigInt(a.utxoEntry.amount));
  });

  console.log('UTXOs sorted (largest first):');
  sortedUtxos.forEach((utxo, idx) => {
    console.log(
      `  ${idx + 1}. ${HoosatUtils.sompiToAmount(utxo.utxoEntry.amount)} HTN - ${HoosatUtils.truncateHash(utxo.outpoint.transactionId)}`
    );
  });
  console.log();

  // Select UTXOs until we have enough
  const builder2 = new TransactionBuilder();
  const neededAmount = BigInt(targetAmount) + BigInt(fee2);
  let selectedAmount = 0n;
  const selectedUtxos: UtxoForSigning[] = [];

  console.log('Selecting UTXOs:');
  for (const utxo of sortedUtxos) {
    if (selectedAmount >= neededAmount) break;

    selectedUtxos.push(utxo);
    selectedAmount += BigInt(utxo.utxoEntry.amount);
    builder2.addInput(utxo, wallet.privateKey);

    console.log(
      `  ✅ Selected ${HoosatUtils.sompiToAmount(utxo.utxoEntry.amount)} HTN (Total: ${HoosatUtils.sompiToAmount(selectedAmount)} HTN)`
    );
  }

  console.log();
  console.log(`Selected ${selectedUtxos.length} UTXOs out of ${mockUtxos.length}`);
  console.log(`Total Selected: ${HoosatUtils.sompiToAmount(selectedAmount)} HTN`);
  console.log(`Needed:         ${HoosatUtils.sompiToAmount(neededAmount)} HTN`);

  const expectedChange2 = selectedAmount - BigInt(targetAmount) - BigInt(fee2);
  console.log(`Expected Change: ${HoosatUtils.sompiToAmount(expectedChange2)} HTN`);
  console.log();

  builder2.addOutput(recipientAddress, targetAmount);
  builder2.setFee(fee2);
  builder2.addChangeOutput(wallet.address);

  const tx2 = builder2.sign();
  const txId2 = HoosatCrypto.getTransactionId(tx2);

  console.log('✅ Selective transaction built');
  console.log(`   TX ID:    ${HoosatUtils.truncateHash(txId2)}`);
  console.log(`   Inputs:   ${tx2.inputs.length} (optimized selection)`);
  console.log(`   Outputs:  ${tx2.outputs.length}`);
  console.log();

  // ==================== SCENARIO 3: SMALLEST FIRST ====================
  console.log('5️⃣  Scenario 3: UTXO Selection (Smallest First)');
  console.log('═════════════════════════════════════');

  const targetAmount3 = '40000000'; // 0.4 HTN
  const fee3 = '1500';

  console.log(`Target: Send ${HoosatUtils.sompiToAmount(targetAmount3)} HTN + ${HoosatUtils.sompiToAmount(fee3)} HTN fee`);
  console.log();

  // Sort UTXOs by amount (smallest first) - to clean up dust
  const sortedUtxosSmallest = [...mockUtxos].sort((a, b) => {
    return Number(BigInt(a.utxoEntry.amount) - BigInt(b.utxoEntry.amount));
  });

  console.log('UTXOs sorted (smallest first):');
  sortedUtxosSmallest.forEach((utxo, idx) => {
    console.log(
      `  ${idx + 1}. ${HoosatUtils.sompiToAmount(utxo.utxoEntry.amount)} HTN - ${HoosatUtils.truncateHash(utxo.outpoint.transactionId)}`
    );
  });
  console.log();

  const builder3 = new TransactionBuilder();
  const neededAmount3 = BigInt(targetAmount3) + BigInt(fee3);
  let selectedAmount3 = 0n;
  const selectedUtxos3: UtxoForSigning[] = [];

  console.log('Selecting UTXOs (smallest first):');
  for (const utxo of sortedUtxosSmallest) {
    if (selectedAmount3 >= neededAmount3) break;

    selectedUtxos3.push(utxo);
    selectedAmount3 += BigInt(utxo.utxoEntry.amount);
    builder3.addInput(utxo, wallet.privateKey);

    console.log(
      `  ✅ Selected ${HoosatUtils.sompiToAmount(utxo.utxoEntry.amount)} HTN (Total: ${HoosatUtils.sompiToAmount(selectedAmount3)} HTN)`
    );
  }

  console.log();
  console.log(`Selected ${selectedUtxos3.length} UTXOs out of ${mockUtxos.length}`);
  console.log(`Total Selected: ${HoosatUtils.sompiToAmount(selectedAmount3)} HTN`);
  console.log(`Needed:         ${HoosatUtils.sompiToAmount(neededAmount3)} HTN`);

  const expectedChange3 = selectedAmount3 - BigInt(targetAmount3) - BigInt(fee3);
  console.log(`Expected Change: ${HoosatUtils.sompiToAmount(expectedChange3)} HTN`);
  console.log();

  builder3.addOutput(recipientAddress, targetAmount3);
  builder3.setFee(fee3);
  builder3.addChangeOutput(wallet.address);

  const tx3 = builder3.sign();
  const txId3 = HoosatCrypto.getTransactionId(tx3);

  console.log('✅ Smallest-first transaction built');
  console.log(`   TX ID:    ${HoosatUtils.truncateHash(txId3)}`);
  console.log(`   Inputs:   ${tx3.inputs.length} (dust cleanup strategy)`);
  console.log(`   Outputs:  ${tx3.outputs.length}`);
  console.log();

  // ==================== FEE COMPARISON ====================
  console.log('6️⃣  Fee Comparison');
  console.log('═════════════════════════════════════');

  console.log('Transaction Sizes and Fees:');
  console.log();
  console.log(`Scenario 1 (All UTXOs):`);
  console.log(`  Inputs:  ${tx1.inputs.length}`);
  console.log(`  Outputs: ${tx1.outputs.length}`);
  console.log(`  Fee:     ${HoosatUtils.sompiToAmount(fee1)} HTN`);
  console.log(`  Size:    ~${JSON.stringify(tx1).length} bytes`);
  console.log();

  console.log(`Scenario 2 (Largest First):`);
  console.log(`  Inputs:  ${tx2.inputs.length}`);
  console.log(`  Outputs: ${tx2.outputs.length}`);
  console.log(`  Fee:     ${HoosatUtils.sompiToAmount(fee2)} HTN`);
  console.log(`  Size:    ~${JSON.stringify(tx2).length} bytes`);
  console.log();

  console.log(`Scenario 3 (Smallest First):`);
  console.log(`  Inputs:  ${tx3.inputs.length}`);
  console.log(`  Outputs: ${tx3.outputs.length}`);
  console.log(`  Fee:     ${HoosatUtils.sompiToAmount(fee3)} HTN`);
  console.log(`  Size:    ~${JSON.stringify(tx3).length} bytes`);
  console.log();

  // ==================== UTXO SELECTION STRATEGIES ====================
  console.log('7️⃣  UTXO Selection Strategies');
  console.log('═════════════════════════════════════');
  console.log('Strategy         | Use Case                      | Pros');
  console.log('-----------------|-------------------------------|---------------------------');
  console.log('All UTXOs        | Consolidation                 | Cleans up wallet');
  console.log('Largest First    | Minimize inputs               | Lower fees');
  console.log('Smallest First   | Clean up dust                 | Removes small UTXOs');
  console.log('Exact Match      | Privacy                       | No change needed');
  console.log('Random           | Privacy                       | Harder to track');
  console.log('═════════════════════════════════════\n');

  // ==================== SIGNING DETAILS ====================
  console.log('8️⃣  Signing Multiple Inputs');
  console.log('═════════════════════════════════════');
  console.log('Each input must be signed separately:');
  console.log();

  tx1.inputs.forEach((input, idx) => {
    const sigScriptLen = Buffer.from(input.signatureScript, 'hex').length;
    console.log(`Input ${idx + 1}:`);
    console.log(`  Previous TX: ${HoosatUtils.truncateHash(input.previousOutpoint.transactionId)}`);
    console.log(`  Signature:   ${input.signatureScript.slice(0, 20)}... (${sigScriptLen} bytes)`);
  });
  console.log();

  // ==================== BEST PRACTICES ====================
  console.log('💡 Best Practices');
  console.log('─────────────────────────────────────');
  console.log('1. ✅ Minimize inputs to reduce fees');
  console.log('2. ✅ Use largest-first for normal transactions');
  console.log('3. ✅ Use smallest-first to clean up dust');
  console.log('4. ✅ Periodically consolidate small UTXOs');
  console.log('5. ✅ Consider fee when selecting UTXOs');
  console.log('6. ⚠️  More inputs = higher fees');
  console.log('7. ⚠️  Each input increases transaction size by ~150 bytes');
  console.log('8. ⚠️  Sign inputs in correct order');
  console.log('─────────────────────────────────────\n');

  // ==================== SUMMARY ====================
  console.log('✅ Multiple Input Transactions Summary');
  console.log('═════════════════════════════════════');
  console.log(`Consolidation (${tx1.inputs.length} inputs):    ${HoosatUtils.truncateHash(txId1)}`);
  console.log(`Largest First (${tx2.inputs.length} inputs):    ${HoosatUtils.truncateHash(txId2)}`);
  console.log(`Smallest First (${tx3.inputs.length} inputs):   ${HoosatUtils.truncateHash(txId3)}`);
  console.log('═════════════════════════════════════\n');

  console.log('📚 Next Steps');
  console.log('─────────────────────────────────────');
  console.log('See: examples/transaction/04-estimate-fee.ts');
  console.log('     for fee estimation strategies');
  console.log('─────────────────────────────────────\n');
}

main();
