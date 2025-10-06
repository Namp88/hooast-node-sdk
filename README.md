# @hoosat/sdk

[![npm version](https://badge.fury.io/js/@hoosat%2Fnode-sdk.svg)](https://badge.fury.io/js/@hoosat%2Fnode-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Comprehensive TypeScript SDK for [Hoosat](https://hoosat.fi) blockchain. Full-featured toolkit for building production-ready applications with robust error handling, real-time monitoring, and advanced transaction management.

## ✨ Features

### Core Functionality
- 🔗 **Full Node Integration** - Connect to any Hoosat node via gRPC
- 🔐 **Cryptographic Utilities** - Key generation, address creation, transaction signing
- 🏗️ **Transaction Builder** - Intuitive API with automatic fee calculation
- 📊 **Network Analytics** - Block data, mempool analysis, hashrate estimation
- 💰 **Balance & UTXO Management** - Query balances, manage UTXOs efficiently

### Advanced Features
- 📡 **Real-time Streaming** - Subscribe to UTXO changes with automatic reconnection
- 🎯 **Dynamic Fee Estimation** - Network-aware fee recommendations
- 🔄 **UTXO Selection Strategies** - Optimize fees and privacy
- 📦 **Batch Payments** - Send to multiple recipients efficiently
- ⚡ **UTXO Consolidation** - Optimize wallet structure

### Production-Ready
- 🛡️ **Spam Protection Compliance** - Built-in limits (max 2 recipients per tx)
- ⚠️ **Comprehensive Error Handling** - Robust error categorization and recovery
- 🔄 **Retry Strategies** - Exponential backoff, circuit breaker patterns
- 📈 **Network Monitoring** - Real-time statistics and health checks
- 🔒 **Type Safety** - Full TypeScript support with comprehensive types

## 📦 Installation

```bash
npm install @hoosat/sdk
```

## 🚀 Quick Start

### Connect to Node

```typescript
import { HoosatNode } from '@hoosat/sdk';

const node = new HoosatNode({
  host: '54.38.176.95',
  port: 42420,
  timeout: 10000
});

// Check node status
const info = await node.getInfo();
if (info.ok) {
  console.log('Connected to', info.result.serverVersion);
  console.log('Network:', info.result.networkName);
  console.log('Synced:', info.result.isSynced);
}
```

### Generate Wallet

```typescript
import { HoosatCrypto } from '@hoosat/sdk';

// Generate new keypair
const wallet = HoosatCrypto.generateKeyPair();
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey.toString('hex'));

// Import existing wallet
const imported = HoosatCrypto.importKeyPair('your_private_key_hex');
```

### Check Balance

```typescript
import { HoosatUtils } from '@hoosat/sdk';

const result = await node.getBalance('hoosat:qz7ulu...');
if (result.ok) {
  const balanceHTN = HoosatUtils.sompiToAmount(result.result.balance);
  console.log('Balance:', balanceHTN, 'HTN');
}
```

### Build & Send Transaction

```typescript
import { TransactionBuilder, FeeEstimator, FeePriority } from '@hoosat/sdk';

// Estimate fee
const feeEstimator = new FeeEstimator(node);
const feeEstimate = await feeEstimator.estimateFee(
  FeePriority.Normal,
  1, // inputs
  2  // outputs (recipient + change)
);

// Build transaction
const builder = new TransactionBuilder();
builder.addInput(utxo, privateKey);
builder.addOutput('hoosat:qz7ulu...', '100000000'); // 1 HTN
builder.setFee(feeEstimate.totalFee);
builder.addChangeOutput(wallet.address);

const signedTx = builder.sign();

// Submit to network
const result = await node.submitTransaction(signedTx);
if (result.ok) {
  console.log('Transaction ID:', result.result.transactionId);
}
```

### Real-time Balance Monitoring

```typescript
// Subscribe to UTXO changes
await node.subscribeToUtxoChanges(['hoosat:qz7ulu...']);

node.on('utxoChange', async (notification) => {
  console.log('Added UTXOs:', notification.added.length);
  console.log('Removed UTXOs:', notification.removed.length);
  
  // Update balance
  const balance = await node.getBalance('hoosat:qz7ulu...');
  console.log('New balance:', HoosatUtils.sompiToAmount(balance.result.balance), 'HTN');
});
```

## 🛡️ Spam Protection

Hoosat inherits **anti-dust-attack protection** from Kaspa. Transactions are limited to:
- **Maximum 2 recipient outputs** per transaction
- **Total 3 outputs** (2 recipients + 1 change)

This is a **hardcoded network rule** to prevent spam attacks.

```typescript
// ✅ Valid - 2 recipients
builder.addOutput('recipient1', '100000000');
builder.addOutput('recipient2', '50000000');
builder.addChangeOutput(wallet.address); // 3 outputs total

// ❌ Invalid - 3 recipients will throw error
builder.addOutput('recipient1', '100000000');
builder.addOutput('recipient2', '50000000');
builder.addOutput('recipient3', '25000000'); // Error!
```

**For batch payments to 3+ recipients:**
- Send multiple transactions (2 recipients each)
- See `examples/advanced/02-multi-recipient-batching.ts`

## 📋 Examples

We provide **37+ comprehensive examples** covering all aspects of the SDK:

### Address & Balance (3 examples)
```bash
npm run example:address:balance              # Check single address balance
npm run example:address:balances-multiple    # Check multiple addresses
npm run example:address:utxos                # Fetch and analyze UTXOs
```

### Cryptography (4 examples)
```bash
npm run example:crypto:generate-keypair      # Generate new wallet
npm run example:crypto:import-keypair        # Import existing wallet
npm run example:crypto:address-types         # Address format examples
npm run example:crypto:hashing               # Cryptographic hashing
```

### Node Operations (4 examples)
```bash
npm run example:node:connect                 # Connect and get node info
npm run example:node:blockchain-info         # Blockchain statistics
npm run example:node:blocks                  # Query block data
npm run example:node:mempool                 # Analyze mempool
```

### Real-time Streaming (1 example)
```bash
npm run example:streaming:subscribe-utxos    # Real-time UTXO monitoring
```

### Transaction Management (9 examples)
```bash
npm run example:transaction:build-simple           # Basic transaction
npm run example:transaction:build-with-change      # Automatic change handling
npm run example:transaction:multiple-inputs        # Multiple inputs
npm run example:transaction:estimate-fee           # Dynamic fee estimation
npm run example:transaction:send-real              # Send real transaction
npm run example:transaction:dynamic-fees           # Network-aware fees
npm run example:transaction:send-real-batch        # Batch payment (2 recipients)
npm run example:transaction:consolidate-utxos      # UTXO consolidation
npm run example:transaction:split-utxo             # Split UTXO
```

### Error Handling (3 examples)
```bash
npm run example:error-handling:network-errors      # Network error handling
npm run example:error-handling:transaction-errors  # Transaction error handling
npm run example:error-handling:retry-strategies    # Retry patterns
```

### Monitoring (2 examples)
```bash
npm run example:monitoring:track-balance-changes   # Real-time balance tracking
npm run example:monitoring:network-stats           # Network statistics
```

### Advanced (2 examples)
```bash
npm run example:advanced:multi-recipient-batching  # Batch payments (3+ recipients)
npm run example:advanced:utxo-selection-strategy   # Coin selection algorithms
```

### Utilities (3 examples)
```bash
npm run example:utils:amount-conversion            # Amount conversions
npm run example:utils:validation                   # Input validation
npm run example:utils:formatting                   # Pretty formatting
```

## 🔧 Core API Reference

### HoosatNode

Main class for node communication:

```typescript
const node = new HoosatNode({
  host: string,
  port: number,
  timeout?: number  // default: 10000ms
});

// Node information
await node.getInfo()
await node.getBlockCount()
await node.getCurrentNetwork()
await node.getConnectedPeerInfo()

// Blockchain queries
await node.getBlock(blockHash, includeTransactions?)
await node.getBlocks(lowHash, includeTransactions?)
await node.getSelectedTipHash()

// Address operations
await node.getBalance(address)
await node.getUtxosByAddresses(addresses)

// Transaction operations
await node.submitTransaction(transaction)
await node.getMempoolEntry(txId)
await node.getMempoolEntries(includeOrphanPool?, filterTransactionPool?)

// Real-time streaming
await node.subscribeToUtxoChanges(addresses)
await node.unsubscribeFromUtxoChanges(addresses?)
node.on('utxoChange', (notification) => { /* ... */ })
node.on('error', (error) => { /* ... */ })
node.on('disconnect', () => { /* ... */ })

// Cleanup
node.disconnect()
```

### HoosatCrypto

Cryptographic operations:

```typescript
// Key generation
HoosatCrypto.generateKeyPair() // Returns { address, publicKey, privateKey }
HoosatCrypto.importKeyPair(privateKeyHex)

// Address operations
HoosatCrypto.publicKeyToAddressECDSA(publicKey)
HoosatCrypto.addressToScriptPublicKey(address)

// Transaction operations
HoosatCrypto.getTransactionId(transaction)
HoosatCrypto.signTransaction(transaction, privateKey, sighashType?)
HoosatCrypto.calculateFee(inputs, outputs, feeRate)

// Hashing
HoosatCrypto.blake3Hash(data)
```

### HoosatUtils

Utility functions:

```typescript
// Amount conversion
HoosatUtils.amountToSompi(amount: string): string
HoosatUtils.sompiToAmount(sompi: string | bigint): string

// Validation
HoosatUtils.isValidAddress(address: string): boolean
HoosatUtils.isValidAddresses(addresses: string[]): boolean
HoosatUtils.isValidPrivateKey(privateKey: string): boolean
HoosatUtils.isValidPublicKey(publicKey: string): boolean

// Formatting
HoosatUtils.formatAmount(amount: string): string
HoosatUtils.truncateHash(hash: string): string
HoosatUtils.truncateAddress(address: string): string
```

### TransactionBuilder

Build and sign transactions:

```typescript
const builder = new TransactionBuilder({ debug?: boolean });

// Add inputs and outputs
builder.addInput(utxo: UtxoForSigning, privateKey?: Buffer)
builder.addOutput(address: string, amount: string)
builder.addChangeOutput(changeAddress: string)  // Automatic calculation
builder.addOutputRaw(output: TransactionOutput) // Bypass validation

// Set parameters
builder.setFee(fee: string)
builder.setLockTime(lockTime: string)

// Build and sign
const unsignedTx = builder.build()
const signedTx = builder.sign(privateKey?)

// Validation
builder.validate()
```

### FeeEstimator

Dynamic fee estimation:

```typescript
const estimator = new FeeEstimator(node);

// Get recommendations for all priority levels
const recommendations = await estimator.getRecommendations();
console.log('Low:', recommendations.low.feeRate, 'sompi/byte');
console.log('Normal:', recommendations.normal.feeRate, 'sompi/byte');
console.log('High:', recommendations.high.feeRate, 'sompi/byte');
console.log('Urgent:', recommendations.urgent.feeRate, 'sompi/byte');

// Estimate fee for specific transaction
const estimate = await estimator.estimateFee(
  FeePriority.Normal,
  numInputs,
  numOutputs
);
console.log('Total fee:', estimate.totalFee, 'sompi');

// Cache management
estimator.clearCache()
estimator.setCacheDuration(milliseconds)
```

## 🔄 Error Handling

All SDK methods return a standardized result:

```typescript
interface BaseResult<T> {
  ok: boolean;
  result?: T;
  error?: string;
}

// Always check result.ok before accessing data
const result = await node.getBalance('hoosat:qz7ulu...');

if (result.ok) {
  // Success - safe to access result.result
  console.log('Balance:', result.result.balance);
} else {
  // Error - handle gracefully
  console.error('Error:', result.error);
  
  // Categorize errors
  if (result.error.includes('timeout')) {
    console.log('Node timeout - increase timeout or check connection');
  } else if (result.error.includes('utxoindex')) {
    console.log('Node requires --utxoindex flag');
  }
}
```

### Common Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| `utxoindex not available` | Node without `--utxoindex` | Restart node with flag |
| `DEADLINE_EXCEEDED` | Request timeout | Increase timeout value |
| `ECONNREFUSED` | Node not running | Check node status and config |
| `Invalid address format` | Malformed address | Validate with `HoosatUtils.isValidAddress()` |
| `Insufficient balance` | Not enough funds | Check balance before transaction |
| `spam` / `too many outputs` | 3+ recipients | Limit to 2 recipients per tx |

See `examples/error-handling/` for comprehensive error handling patterns.

## 🎯 Production Best Practices

### 1. Always Validate Inputs

```typescript
// Validate addresses before building transaction
if (!HoosatUtils.isValidAddress(recipientAddress)) {
  throw new Error('Invalid recipient address');
}

// Check balance before attempting transaction
const balance = await node.getBalance(wallet.address);
if (BigInt(balance.result.balance) < requiredAmount) {
  throw new Error('Insufficient balance');
}
```

### 2. Use Dynamic Fee Estimation

```typescript
// Don't use static fees - query network conditions
const feeEstimator = new FeeEstimator(node);
const estimate = await feeEstimator.estimateFee(
  FeePriority.Normal,
  numInputs,
  numOutputs
);
builder.setFee(estimate.totalFee);
```

### 3. Implement Retry Logic

```typescript
// Use exponential backoff for transient failures
async function connectWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await node.getInfo();
    if (result.ok) return result;
    
    const delay = Math.min(1000 * Math.pow(2, i), 30000);
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error('Max retries exceeded');
}
```

See `examples/error-handling/03-retry-strategies.ts` for advanced patterns.

### 4. Handle Disconnections

```typescript
node.on('disconnect', async () => {
  console.log('Disconnected - attempting reconnect...');
  await reconnectLogic();
});

node.on('error', (error) => {
  console.error('Node error:', error);
  // Log for monitoring and debugging
});
```

### 5. Respect Rate Limits

```typescript
// Add delays between batch operations
for (const batch of batches) {
  await processTransaction(batch);
  await new Promise(r => setTimeout(r, 2000)); // 2s delay
}
```

## 📊 UTXO Management Strategies

### Consolidation (Reduce UTXO Count)

```typescript
// Combine many small UTXOs into one large UTXO
// Best for: Reducing future transaction fees
// See: examples/transaction/08-consolidate-utxos.ts

const builder = new TransactionBuilder();
for (const utxo of smallUtxos) {
  builder.addInput(utxo, privateKey);
}
builder.addOutput(wallet.address, totalAmount - fee);
```

### Splitting (Create Multiple UTXOs)

```typescript
// Split one large UTXO into multiple smaller ones
// Best for: Preparing for future batch payments
// See: examples/transaction/09-split-utxo.ts

builder.addInput(largeUtxo, privateKey);
builder.addOutput(wallet.address, amount1); // Split 1
builder.addOutput(wallet.address, amount2); // Split 2 (max 2)
builder.setFee(fee);
builder.addChangeOutput(wallet.address);
```

### Selection Strategies

- **Largest-First**: Minimize fees (fewer inputs)
- **Smallest-First**: Clean up dust (UTXO consolidation)
- **Random**: Enhance privacy (unpredictable pattern)
- **Branch-and-Bound**: Optimal (minimal change)

See `examples/advanced/03-utxo-selection-strategy.ts` for implementations.

## 🧪 Testing

```bash
# Build the project
npm run build

# Run examples
npm run example:node:connect
npm run example:transaction:build-simple
npm run example:error-handling:network-errors
```

## 🔧 Development

```bash
# Clone repository
git clone https://github.com/Namp88/hoosat-sdk.git
cd hoosat-sdk

# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Format code
npm run format
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Hoosat Official Website](https://hoosat.fi)
- [GitHub Repository](https://github.com/Namp88/hoosat-sdk)
- [NPM Package](https://www.npmjs.com/package/@hoosat/sdk)
- [Issues & Support](https://github.com/Namp88/hoosat-sdk/issues)

## 📞 Support

For questions and support:
- Open an issue on [GitHub](https://github.com/Namp88/hoosat-sdk/issues)
- Join Hoosat community channels
- Email: namp2988@gmail.com

## 🙏 Acknowledgments

Special thanks to:
- **Tonto** - Lead Hoosat developer for invaluable technical guidance and spam protection insights
- Hoosat core development team for building an amazing blockchain
- All contributors and community members who help improve this SDK

---

**Made with ❤️ for the Hoosat community**