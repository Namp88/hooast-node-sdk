/**
 * Example 12: Test Subnetwork 0x03 Payload on Local Testnet
 *
 * This example tests sending transactions with payload on subnetwork 0x03
 * using a local testnet node running the Enable-Data-Subnetwork branch.
 *
 * What you'll learn:
 * - How to connect to local testnet node
 * - How to test subnetwork 0x03 with payload support
 * - How to verify payload transactions for voting system
 * - How to prepare for mainnet hardfork
 *
 * Prerequisites:
 * - Local testnet node running (docker-compose up -d)
 * - Miner generating blocks (docker-compose --profile mining up -d htn-miner)
 * - Private key with testnet balance
 *
 * Setup:
 * 1. cd docker/
 * 2. docker-compose -f docker-compose.testnet.yml up -d
 * 3. docker-compose -f docker-compose.testnet.yml --profile mining up -d htn-miner
 * 4. Wait for blocks to be mined (~1-2 minutes)
 * 5. Run this script with your testnet private key
 */
import { FeePriority, HoosatClient, HoosatCrypto, HoosatFeeEstimator, HoosatTxBuilder, HoosatUtils, UtxoForSigning } from 'hoosat-sdk';

// Testnet configuration
// Update these with Tonto's testnet node details
const TESTNET_NODE_HOST = '89.166.118.104';
const TESTNET_NODE_PORT = 42422;

// Subnetwork 0x03 - Data Subnetwork (enabled in Enable-Data-Subnetwork branch)
const DATA_SUBNETWORK_ID = '0300000000000000000000000000000000000000';

