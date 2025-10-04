# @hoosat/node-sdk

[![npm version](https://badge.fury.io/js/@hoosat%2Fnode-sdk.svg)](https://badge.fury.io/js/@hoosat%2Fnode-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive TypeScript SDK for communicating with [Hoosat](https://hoosat.fi) nodes via gRPC. This SDK provides full access to the Hoosat network, including real-time updates, transaction management, and blockchain data retrieval.

## ✨ Features

- 🔗 **Full Node Integration** - Connect to any Hoosat node
- 📡 **Real-time Updates** - Stream UTXO changes and network events
- 💰 **Wallet Functions** - Balance checking, UTXO management, transaction creation
- 🔒 **Type Safety** - Full TypeScript support with comprehensive type definitions
- 📊 **Network Analytics** - Hashrate estimation, supply metrics, DAG information
- 🛡️ **Input Validation** - Built-in parameter validation and error handling
- 📖 **Rich Documentation** - Extensive JSDoc comments with examples

## 📦 Installation

```bash
npm install @hoosat/node-sdk
```

```bash
yarn add @hoosat/node-sdk
```

```bash
pnpm add @hoosat/node-sdk
```

## 🚀 Quick Start

```typescript
import { HoosatNode } from '@hoosat/node-sdk';

// Connect to a Hoosat node
const node = new HoosatNode({
  host: '127.0.0.1',  // Node hostname
  port: 42420,        // Node port
  timeout: 10000      // Request timeout (ms)
});

// Get node information
const info = await node.getInfo();
if (info.ok) {
  console.log('Node version:', info.result.serverVersion);
  console.log('Is synced:', info.result.isSynced);
  console.log('UTXO indexed:', info.result.isUtxoIndexed);
}

// Check an address balance
const balance = await node.getBalance('hoosat:qz7ulu...');
if (balance.ok) {
  console.log('Balance:', node.formatAmount(balance.result.balance), 'HTN');
}

// Get network statistics
const hashrate = await node.estimateNetworkHashesPerSecond();
const supply = await node.getCoinSupply();
const dagInfo = await node.getBlockDagInfo();
```

## 📚 API Reference

### Node Information

#### `getInfo(): Promise<BaseResult<GetInfo>>`
Get basic node information including version, sync status, and capabilities.

```typescript
const info = await node.getInfo();
if (info.ok) {
  console.log('Version:', info.result.serverVersion);
  console.log('Synced:', info.result.isSynced);
  console.log('UTXO Indexed:', info.result.isUtxoIndexed);
  console.log('Mempool Size:', info.result.mempoolSize);
}
```

#### `getCurrentNetwork(): Promise<BaseResult<GetCurrentNetwork>>`
Get the network name the node is running on.

```typescript
const network = await node.getCurrentNetwork();
console.log('Network:', network.result.currentNetwork); // "mainnet", "testnet", etc.
```

#### `getConnectedPeerInfo(): Promise<BaseResult<GetConnectedPeerInfo>>`
Get information about connected peers.

```typescript
const peers = await node.getConnectedPeerInfo();
console.log('Connected peers:', peers.result.peers.length);
```

### Blockchain Data

#### `getBlockDagInfo(): Promise<BaseResult<GetBlockDagInfo>>`
Get general information about the blockchain state.

```typescript
const dag = await node.getBlockDagInfo();
if (dag.ok) {
  console.log('Network:', dag.result.networkName);
  console.log('Blocks:', dag.result.blockCount);
  console.log('Difficulty:', dag.result.difficulty);
  console.log('Virtual DAA Score:', dag.result.virtualDaaScore);
}
```

#### `getBlock(hash: string, includeTransactions?: boolean): Promise<BaseResult<GetBlock>>`
Get detailed information about a specific block.

```typescript
const block = await node.getBlock('a1b2c3d4...', true);
if (block.ok) {
  console.log('Block timestamp:', block.result.header.timestamp);
  console.log('Transactions:', block.result.transactions.length);
}
```

#### `getSelectedTipHash(): Promise<BaseResult<GetSelectedTipHash>>`
Get the hash of the current blockchain tip.

```typescript
const tip = await node.getSelectedTipHash();
console.log('Current tip:', tip.result.selectedTipHash);
```

#### `getBlockCount(): Promise<string>`
Get the total number of blocks (convenience method).

```typescript
const count = await node.getBlockCount();
console.log('Total blocks:', count);
```

### Address & Balance Operations

⚠️ **Requires `--utxoindex` flag** when starting the node.

#### `getBalance(address: string): Promise<BaseResult<GetBalanceByAddress>>`
Get balance for a single address.

```typescript
const balance = await node.getBalance('hoosat:qz7ulu...');
if (balance.ok) {
  const htn = node.formatAmount(balance.result.balance);
  console.log(`Balance: ${htn} HTN`);
}
```

#### `getBalances(addresses: string[]): Promise<BaseResult<GetBalancesByAddresses>>`
Get balances for multiple addresses efficiently.

```typescript
const balances = await node.getBalances([
  'hoosat:qz7ulu...',
  'hoosat:qq8xdv...'
]);

if (balances.ok) {
  const total = balances.result.balances.reduce((sum, item) => 
    sum + BigInt(item.balance), 0n);
  console.log('Total portfolio:', node.formatAmount(total), 'HTN');
}
```

#### `getUtxosByAddresses(addresses: string[]): Promise<BaseResult<GetUtxosByAddresses>>`
Get all UTXOs for specific addresses.

```typescript
const utxos = await node.getUtxosByAddresses(['hoosat:qz7ulu...']);
if (utxos.ok) {
  console.log('Available UTXOs:', utxos.result.utxos.length);
  
  utxos.result.utxos.forEach(utxo => {
    console.log(`UTXO: ${node.formatAmount(utxo.utxoEntry.amount)} HTN`);
    console.log(`TX: ${utxo.outpoint.transactionId}`);
  });
}
```

### Transaction Operations

#### `getMempoolEntries(): Promise<BaseResult<GetMempoolEntries>>`
Get all transactions currently in the mempool.

```typescript
const mempool = await node.getMempoolEntries();
if (mempool.ok) {
  console.log('Mempool size:', mempool.result.entries.length);
  
  const totalFees = mempool.result.entries.reduce((sum, entry) => 
    sum + BigInt(entry.fee || '0'), 0n);
  console.log('Total fees:', node.formatAmount(totalFees), 'HTN');
}
```

#### `getMempoolEntriesByAddresses(addresses: string[]): Promise<BaseResult<GetMempoolEntriesByAddresses>>`
Get pending transactions for specific addresses.

```typescript
const pending = await node.getMempoolEntriesByAddresses([
  'hoosat:qz7ulu...'
]);

if (pending.ok) {
  pending.result.entries.forEach(entry => {
    console.log(`Address: ${entry.address}`);
    console.log(`Sending: ${entry.sending.length} transactions`);
    console.log(`Receiving: ${entry.receiving.length} transactions`);
  });
}
```

#### `submitTransaction(transaction: Transaction): Promise<BaseResult<SubmitTransaction>>`
Submit a signed transaction to the network.

```typescript
const transaction = {
  version: 1,
  inputs: [/* ... */],
  outputs: [/* ... */],
  lockTime: '0',
  subnetworkId: '0000000000000000000000000000000000000000'
};

const result = await node.submitTransaction(transaction);
if (result.ok) {
  console.log('Transaction ID:', result.result.transactionId);
}
```

### Network Analytics

#### `estimateNetworkHashesPerSecond(windowSize?: number): Promise<BaseResult<EstimateNetworkHashesPerSecond>>`
Estimate the network hash rate.

```typescript
const hashrate = await node.estimateNetworkHashesPerSecond(2000);
if (hashrate.ok) {
  const rate = parseFloat(hashrate.result.networkHashesPerSecond);
  const rateGH = (rate / 1e9).toFixed(2);
  console.log(`Network hashrate: ${rateGH} GH/s`);
}
```

#### `getCoinSupply(): Promise<BaseResult<GetCoinSupply>>`
Get coin supply information.

```typescript
const supply = await node.getCoinSupply();
if (supply.ok) {
  const circulating = node.formatAmount(supply.result.circulatingSupply);
  const max = node.formatAmount(supply.result.maxSupply);
  
  console.log(`Circulating: ${circulating} HTN`);
  console.log(`Max supply: ${max} HTN`);
  
  const percentage = (BigInt(supply.result.circulatingSupply) * 100n) / 
                    BigInt(supply.result.maxSupply);
  console.log(`Issued: ${percentage}%`);
}
```

## 🔄 Real-time Updates (Streaming)

The SDK supports real-time UTXO change notifications:

```typescript
// Subscribe to UTXO changes for specific addresses
await node.subscribeToUtxoChanges([
  'hoosat:qz7ulu...',
  'hoosat:qq8xdv...'
]);

// Listen for UTXO changes
node.on('utxoChanged', (change) => {
  console.log(`UTXO change for ${change.address}`);
  
  // New UTXOs (incoming payments)
  change.changes.added.forEach(utxo => {
    const amount = node.formatAmount(utxo.amount);
    console.log(`✅ Received: ${amount} HTN`);
  });
  
  // Spent UTXOs (outgoing payments)
  change.changes.removed.forEach(utxo => {
    const amount = node.formatAmount(utxo.amount);
    console.log(`❌ Spent: ${amount} HTN`);
  });
});

// Listen for streaming events
node.on('streamingError', (error) => {
  console.error('Streaming error:', error);
});

node.on('streamReconnected', () => {
  console.log('Streaming reconnected');
});

// Check streaming status
if (node.isStreamingConnected()) {
  console.log('Streaming is active');
  console.log('Subscribed addresses:', node.getSubscribedAddresses());
}

// Unsubscribe when done
await node.unsubscribeFromUtxoChanges();
```

## 🛠 Utility Functions

### Address Validation

```typescript
if (node.isValidAddress('hoosat:qz7ulu...')) {
  console.log('Valid Hoosat address');
}
```

### Amount Conversion

```typescript
// Convert sompi to HTN
const htn = node.formatAmount('100000000'); // '1.00000000'

// Convert HTN to sompi
const sompi = node.parseAmount('1.5'); // '150000000'
```

### Transaction History

```typescript
// Get all transactions for an address (UTXOs + pending)
const transactions = await node.getTransactionsByAddress('hoosat:qz7ulu...');

transactions.forEach(tx => {
  console.log(`${tx.type}: ${tx.transactionId}`);
  if (tx.type === 'confirmed') {
    console.log(`Amount: ${node.formatAmount(tx.amount)} HTN`);
  }
});
```

## ⚙️ Configuration

### Node Configuration

```typescript
const node = new HoosatNode({
  host: '54.38.176.95',     // Remote node
  port: 42420,              // Default Hoosat port
  timeout: 15000            // 15 second timeout
});

// Get connection info
const config = node.getConnectionInfo();
console.log(`Connected to ${config.host}:${config.port}`);
```

### Node Requirements

For full functionality, start your Hoosat node with:

```bash
# Enable UTXO indexing (required for balance/UTXO operations)
htnd --utxoindex

# Enable specific RPC endpoints
htnd --utxoindex --rpclisten=0.0.0.0:42420
```

## 🚨 Error Handling

All methods return a `BaseResult<T>` object with standardized error handling:

```typescript
const result = await node.getBalance('hoosat:invalid');

if (result.ok) {
  // Success - use result.result
  console.log('Balance:', result.result.balance);
} else {
  // Error - check result.error
  console.error('Error:', result.error);
  
  // Handle specific errors
  if (result.error.includes('utxoindex')) {
    console.log('💡 Start node with --utxoindex flag');
  }
}
```

### Common Error Scenarios

| Error | Cause | Solution |
|-------|--------|----------|
| `utxoindex not available` | Node started without `--utxoindex` | Restart node with `--utxoindex` flag |
| `Request timeout` | Node unresponsive or slow network | Increase timeout in config |
| `Invalid address format` | Malformed Hoosat address | Validate address format |
| `Connection refused` | Node not running or wrong port | Check node status and configuration |

## 📊 Examples

### Wallet Balance Monitor

```typescript
import { HoosatNode } from '@hoosat/node-sdk';

const node = new HoosatNode({ host: 'your-node-host' });

async function monitorWallet(addresses: string[]) {
  // Get initial balances
  const balances = await node.getBalances(addresses);
  console.log('Initial balances:', balances.result?.balances);
  
  // Subscribe to real-time updates
  await node.subscribeToUtxoChanges(addresses);
  
  node.on('utxoChanged', (change) => {
    console.log(`💰 Balance change for ${change.address}`);
    // Refresh balance display in your UI
  });
}
```

### Network Statistics Dashboard

```typescript
async function getNetworkStats() {
  const [info, dag, supply, hashrate] = await Promise.all([
    node.getInfo(),
    node.getBlockDagInfo(),
    node.getCoinSupply(),
    node.estimateNetworkHashesPerSecond()
  ]);
  
  return {
    version: info.result?.serverVersion,
    blockCount: dag.result?.blockCount,
    difficulty: dag.result?.difficulty,
    hashrate: hashrate.result?.networkHashesPerSecond,
    circulatingSupply: supply.result?.circulatingSupply
  };
}
```

### Transaction Builder Helper

```typescript
async function prepareTransaction(fromAddress: string, toAddress: string, amount: string) {
  // Get available UTXOs
  const utxos = await node.getUtxosByAddresses([fromAddress]);
  if (!utxos.ok) throw new Error('Failed to get UTXOs');
  
  // Select UTXOs for transaction
  const targetAmount = BigInt(node.parseAmount(amount));
  const selectedUtxos = selectUtxosForAmount(utxos.result.utxos, targetAmount);
  
  if (selectedUtxos.length === 0) {
    throw new Error('Insufficient funds');
  }
  
  // Calculate total input amount
  const totalInput = selectedUtxos.reduce((sum, utxo) => 
    sum + BigInt(utxo.utxoEntry.amount), 0n);
  
  const fee = 1000n; // 1000 sompi fee
  const change = totalInput - targetAmount - fee;
  
  console.log(`Sending: ${node.formatAmount(targetAmount)} HTN`);
  console.log(`Fee: ${node.formatAmount(fee)} HTN`);
  console.log(`Change: ${node.formatAmount(change)} HTN`);
  
  return {
    inputs: selectedUtxos.map(utxo => utxo.outpoint),
    totalInput,
    targetAmount,
    fee,
    change
  };
}
```

## 🔧 Troubleshooting

### Common Issues

**Q: Getting "utxoindex not available" error**  
A: Start your node with the `--utxoindex` flag:
```bash
htnd --utxoindex
```

**Q: Connection timeout errors**  
A: Increase the timeout in your configuration:
```typescript
const node = new HoosatNode({ timeout: 30000 }); // 30 seconds
```

**Q: "Invalid address format" errors**  
A: Ensure addresses start with `hoosat:` and are properly formatted:
```typescript
if (!node.isValidAddress(address)) {
  throw new Error('Invalid address format');
}
```

**Q: Streaming disconnects frequently**  
A: The SDK automatically reconnects. Listen for reconnection events:
```typescript
node.on('streamReconnected', () => {
  console.log('Streaming reconnected successfully');
});
```

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
// Add debug event listeners
node.on('streamingError', console.error);
node.on('streamEnded', () => console.log('Stream ended'));
node.on('streamClosed', () => console.log('Stream closed'));
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Setup

```bash
git clone https://github.com/Namp88/hoosat-node-sdk.git
cd hoosat-node-sdk
npm install
npm run build
```

### Running Tests

```bash
# Run specific test
npm run test:get-info
npm run test:wallet-balances
npm run test:network-hashrate
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Hoosat Official Website](https://hoosat.fi)
- [GitHub Repository](https://github.com/Namp88/hoosat-node-sdk)
- [NPM Package](https://www.npmjs.com/package/@hoosat/node-sdk)
- [Issues & Support](https://github.com/Namp88/hoosat-node-sdk/issues)

## 📈 Roadmap

- [ ] WebSocket support for better streaming performance
- [ ] Transaction building utilities
- [ ] Address generation helpers
- [ ] Browser compatibility layer
- [ ] React hooks for easy integration
- [ ] Advanced caching mechanisms

---

**Made with ❤️ for the Hoosat community**