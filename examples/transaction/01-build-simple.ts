/**
 * Example: Build Simple Transaction
 *
 * Demonstrates:
 * - Creating a transaction with TransactionBuilder
 * - Adding single input and output
 * - Signing transaction
 * - Getting transaction ID
 * - Understanding transaction structure
 *
 * Prerequisites:
 * - None (works offline with mock data)
 *
 * Note: This example uses mock UTXO data and does NOT broadcast to network.
 *       It demonstrates transaction building and signing only.
 */
import { HoosatCrypto, HoosatUtils, TransactionBuilder, UtxoForSigning } from '../../src';

function main() {
  console.log('🔨 Build Simple Transaction\n');

  // ==================== SETUP ====================
  console.log('1️⃣  Setup');
  console.log('═════════════════════════════════════');

  // Generate a keypair for demo (or use the provided private key)
  const privateKeyHex = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';
  const wallet = HoosatCrypto.importKeyPair(privateKeyHex);

  console.log('Sender Wallet:');
  console.log(`  Address:     ${HoosatUtils.truncateAddress(wallet.address)}`);
  console.log(`  Public Key:  ${wallet.publicKey.toString('hex').slice(0, 20)}...`);
  console.log();

  // Recipient address
  const recipientAddress = 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74';
  console.log('Recipient:');
  console.log(`  Address:     ${HoosatUtils.truncateAddress(recipientAddress)}`);
  console.log();

  // ==================== MOCK UTXO ====================
  console.log('2️⃣  Mock UTXO (Unspent Transaction Output)');
  console.log('═════════════════════════════════════');

  // Create mock UTXO that we "own"
  // In real scenario, this comes from node.getUtxosByAddresses()
  const mockUtxo: UtxoForSigning = {
    outpoint: {
      transactionId: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd', // Mock TX ID
      index: 0, // Output index
    },
    utxoEntry: {
      amount: '100000000', // 1 HTN in sompi
      scriptPublicKey: {
        script: HoosatCrypto.addressToScriptPublicKey(wallet.address).toString('hex'),
        version: 0,
      },
      blockDaaScore: '1000000',
      isCoinbase: false,
    },
  };

  console.log('Mock UTXO Details:');
  console.log(`  TX ID:       ${HoosatUtils.truncateHash(mockUtxo.outpoint.transactionId)}`);
  console.log(`  Index:       ${mockUtxo.outpoint.index}`);
  console.log(`  Amount:      ${HoosatUtils.sompiToAmount(mockUtxo.utxoEntry.amount)} HTN`);
  console.log(`  Script:      ${mockUtxo.utxoEntry.scriptPublicKey.script.slice(0, 20)}...`);
  console.log(`  DAA Score:   ${mockUtxo.utxoEntry.blockDaaScore}`);
  console.log(`  Is Coinbase: ${mockUtxo.utxoEntry.isCoinbase}`);
  console.log();

  // ==================== BUILD TRANSACTION ====================
  console.log('3️⃣  Build Transaction');
  console.log('═════════════════════════════════════');

  // Create transaction builder
  const builder = new TransactionBuilder({ debug: false });

  // Transaction amounts
  const amountToSend = '50000000'; // 0.5 HTN
  const fee = '1000'; // 0.00001 HTN
  const inputAmount = BigInt(mockUtxo.utxoEntry.amount);
  const sendAmount = BigInt(amountToSend);
  const feeAmount = BigInt(fee);
  const changeAmount = inputAmount - sendAmount - feeAmount;

  console.log('Transaction Breakdown:');
  console.log(`  Input:       ${HoosatUtils.sompiToAmount(inputAmount)} HTN`);
  console.log(`  Send:        ${HoosatUtils.sompiToAmount(sendAmount)} HTN`);
  console.log(`  Fee:         ${HoosatUtils.sompiToAmount(feeAmount)} HTN`);
  console.log(`  Change:      ${HoosatUtils.sompiToAmount(changeAmount)} HTN`);
  console.log();

  // Add input (UTXO we're spending)
  builder.addInput(mockUtxo, wallet.privateKey);
  console.log('✅ Added input');

  // Add output (recipient)
  builder.addOutput(recipientAddress, amountToSend);
  console.log('✅ Added recipient output');

  // Add change output (back to sender)
  builder.addOutput(wallet.address, changeAmount.toString());
  console.log('✅ Added change output');

  // Set fee
  builder.setFee(fee);
  console.log('✅ Set fee');
  console.log();

  // ==================== SIGN TRANSACTION ====================
  console.log('4️⃣  Sign Transaction');
  console.log('═════════════════════════════════════');

  const signedTx = builder.sign();
  console.log('✅ Transaction signed successfully!');
  console.log();

  // ==================== TRANSACTION DETAILS ====================
  console.log('5️⃣  Signed Transaction Details');
  console.log('═════════════════════════════════════');

  const txId = HoosatCrypto.getTransactionId(signedTx);

  console.log('Transaction:');
  console.log(`  TX ID:       ${txId}`);
  console.log(`  Truncated:   ${HoosatUtils.truncateHash(txId)}`);
  console.log(`  Version:     ${signedTx.version}`);
  console.log(`  Lock Time:   ${signedTx.lockTime}`);
  console.log(`  Inputs:      ${signedTx.inputs.length}`);
  console.log(`  Outputs:     ${signedTx.outputs.length}`);
  console.log();

  // ==================== INPUT DETAILS ====================
  console.log('Input Details:');
  signedTx.inputs.forEach((input, idx) => {
    console.log(`  Input ${idx + 1}:`);
    console.log(`    Previous TX:  ${HoosatUtils.truncateHash(input.previousOutpoint.transactionId)}`);
    console.log(`    Output Index: ${input.previousOutpoint.index}`);
    console.log(`    Signature:    ${input.signatureScript.slice(0, 20)}... (${input.signatureScript.length / 2} bytes)`);
    console.log(`    Sequence:     ${input.sequence}`);
    console.log(`    SigOpCount:   ${input.sigOpCount}`);
  });
  console.log();

  // ==================== OUTPUT DETAILS ====================
  console.log('Output Details:');
  signedTx.outputs.forEach((output, idx) => {
    const amount = HoosatUtils.sompiToAmount(output.amount);
    console.log(`  Output ${idx + 1}:`);
    console.log(`    Amount:       ${amount} HTN`);
    console.log(`    Script:       ${output.scriptPublicKey.scriptPublicKey.slice(0, 20)}...`);
    console.log(`    Version:      ${output.scriptPublicKey.version}`);
  });
  console.log();

  // ==================== SIGNATURE VERIFICATION ====================
  console.log('6️⃣  Signature Verification');
  console.log('═════════════════════════════════════');

  // Parse signature from input
  const sigScript = Buffer.from(signedTx.inputs[0].signatureScript, 'hex');
  console.log('Signature Script Analysis:');
  console.log(`  Total Length:     ${sigScript.length} bytes`);
  console.log(`  Length Prefix:    0x${sigScript[0].toString(16)} (${sigScript[0]} bytes follow)`);

  if (sigScript[0] === 0x41) {
    // 0x41 = 65 bytes: 64-byte signature + 1-byte hashType
    const signature = sigScript.slice(1, 65);
    const hashType = sigScript[65];
    console.log(`  Signature:        ${signature.toString('hex').slice(0, 40)}... (64 bytes)`);
    console.log(`  Hash Type:        0x${hashType.toString(16).padStart(2, '0')} (SIGHASH_ALL)`);
    console.log();

    // Verify signature
    const isValid = HoosatCrypto.verifyTransactionSignature(signedTx, 0, signature, wallet.publicKey, mockUtxo);

    console.log(`  Verification:     ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  }
  console.log();

  // ==================== TRANSACTION JSON ====================
  console.log('7️⃣  Transaction JSON (for API submission)');
  console.log('═════════════════════════════════════');
  console.log(JSON.stringify(signedTx, null, 2));
  console.log();

  // ==================== IMPORTANT NOTES ====================
  console.log('⚠️  Important Notes');
  console.log('═════════════════════════════════════');
  console.log('1. This transaction uses MOCK UTXO data');
  console.log('2. Transaction is signed but NOT broadcast to network');
  console.log('3. TX ID will be different with real UTXOs');
  console.log('4. In real scenario, get UTXOs from node.getUtxosByAddresses()');
  console.log('5. Use node.submitTransaction() to broadcast');
  console.log();

  // ==================== NEXT STEPS ====================
  console.log('📚 Next Steps');
  console.log('─────────────────────────────────────');
  console.log('To broadcast this transaction:');
  console.log('1. Replace mock UTXO with real UTXO from node');
  console.log('2. Verify recipient address');
  console.log('3. Double-check amounts');
  console.log('4. Call: await node.submitTransaction(signedTx)');
  console.log('─────────────────────────────────────\n');

  // Summary
  console.log('✅ Transaction successfully built and signed!');
  console.log(`   TX ID: ${HoosatUtils.truncateHash(txId)}`);
  console.log(`   Size: ${JSON.stringify(signedTx).length} bytes (JSON)\n`);
}

main();