// Test payloads matching the Hoosat Vote Service format
const TEST_PAYLOADS = [
  {
    name: 'Poll Creation',
    data: {
      type: 'poll_create',
      v: 1,
      title: 'Test Poll: Enable Payload Support?',
      description: 'Should we enable payload support in Hoosat mainnet?',
      options: ['Yes, enable it', 'No, wait longer', 'Need more discussion'],
      allowMultiple: false,
      endTime: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
    },
  },
  {
    name: 'Vote Casting',
    data: {
      type: 'vote_cast',
      v: 1,
      pollId: 'test_poll_123',
      votes: [0], // Vote for first option
      timestamp: Math.floor(Date.now() / 1000),
    },
  },
  {
    name: 'Generic Data',
    data: {
      type: 'custom_data',
      v: 1,
      message: 'Hello from Hoosat testnet with payload support!',
      timestamp: Math.floor(Date.now() / 1000),
    },
  },
];

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   🧪 TESTNET: SUBNETWORK 0x03 PAYLOAD TEST');
  console.log('═══════════════════════════════════════════════════════════\n');

  // ==================== CONFIGURATION ====================
  console.log('⚙️  Configuration');
  console.log('─────────────────────────────────────────────────────────────');

  // Get private key from environment or use default testnet key
  const PRIVATE_KEY = '1dbc8d6aa3d26d8480178db6f467c2ccbf063a9f07aae09ac3f4266ded995095';

  if (!PRIVATE_KEY) {
    console.error('❌ Error: TESTNET_PRIVATE_KEY environment variable not set');
    console.log('\nPlease set your testnet private key:');
    console.log('  export TESTNET_PRIVATE_KEY="your_testnet_private_key_here"');
    console.log('\nOr generate a new testnet keypair:');
    console.log('  docker exec htnd-testnet-node genkeypair --testnet\n');
    process.exit(1);
  }

  console.log(`Testnet Node:  ${TESTNET_NODE_HOST}:${TESTNET_NODE_PORT}`);
  console.log(`Subnetwork ID: ${DATA_SUBNETWORK_ID} (Data Subnetwork)`);
  console.log(`Test Payloads: ${TEST_PAYLOADS.length}\n`);

  // ==================== STEP 1: CONNECT TO TESTNET NODE ====================
  console.log('1️⃣  Connecting to Local Testnet Node');
  console.log('═════════════════════════════════════════════════════════════');

  const client = new HoosatClient({
    host: TESTNET_NODE_HOST,
    port: TESTNET_NODE_PORT,
    timeout: 15000,
  });

  try {
    const nodeInfo = await client.getInfo();
    if (!nodeInfo.ok || !nodeInfo.result) {
      throw new Error('Failed to connect to testnet node');
    }

    console.log('✅ Connected successfully');
    console.log(`   Server Version: ${nodeInfo.result.serverVersion}`);
    console.log(`   Is Synced:      ${nodeInfo.result.isSynced}`);
    console.log(`   Has UTXO Index: ${nodeInfo.result.isUtxoIndexed}`);
    console.log(`   Network:        ${nodeInfo.result || 'testnet'}\n`);

    if (!nodeInfo.result.isUtxoIndexed) {
      throw new Error('Node must have UTXO index enabled (--utxoindex flag)');
    }
  } catch (error) {
    console.error('❌ Failed to connect to testnet node:', error);
    process.exit(1);
  }

  // ==================== STEP 2: IMPORT WALLET ====================
  console.log('2️⃣  Import Testnet Wallet');
  console.log('═════════════════════════════════════════════════════════════');

  let wallet;
  try {
    wallet = HoosatCrypto.importKeyPair(PRIVATE_KEY, 'testnet');
    console.log('✅ Wallet imported successfully');
    console.log(`   Address: ${wallet.address}\n`);
  } catch (error) {
    console.error('❌ Failed to import wallet:', error);
    process.exit(1);
  }

  // ==================== STEP 3: FETCH UTXOs ====================
  console.log('3️⃣  Fetch UTXOs from Testnet');
  console.log('═════════════════════════════════════════════════════════════');

  let utxos;
  try {
    const utxoResponse = await client.getUtxosByAddresses([wallet.address]);

    if (!utxoResponse.ok || !utxoResponse.result) {
      throw new Error('Failed to fetch UTXOs');
    }

    utxos = utxoResponse.result.utxos;
    console.log(`✅ Found ${utxos.length} UTXO(s)\n`);

    // Get current DAA score to check coinbase maturity
    const dagInfo = await client.getBlockDagInfo();
    if (!dagInfo.ok || !dagInfo.result) {
      throw new Error('Failed to get DAG info');
    }

    const currentDaaScore = parseInt(dagInfo.result.virtualDaaScore);
    const COINBASE_MATURITY = 100;

    // Use SDK utility to filter mature UTXOs
    const { mature: matureUtxos, immature: immatureUtxos } = HoosatUtils.separateMatureUtxos(utxos, currentDaaScore, COINBASE_MATURITY);

    const immatureCount = immatureUtxos.length;

    if (immatureCount > 0) {
      console.log(`⚠️  Filtered out ${immatureCount} immature coinbase UTXO(s)`);
      console.log(`   (Coinbase needs ${COINBASE_MATURITY} confirmations, current block: ${currentDaaScore})\n`);
    }

    utxos = matureUtxos;

    if (utxos.length === 0) {
      console.error('❌ No mature UTXOs available');
      console.log('\nWait for more blocks or ask Tonto for non-coinbase coins\n');
      process.exit(1);
    }

    const totalBalance = utxos.reduce((sum, utxo) => sum + BigInt(utxo.utxoEntry.amount), 0n);
    console.log(`Total Balance: ${HoosatUtils.sompiToAmount(totalBalance)} HTN\n`);
  } catch (error) {
    console.error('❌ Failed to fetch UTXOs:', error);
    process.exit(1);
  }

  // ==================== STEP 4: TEST PAYLOAD TRANSACTIONS ====================
  console.log('4️⃣  Testing Payload Transactions on Subnetwork 0x03');
  console.log('═════════════════════════════════════════════════════════════\n');

  const results: Array<{
    name: string;
    success: boolean;
    txId?: string;
    payload?: string;
    error?: string;
  }> = [];

  // Get fee estimate
  const feeEstimator = new HoosatFeeEstimator(client);
  const feeRecommendations = await feeEstimator.getRecommendations();
  const selectedFeeRate = feeRecommendations[FeePriority.Normal].feeRate;

  console.log(`Fee Rate: ${selectedFeeRate} sompi/byte\n`);

  for (const testPayload of TEST_PAYLOADS) {
    console.log(`\n🧪 Testing: ${testPayload.name}`);
    console.log('─────────────────────────────────────────────────────────────');

    try {
      // Convert payload to hex
      const payloadJson = JSON.stringify(testPayload.data);
      const payloadHex = Buffer.from(payloadJson, 'utf-8').toString('hex');

      console.log(`Payload JSON: ${payloadJson.substring(0, 80)}...`);
      console.log(`Payload Size: ${payloadHex.length / 2} bytes\n`);

      // Send to self with minimal amount
      const sendAmount = 100000n; // 0.001 HTN

      // Select UTXOs
      let selectedUtxos: typeof utxos = [];
      let selectedAmount = 0n;

      for (const utxo of utxos) {
        selectedUtxos.push(utxo);
        selectedAmount += BigInt(utxo.utxoEntry.amount);

        const estimatedFee = BigInt(HoosatCrypto.calculateFee(selectedUtxos.length, 2, selectedFeeRate));

        if (selectedAmount >= sendAmount + estimatedFee) {
          break;
        }
      }

      // Calculate final amounts with payload
      const numInputs = selectedUtxos.length;
      const numOutputs = 2; // Recipient + change
      const payloadSize = payloadHex.length / 2; // Convert hex to bytes

      // Use SDK's updated calculateFee with payload size parameter
      const estimatedFee = BigInt(HoosatCrypto.calculateFee(numInputs, numOutputs, selectedFeeRate, payloadSize));

      const changeAmount = selectedAmount - sendAmount - estimatedFee;

      if (changeAmount < 0n) {
        throw new Error('Insufficient funds');
      }

      // Build transaction
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

      // Add output (send to self)
      builder.addOutput(wallet.address, sendAmount.toString());

      // Add change output
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
      builder.setFee(estimatedFee.toString());
      builder.setSubnetworkId(DATA_SUBNETWORK_ID);
      builder.setPayload(payloadHex);

      // Sign transaction
      const signedTx = builder.sign();
      const txId = HoosatCrypto.getTransactionId(signedTx);

      console.log('✅ Transaction built and signed');
      console.log(`   TX ID:        ${txId}`);
      console.log(`   Subnetwork:   ${signedTx.subnetworkId}`);
      console.log(`   Payload Size: ${signedTx.payload.length / 2} bytes\n`);

      // Submit transaction
      console.log('Submitting to testnet...');
      const submitResult = await client.submitTransaction(signedTx);

      if (!submitResult.ok || !submitResult.result) {
        throw new Error(submitResult.error || 'Transaction rejected');
      }

      const submittedTxId = submitResult.result.transactionId;

      console.log('✅ SUCCESS! Transaction accepted by testnet');
      console.log(`   TX ID: ${submittedTxId}\n`);

      results.push({
        name: testPayload.name,
        success: true,
        txId: submittedTxId,
        payload: payloadJson,
      });

      // Wait before next test (longer to allow previous tx to propagate)
      console.log('Waiting 5 seconds before next test...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error('❌ FAILED! Transaction rejected');
      console.error(`   Error: ${error}\n`);

      results.push({
        name: testPayload.name,
        success: false,
        error: String(error),
      });
    }
  }

  // ==================== STEP 5: SUMMARY ====================
  console.log('\n5️⃣  Test Results Summary');
  console.log('═════════════════════════════════════════════════════════════\n');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => r.success === false).length;

  console.log('Test Results:');
  console.log('─────────────────────────────────────────────────────────────');

  for (const result of results) {
    const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
    console.log(`\n${status}: ${result.name}`);

    if (result.success) {
      console.log(`  TX ID: ${result.txId}`);
      console.log(`  Payload: ${result.payload?.substring(0, 60)}...`);
    } else {
      console.log(`  Error: ${result.error}`);
    }
  }

  console.log('\n─────────────────────────────────────────────────────────────');
  console.log(`📊 Summary: ${successCount} succeeded, ${failCount} failed out of ${results.length} tests\n`);

  // ==================== COMPLETION ====================
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   ✅ TESTNET TESTING COMPLETE');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (successCount > 0) {
    console.log('✅ Subnetwork 0x03 payload support is WORKING!');
    console.log('\nNext Steps:');
    console.log('  1. ✅ Payload transactions work on subnetwork 0x03');
    console.log('  2. ✅ Hoosat Vote Service payload format is compatible');
    console.log('  3. 🔄 Wait for mainnet hardfork to enable this feature');
    console.log('  4. 🚀 Deploy Vote Service with subnetwork 0x03 after hardfork\n');
  } else {
    console.log('⚠️  All tests failed - check testnet node configuration');
    console.log('\nTroubleshooting:');
    console.log('  1. Verify node is running Enable-Data-Subnetwork branch');
    console.log('  2. Check node logs: docker logs htnd-testnet-node');
    console.log('  3. Ensure UTXO index is enabled (--utxoindex flag)\n');
  }

  // Cleanup
  client.disconnect();
  console.log('✅ Disconnected from testnet node\n');
}

// Run example
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
