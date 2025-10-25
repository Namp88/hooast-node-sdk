/**
 * Example 11: Test Subnetwork with Payload
 *
 * This example tests sending transactions with payload on alternative subnetwork IDs.
 * The native subnetwork (0x00...00) has payload disabled until hardfork,
 * but alternative subnetworks may already support it.
 *
 * What you'll learn:
 * - How to set alternative subnetwork ID
 * - How to add payload data to transactions
 * - How to test which subnetworks accept payload
 * - How to verify payload in submitted transactions
 *
 * Prerequisites:
 * - Access to Hoosat node (mainnet or testnet)
 * - Private key with sufficient balance
 * - Valid recipient address
 *
 * @see https://github.com/kaspanet/kaspad/blob/master/domain/consensus/model/interface_processes_transactionvalidator.go
 */
import { HoosatClient, HoosatCrypto, HoosatTxBuilder, HoosatUtils, UtxoForSigning } from '../../src';

// Test configuration
const TEST_SUBNETWORKS = [
  { id: '0000000000000000000000000000000000000000', name: 'Native (default)', expectPayloadAccepted: false },
  { id: '0100000000000000000000000000000000000000', name: 'Subnetwork 0x01', expectPayloadAccepted: true },
  { id: '0200000000000000000000000000000000000000', name: 'Subnetwork 0x02', expectPayloadAccepted: true },
  { id: '0300000000000000000000000000000000000000', name: 'Subnetwork 0x03', expectPayloadAccepted: true },
];

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   🔬 EXAMPLE 11: TEST SUBNETWORK WITH PAYLOAD');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== CONFIGURATION ====================
  console.log('⚙️  Configuration');
  console.log('─────────────────────────────────────────────────────────────');

  const NODE_HOST = '54.38.176.95';
  const NODE_PORT = 42420;
  const PRIVATE_KEY = '33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43';
  const RECIPIENT = 'hoosat:qz95mwas8ja7ucsernv9z335rdxxqswff7wvzenl29qukn5qs3lsqfsa4pd74';
  const AMOUNT_HTN = '0.001'; // Small amount for testing

  // Test payload data
  const PAYLOAD_TEXT = 'Hello Hoosat! Test payload on subnetwork.';
  const PAYLOAD_HEX = Buffer.from(PAYLOAD_TEXT, 'utf-8').toString('hex');

  console.log(`Node:      ${NODE_HOST}:${NODE_PORT}`);
  console.log(`Recipient: ${RECIPIENT.slice(0, 30)}...`);
  console.log(`Amount:    ${AMOUNT_HTN} HTN`);
  console.log(`Payload:   "${PAYLOAD_TEXT}"`);
  console.log(`Hex:       ${PAYLOAD_HEX}\n`);

  // ==================== WARNINGS ====================
  console.log('⚠️  TESTING WARNINGS');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('1. This will send REAL test transactions to the network');
  console.log('2. Each test will attempt to send a small transaction with payload');
  console.log('3. Some tests may fail if subnetwork rejects payload');
  console.log('4. This helps identify which subnetworks support payload\n');

  console.log(`Testing ${TEST_SUBNETWORKS.length} different subnetwork IDs...\n`);
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // ==================== STEP 1: CONNECT TO NODE ====================
  console.log('1️⃣  Connecting to Hoosat Node');
  console.log('═════════════════════════════════════════════════════════════');

  const client = new HoosatClient({
    host: NODE_HOST,
    port: NODE_PORT,
    timeout: 15000,
  });

  try {
    const nodeInfo = await client.getInfo();
    if (!nodeInfo.ok || !nodeInfo.result) {
      throw new Error('Failed to connect to node');
    }

    console.log('✅ Connected successfully');
    console.log(`   Server Version: ${nodeInfo.result.serverVersion}`);
    console.log(`   Is Synced:      ${nodeInfo.result.isSynced}`);
    console.log(`   Has UTXO Index: ${nodeInfo.result.isUtxoIndexed}\n`);

    if (!nodeInfo.result.isSynced) {
      console.log('⚠️  Warning: Node is not fully synced\n');
    }

    if (!nodeInfo.result.isUtxoIndexed) {
      throw new Error('Node must have UTXO index enabled (--utxoindex flag)');
    }
  } catch (error) {
    console.error('❌ Failed to connect to node:', error);
    process.exit(1);
  }

  // ==================== STEP 2: IMPORT WALLET ====================
  console.log('2️⃣  Import Wallet from Private Key');
  console.log('═════════════════════════════════════════════════════════════');

  let wallet;
  try {
    wallet = HoosatCrypto.importKeyPair(PRIVATE_KEY);
    console.log('✅ Wallet imported successfully');
    console.log(`   Address: ${wallet.address}\n`);
  } catch (error) {
    console.error('❌ Failed to import wallet:', error);
    process.exit(1);
  }

  // ==================== STEP 3: VALIDATE RECIPIENT ====================
  console.log('3️⃣  Validate Recipient Address');
  console.log('═════════════════════════════════════════════════════════════');

  if (!HoosatUtils.isValidAddress(RECIPIENT)) {
    console.error('❌ Invalid recipient address');
    process.exit(1);
  }

  console.log('✅ Recipient address is valid\n');

  // ==================== STEP 4: FETCH UTXOs ====================
  console.log('4️⃣  Fetch UTXOs from Blockchain');
  console.log('═════════════════════════════════════════════════════════════');

  let utxos;
  try {
    const utxoResponse = await client.getUtxosByAddresses([wallet.address]);

    if (!utxoResponse.ok || !utxoResponse.result) {
      throw new Error('Failed to fetch UTXOs');
    }

    utxos = utxoResponse.result.utxos;
    console.log(`✅ Found ${utxos.length} UTXO(s)\n`);

    if (utxos.length === 0) {
      console.error('❌ No UTXOs available');
      process.exit(1);
    }

    const totalBalance = utxos.reduce((sum, utxo) => sum + BigInt(utxo.utxoEntry.amount), 0n);
    console.log(`Total Balance: ${HoosatUtils.sompiToAmount(totalBalance)} HTN\n`);
  } catch (error) {
    console.error('❌ Failed to fetch UTXOs:', error);
    process.exit(1);
  }

  // ==================== STEP 5: CALCULATE FEE ====================
  console.log('5️⃣  Calculate Minimum Fee');
  console.log('═════════════════════════════════════════════════════════════');

  // Calculate fee with payload size
  const payloadSize = PAYLOAD_HEX.length / 2; // Convert hex to bytes
  const minFeeString = HoosatCrypto.calculateMinFee(utxos.length, 2, payloadSize);
  console.log(`✅ Minimum fee for ${payloadSize} byte payload: ${minFeeString} sompi\n`);

  // ==================== STEP 6: TEST EACH SUBNETWORK ====================
  console.log('6️⃣  Testing Subnetworks with Payload');
  console.log('═════════════════════════════════════════════════════════════\n');

  const results: Array<{
    subnetworkId: string;
    name: string;
    success: boolean;
    txId?: string;
    error?: string;
  }> = [];

  for (const testSubnet of TEST_SUBNETWORKS) {
    console.log(`\n🧪 Testing: ${testSubnet.name} (${testSubnet.id})`);
    console.log('─────────────────────────────────────────────────────────────');

    try {
      const sendAmountSompi = HoosatUtils.amountToSompi(AMOUNT_HTN);
      const sendAmount = BigInt(sendAmountSompi);

      // Select UTXOs
      let selectedUtxos: typeof utxos = [];
      let selectedAmount = 0n;

      for (const utxo of utxos) {
        selectedUtxos.push(utxo);
        selectedAmount += BigInt(utxo.utxoEntry.amount);

        const minFee = BigInt(HoosatCrypto.calculateMinFee(selectedUtxos.length, 2, payloadSize));

        if (selectedAmount >= sendAmount + minFee) {
          break;
        }
      }

      // Calculate final amounts
      const numInputs = selectedUtxos.length;
      const numOutputs = 2; // Recipient + change
      const minFee = BigInt(HoosatCrypto.calculateMinFee(numInputs, numOutputs, payloadSize));
      const changeAmount = selectedAmount - sendAmount - minFee;

      if (changeAmount < 0n) {
        throw new Error('Insufficient funds');
      }

      // Build transaction with subnetwork and payload
      const builder = new HoosatTxBuilder({ debug: false });

      // Add inputs
      for (const utxo of selectedUtxos) {
        const utxoForSigning: UtxoForSigning = {
          outpoint: {
            transactionId: utxo.outpoint.transactionId,
            index: utxo.outpoint.index,
          },
          utxoEntry: {
            amount: utxo.utxoEntry.amount,
            scriptPublicKey: {
              script: utxo.utxoEntry.scriptPublicKey.scriptPublicKey,
              version: utxo.utxoEntry.scriptPublicKey.version,
            },
            blockDaaScore: utxo.utxoEntry.blockDaaScore,
            isCoinbase: utxo.utxoEntry.isCoinbase,
          },
        };

        builder.addInput(utxoForSigning, wallet.privateKey);
      }

      // Add recipient output
      builder.addOutput(RECIPIENT, sendAmount.toString());

      // Add change output manually if needed
      if (changeAmount >= 1000n) {
        builder.addOutputRaw({
          amount: changeAmount.toString(),
          scriptPublicKey: {
            scriptPublicKey: HoosatCrypto.addressToScriptPublicKey(wallet.address).toString('hex'),
            version: 0,
          },
        });
      }

      // Set fee, subnetwork, and payload
      builder.setFee(minFee.toString());
      builder.setSubnetworkId(testSubnet.id);
      builder.setPayload(PAYLOAD_HEX);

      // Sign transaction
      const signedTx = builder.sign();
      const txId = HoosatCrypto.getTransactionId(signedTx);

      console.log('✅ Transaction built and signed');
      console.log(`   TX ID:        ${txId}`);
      console.log(`   Subnetwork:   ${signedTx.subnetworkId}`);
      console.log(`   Payload:      ${signedTx.payload.slice(0, 40)}${signedTx.payload.length > 40 ? '...' : ''}`);
      console.log(`   Payload Size: ${signedTx.payload.length / 2} bytes\n`);

      // Submit transaction
      console.log('Submitting to network...');
      const submitResult = await client.submitTransaction(signedTx);

      if (!submitResult.ok || !submitResult.result) {
        throw new Error(submitResult.error || 'Transaction rejected');
      }

      const submittedTxId = submitResult.result.transactionId;

      console.log('✅ SUCCESS! Transaction accepted by network');
      console.log(`   TX ID: ${submittedTxId}\n`);

      results.push({
        subnetworkId: testSubnet.id,
        name: testSubnet.name,
        success: true,
        txId: submittedTxId,
      });

      // Wait before next test
      console.log('Waiting 3 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    } catch (error) {
      console.error('❌ FAILED! Transaction rejected');
      console.error(`   Error: ${error}\n`);

      results.push({
        subnetworkId: testSubnet.id,
        name: testSubnet.name,
        success: false,
        error: String(error),
      });
    }
  }

  // ==================== STEP 7: SUMMARY ====================
  console.log('\n7️⃣  Test Results Summary');
  console.log('═════════════════════════════════════════════════════════════\n');

  console.log('Subnetwork Payload Support Results:');
  console.log('─────────────────────────────────────────────────────────────');

  for (const result of results) {
    const status = result.success ? '✅ ACCEPTED' : '❌ REJECTED';
    console.log(`\n${status}: ${result.name}`);
    console.log(`  Subnetwork ID: ${result.subnetworkId}`);

    if (result.success) {
      console.log(`  TX ID: ${result.txId}`);
      console.log(`  Payload: "${PAYLOAD_TEXT}"`);
    } else {
      console.log(`  Error: ${result.error}`);
    }
  }

  console.log('\n─────────────────────────────────────────────────────────────');
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => r.success === false).length;

  console.log(`\n📊 Summary: ${successCount} accepted, ${failCount} rejected out of ${results.length} tests\n`);

  if (successCount > 0) {
    console.log('✅ Payload support found on these subnetworks:');
    results
      .filter(r => r.success)
      .forEach(r => {
        console.log(`   • ${r.name} (${r.subnetworkId})`);
      });
    console.log();
  }

  if (failCount > 0) {
    console.log('❌ Payload NOT supported on these subnetworks:');
    results
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   • ${r.name} (${r.subnetworkId})`);
      });
    console.log();
  }

  // ==================== COMPLETION ====================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   ✅ TESTING COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Recommendations:');
  if (successCount > 0) {
    const firstSuccess = results.find(r => r.success);
    console.log(`  ✅ Use subnetwork ${firstSuccess!.subnetworkId} for payload support`);
    console.log('  ✅ You can now send transactions with custom data');
    console.log('  ✅ Payload will be stored on-chain and verifiable');
  } else {
    console.log('  ⚠️  No subnetworks currently accept payload');
    console.log('  ⚠️  Wait for hardfork or contact node operator');
    console.log('  ℹ️  Native subnetwork will support payload after hardfork');
  }

  console.log();

  // Cleanup
  client.disconnect();
  console.log('✅ Disconnected from node\n');
}

// Run example
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
