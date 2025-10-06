/**
 * Example: Build Transaction with Automatic Change
 *
 * Demonstrates:
 * - Automatic change calculation with addChangeOutput()
 * - Manual vs automatic change handling
 * - Fee calculation and validation
 * - Dust threshold handling
 * - Transaction validation before signing
 *
 * Prerequisites:
 * - None (works offline with mock data)
 *
 * Note: This example uses mock UTXO data and does NOT broadcast to network.
 */
import { HoosatCrypto, HoosatUtils, TransactionBuilder, UtxoForSigning } from '../../src';
import { HOOSAT_PARAMS } from '../../src/constants/hoosat-params.conts';

function main() {
  console.log('💰 Build Transaction with Automatic Change\n');

  // ==================== SETUP ====================
  console.log('1️⃣  Setup Wallet and Recipients');
  console.log('═════════════════════════════════════');

  const privateKeyHex = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';
  const wallet = HoosatCrypto.importKeyPair(privateKeyHex);

  console.log('Sender:');
  console.log(`  Address: ${HoosatUtils.truncateAddress(wallet.address)}`);
  console.log();

  const recipient1 = 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74';
  const recipient2 = 'hoosat:qr97kz9ujwylwxd8jkh9zs0nexlkkuu0v3aj0a6htvapan0a0arjugmlqf5ur';

  console.log('Recipients:');
  console.log(`  1: ${HoosatUtils.truncateAddress(recipient1)}`);
  console.log(`  2: ${HoosatUtils.truncateAddress(recipient2)}`);
  console.log();

  // ==================== SCENARIO 1: MANUAL CHANGE ====================
  console.log('2️⃣  Scenario 1: Manual Change Calculation');
  console.log('═════════════════════════════════════');

  const mockUtxo1: UtxoForSigning = {
    outpoint: {
      transactionId: 'f1e2d3c4b5a6978012345678901234567890123456789012345678901234cdef',
      index: 0,
    },
    utxoEntry: {
      amount: '200000000', // 2 HTN
      scriptPublicKey: {
        script: HoosatCrypto.addressToScriptPublicKey(wallet.address).toString('hex'),
        version: 0,
      },
      blockDaaScore: '1000001',
      isCoinbase: false,
    },
  };

  console.log('Available UTXO:');
  console.log(`  Amount: ${HoosatUtils.sompiToAmount(mockUtxo1.utxoEntry.amount)} HTN`);
  console.log();

  const builder1 = new TransactionBuilder();

  const sendAmount1 = '75000000'; // 0.75 HTN
  const fee1 = '1000'; // 0.00001 HTN

  // Manual change calculation
  const inputAmount1 = BigInt(mockUtxo1.utxoEntry.amount);
  const sendAmount1BigInt = BigInt(sendAmount1);
  const fee1BigInt = BigInt(fee1);
  const manualChange = inputAmount1 - sendAmount1BigInt - fee1BigInt;

  console.log('Manual Calculation:');
  console.log(`  Input:       ${HoosatUtils.sompiToAmount(inputAmount1)} HTN`);
  console.log(`  Send:        ${HoosatUtils.sompiToAmount(sendAmount1BigInt)} HTN`);
  console.log(`  Fee:         ${HoosatUtils.sompiToAmount(fee1BigInt)} HTN`);
  console.log(`  Change:      ${HoosatUtils.sompiToAmount(manualChange)} HTN`);
  console.log();

  builder1.addInput(mockUtxo1, wallet.privateKey);
  builder1.addOutput(recipient1, sendAmount1);
  builder1.setFee(fee1.toString());

  // ⚠️ Note: Using addOutputRaw to bypass spam protection for manual change
  // Normally you should use addChangeOutput() instead!
  const changeScriptPubKey = HoosatCrypto.addressToScriptPublicKey(wallet.address);
  builder1.addOutputRaw({
    amount: manualChange.toString(),
    scriptPublicKey: {
      scriptPublicKey: changeScriptPubKey.toString('hex'),
      version: 0,
    },
  });

  const tx1 = builder1.sign();
  const txId1 = HoosatCrypto.getTransactionId(tx1);

  console.log('✅ Transaction built with manual change');
  console.log(`   TX ID: ${HoosatUtils.truncateHash(txId1)}`);
  console.log(`   Outputs: ${tx1.outputs.length} (1 recipient + 1 change)`);
  console.log();
  console.log('⚠️  Note: Manual method uses addOutputRaw() to bypass validation');
  console.log('   This is NOT recommended - use addChangeOutput() instead!');
  console.log();

  // ==================== SCENARIO 2: AUTOMATIC CHANGE ====================
  console.log('3️⃣  Scenario 2: Automatic Change Calculation');
  console.log('═════════════════════════════════════');

  const mockUtxo2: UtxoForSigning = {
    outpoint: {
      transactionId: 'a9b8c7d6e5f4321098765432109876543210987654321098765432109876fedc',
      index: 1,
    },
    utxoEntry: {
      amount: '300000000', // 3 HTN
      scriptPublicKey: {
        script: HoosatCrypto.addressToScriptPublicKey(wallet.address).toString('hex'),
        version: 0,
      },
      blockDaaScore: '1000002',
      isCoinbase: false,
    },
  };

  console.log('Available UTXO:');
  console.log(`  Amount: ${HoosatUtils.sompiToAmount(mockUtxo2.utxoEntry.amount)} HTN`);
  console.log();

  const builder2 = new TransactionBuilder();

  const sendAmount2 = '100000000'; // 1 HTN
  const fee2 = HOOSAT_PARAMS.MIN_FEE; // 0.00001 HTN

  console.log('Transaction Setup:');
  console.log(`  Send to recipient: ${HoosatUtils.sompiToAmount(sendAmount2)} HTN`);
  console.log(`  Fee:               ${HoosatUtils.sompiToAmount(String(fee2))} HTN`);
  console.log();

  builder2.addInput(mockUtxo2, wallet.privateKey);
  builder2.addOutput(recipient1, sendAmount2);
  builder2.setFee(String(fee2));

  // Automatic change calculation
  console.log('🔄 Calling addChangeOutput() - automatic calculation...');
  builder2.addChangeOutput(wallet.address);

  const inputAmount2 = BigInt(mockUtxo2.utxoEntry.amount);
  const sendAmount2BigInt = BigInt(sendAmount2);
  const fee2BigInt = BigInt(fee2);
  const autoChange = inputAmount2 - sendAmount2BigInt - fee2BigInt;

  console.log();
  console.log('Automatic Calculation:');
  console.log(`  Input:       ${HoosatUtils.sompiToAmount(inputAmount2)} HTN`);
  console.log(`  Send:        ${HoosatUtils.sompiToAmount(sendAmount2BigInt)} HTN`);
  console.log(`  Fee:         ${HoosatUtils.sompiToAmount(fee2BigInt)} HTN`);
  console.log(`  Change:      ${HoosatUtils.sompiToAmount(autoChange)} HTN (calculated automatically)`);
  console.log();

  const tx2 = builder2.sign();
  const txId2 = HoosatCrypto.getTransactionId(tx2);

  console.log('✅ Transaction built with automatic change');
  console.log(`   TX ID: ${HoosatUtils.truncateHash(txId2)}`);
  console.log(`   Outputs: ${tx2.outputs.length} (1 recipient + 1 change)`);
  console.log();

  // ==================== SCENARIO 3: MULTIPLE RECIPIENTS + CHANGE ====================
  console.log('4️⃣  Scenario 3: Multiple Recipients + Automatic Change');
  console.log('═════════════════════════════════════');

  const mockUtxo3: UtxoForSigning = {
    outpoint: {
      transactionId: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      index: 0,
    },
    utxoEntry: {
      amount: '500000000', // 5 HTN
      scriptPublicKey: {
        script: HoosatCrypto.addressToScriptPublicKey(wallet.address).toString('hex'),
        version: 0,
      },
      blockDaaScore: '1000003',
      isCoinbase: false,
    },
  };

  const builder3 = new TransactionBuilder();

  const send1 = '150000000'; // 1.5 HTN to recipient1
  const send2 = '100000000'; // 1 HTN to recipient2
  const fee3 = HOOSAT_PARAMS.MIN_FEE;

  console.log('Transaction Setup:');
  console.log(`  Input:             ${HoosatUtils.sompiToAmount(mockUtxo3.utxoEntry.amount)} HTN`);
  console.log(`  To Recipient 1:    ${HoosatUtils.sompiToAmount(send1)} HTN`);
  console.log(`  To Recipient 2:    ${HoosatUtils.sompiToAmount(send2)} HTN`);
  console.log(`  Fee:               ${HoosatUtils.sompiToAmount(String(fee3))} HTN`);
  console.log();

  builder3.addInput(mockUtxo3, wallet.privateKey);
  builder3.addOutput(recipient1, send1);
  builder3.addOutput(recipient2, send2);
  builder3.setFee(String(fee3));
  builder3.addChangeOutput(wallet.address);

  const expectedChange = BigInt(mockUtxo3.utxoEntry.amount) - BigInt(send1) - BigInt(send2) - BigInt(fee3);

  console.log(`  Expected Change:   ${HoosatUtils.sompiToAmount(expectedChange)} HTN`);
  console.log();

  const tx3 = builder3.sign();
  const txId3 = HoosatCrypto.getTransactionId(tx3);

  console.log('✅ Transaction built successfully');
  console.log(`   TX ID: ${HoosatUtils.truncateHash(txId3)}`);
  console.log(`   Outputs: ${tx3.outputs.length} (2 recipients + 1 change)`);
  console.log();

  // ==================== SCENARIO 4: DUST THRESHOLD ====================
  console.log('5️⃣  Scenario 4: Dust Threshold (No Change Output)');
  console.log('═════════════════════════════════════');

  const mockUtxo4: UtxoForSigning = {
    outpoint: {
      transactionId: 'fedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
      index: 0,
    },
    utxoEntry: {
      amount: '10000000', // 0.1 HTN
      scriptPublicKey: {
        script: HoosatCrypto.addressToScriptPublicKey(wallet.address).toString('hex'),
        version: 0,
      },
      blockDaaScore: '1000004',
      isCoinbase: false,
    },
  };

  const builder4 = new TransactionBuilder();

  // Send almost everything, leaving only dust as change
  const send4 = '9998000'; // 0.09998 HTN
  const fee4 = HOOSAT_PARAMS.MIN_FEE; // 0.00001 HTN
  // Change would be: 10000000 - 9998000 - 1000 = 1000 sompi (dust)

  console.log('Transaction Setup:');
  console.log(`  Input:             ${HoosatUtils.sompiToAmount(mockUtxo4.utxoEntry.amount)} HTN`);
  console.log(`  Send:              ${HoosatUtils.sompiToAmount(send4)} HTN`);
  console.log(`  Fee:               ${HoosatUtils.sompiToAmount(String(fee4))} HTN`);

  const dustChange = BigInt(mockUtxo4.utxoEntry.amount) - BigInt(send4) - BigInt(fee4);
  console.log(`  Dust Change:       ${HoosatUtils.sompiToAmount(dustChange)} HTN (${dustChange} sompi)`);
  console.log();

  builder4.addInput(mockUtxo4, wallet.privateKey);
  builder4.addOutput(recipient1, send4);
  builder4.setFee(String(fee4));
  builder4.addChangeOutput(wallet.address); // Won't create output if dust

  const tx4 = builder4.sign();
  const txId4 = HoosatCrypto.getTransactionId(tx4);

  console.log('✅ Transaction built');
  console.log(`   TX ID: ${HoosatUtils.truncateHash(txId4)}`);
  console.log(`   Outputs: ${tx4.outputs.length} (1 recipient, ${tx4.outputs.length === 1 ? 'NO change - dust threshold' : '1 change'})`);
  console.log();

  if (tx4.outputs.length === 1) {
    console.log('   ℹ️  Change was below dust threshold (1000 sompi)');
    console.log('       It was added to the fee instead of creating output');
  }
  console.log();

  // ==================== SCENARIO 5: INSUFFICIENT FUNDS ====================
  console.log('6️⃣  Scenario 5: Insufficient Funds (Error Handling)');
  console.log('═════════════════════════════════════');

  const mockUtxo5: UtxoForSigning = {
    outpoint: {
      transactionId: '0000000000000000000000000000000000000000000000000000000000000001',
      index: 0,
    },
    utxoEntry: {
      amount: '10000000', // 0.1 HTN
      scriptPublicKey: {
        script: HoosatCrypto.addressToScriptPublicKey(wallet.address).toString('hex'),
        version: 0,
      },
      blockDaaScore: '1000005',
      isCoinbase: false,
    },
  };

  const builder5 = new TransactionBuilder();

  const send5 = '15000000'; // 0.15 HTN (more than we have!)
  const fee5 = HOOSAT_PARAMS.MIN_FEE;

  console.log('Attempting insufficient transaction:');
  console.log(`  Input:  ${HoosatUtils.sompiToAmount(mockUtxo5.utxoEntry.amount)} HTN`);
  console.log(`  Send:   ${HoosatUtils.sompiToAmount(send5)} HTN`);
  console.log(`  Fee:    ${HoosatUtils.sompiToAmount(String(fee5))} HTN`);
  console.log(`  Total:  ${HoosatUtils.sompiToAmount(BigInt(send5) + BigInt(fee5))} HTN`);
  console.log();

  try {
    builder5.addInput(mockUtxo5, wallet.privateKey);
    builder5.addOutput(recipient1, send5);
    builder5.setFee(String(fee5));
    builder5.addChangeOutput(wallet.address); // This will throw error

    console.log('❌ This should not happen!');
  } catch (error: any) {
    console.log('❌ Expected error caught:');
    console.log(`   ${error.message}`);
    console.log();
    console.log('   ℹ️  addChangeOutput() validates that inputs >= outputs + fee');
  }
  console.log();

  // ==================== COMPARISON TABLE ====================
  console.log('7️⃣  Comparison: Manual vs Automatic');
  console.log('═════════════════════════════════════');
  console.log('Feature              | Manual           | Automatic (addChangeOutput)');
  console.log('---------------------|------------------|----------------------------');
  console.log('Change calculation   | You calculate    | ✅ Automatic');
  console.log('Validation           | Manual check     | ✅ Built-in');
  console.log('Dust handling        | Manual check     | ✅ Automatic');
  console.log('Error prevention     | Prone to errors  | ✅ Safe');
  console.log('Code simplicity      | More verbose     | ✅ Cleaner');
  console.log('═════════════════════════════════════\n');

  // ==================== BEST PRACTICES ====================
  console.log('💡 Best Practices');
  console.log('─────────────────────────────────────');
  console.log('1. ✅ Use addChangeOutput() for automatic calculation');
  console.log('2. ✅ Set fee BEFORE calling addChangeOutput()');
  console.log('3. ✅ Add all outputs BEFORE calculating change');
  console.log('4. ✅ Let the builder handle dust threshold');
  console.log('5. ✅ Use validate() to check transaction before signing');
  console.log('6. ⚠️  Always verify recipient addresses');
  console.log('7. ⚠️  Double-check amounts before signing');
  console.log('─────────────────────────────────────\n');

  // ==================== SUMMARY ====================
  console.log('✅ Transaction Building Summary');
  console.log('═════════════════════════════════════');
  console.log(`Scenario 1 (Manual):        ${HoosatUtils.truncateHash(txId1)}`);
  console.log(`Scenario 2 (Automatic):     ${HoosatUtils.truncateHash(txId2)}`);
  console.log(`Scenario 3 (Multi-output):  ${HoosatUtils.truncateHash(txId3)}`);
  console.log(`Scenario 4 (Dust):          ${HoosatUtils.truncateHash(txId4)}`);
  console.log(`Scenario 5 (Insufficient):  Error (as expected)`);
  console.log('═════════════════════════════════════\n');

  console.log('📚 Next Steps');
  console.log('─────────────────────────────────────');
  console.log('See: examples/transaction/03-multiple-inputs.ts');
  console.log('     for handling multiple UTXOs in one transaction');
  console.log('─────────────────────────────────────\n');
}

main();
