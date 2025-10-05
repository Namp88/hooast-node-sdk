# @hoosat/sdk

[![npm version](https://badge.fury.io/js/@hoosat%2Fnode-sdk.svg)](https://badge.fury.io/js/@hoosat%2Fnode-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Comprehensive TypeScript SDK for communicating with [Hoosat](https://hoosat.fi) nodes via gRPC. Full access to blockchain data, real-time UTXO streaming, cryptographic utilities, and transaction building.

## ✨ Features

- 🔗 **Full Node Integration** - Connect to any Hoosat node via gRPC
- 📡 **Real-time Streaming** - Subscribe to UTXO changes with automatic reconnection
- 💰 **Wallet Operations** - Balance checking, UTXO management, address validation
- 🔐 **Cryptographic Utilities** - Key generation, address creation, signature verification
- 🏗️ **Transaction Building** - Build and sign transactions with TransactionBuilder
- 📊 **Network Analytics** - Hashrate estimation, supply metrics, DAG information
- 🔒 **Type Safety** - Full TypeScript support with comprehensive types
- 🛡️ **Input Validation** - Built-in parameter validation and error handling
- 📖 **Rich Documentation** - Extensive JSDoc comments and examples

## 📦 Installation

```bash
npm install @hoosat/sdk
```

## 🚀 Quick Start

```typescript
import { HoosatNode, HoosatUtils } from '@hoosat/sdk';

// Connect to node
const node = new HoosatNode({
  host: '54.38.176.95',
  port: 42420,
  timeout: 10000
});

// Check node status
const info = await node.getInfo();
console.log('Version:', info.result.serverVersion);
console.log('Synced:', info.result.isSynced);

// Check balance
const balance = await node.getBalance('hoosat:qz7ulu...');
console.log('Balance:', HoosatUtils.sompiToAmount(balance.result.balance), 'HTN');

// Get UTXOs
const utxos = await node.getUtxosByAddresses(['hoosat:qz7ulu...']);
console.log('UTXOs:', utxos.result.utxos.length);
```

## 📚 Core Modules

### HoosatNode - Node Client

Main class for interacting with Hoosat nodes.

```typescript
const node = new HoosatNode({
  host: '127.0.0.1',
  port: 42420,
  timeout: 15000
});
```

### HoosatCrypto - Cryptographic Utilities

Generate keys, create addresses, sign transactions.

```typescript
import { HoosatCrypto } from '@hoosat/sdk';

// Generate new keypair
const wallet = HoosatCrypto.generateKeyPair();
console.log('Address:', wallet.address);
console.log('Public Key:', wallet.publicKey.toString('hex'));

// Import from private key
const imported = HoosatCrypto.importKeyPair('your_private_key_hex');

// Create address from public key
const address = HoosatCrypto.publicKeyToAddressECDSA(publicKeyBuffer);

// Convert address to script
const script = HoosatCrypto.addressToScriptPublicKey('hoosat:qz7ulu...');
```

### HoosatUtils - Utility Functions

Helper functions for common operations.

```typescript
import { HoosatUtils } from '@hoosat/sdk';

// Convert sompi to HTN
const htn = HoosatUtils.sompiToAmount('100000000'); // "1.00000000"

// Convert HTN to sompi
const sompi = HoosatUtils.amountToSompi('1.5'); // "150000000"

// Validate address
if (HoosatUtils.isValidAddress('hoosat:qz7ulu...')) {
  console.log('Valid address');
}
```

## 🔌 Node Information Methods

### Get Node Info

```typescript
const info = await node.getInfo();
console.log('Version:', info.result.serverVersion);
console.log('Synced:', info.result.isSynced);
console.log('UTXO Indexed:', info.result.isUtxoIndexed);
console.log('Mempool:', info.result.mempoolSize, 'transactions');
```

### Get Network

```typescript
const network = await node.getCurrentNetwork();
console.log('Network:', network.result.currentNetwork);
```

### Get Connected Peers

```typescript
const peers = await node.getConnectedPeerInfo();
console.log('Peers:', peers.result.peers.length);
peers.result.peers.forEach(peer => {
  console.log(`- ${peer.address} (${peer.userAgent})`);
});
```

## 📊 Blockchain Methods

### Get Block DAG Info

```typescript
const dag = await node.getBlockDagInfo();
console.log('Network:', dag.result.networkName);
console.log('Blocks:', dag.result.blockCount);
console.log('Difficulty:', dag.result.difficulty);
console.log('Virtual DAA Score:', dag.result.virtualDaaScore);
```

### Get Specific Block

```typescript
const block = await node.getBlock('block_hash_here', true);
console.log('Block time:', block.result.header.timestamp);
console.log('Transactions:', block.result.transactions.length);
```

### Get Block Count

```typescript
const count = await node.getBlockCount();
console.log('Blocks:', count.result.blockCount);
console.log('Headers:', count.result.headerCount);
```

## 💰 Balance & UTXO Methods

⚠️ **Requires `--utxoindex` flag** when starting the node.

### Get Balance

```typescript
const balance = await node.getBalance('hoosat:qz7ulu...');
const htn = HoosatUtils.sompiToAmount(balance.result.balance);
console.log('Balance:', htn, 'HTN');
```

### Get Multiple Balances

```typescript
const balances = await node.getBalances([
  'hoosat:qz7ulu...',
  'hoosat:qq8xdv...'
]);

const total = balances.result.balances.reduce(
  (sum, b) => sum + BigInt(b.balance), 0n
);
console.log('Total:', HoosatUtils.sompiToAmount(total), 'HTN');
```

### Get UTXOs

```typescript
const utxos = await node.getUtxosByAddresses(['hoosat:qz7ulu...']);
console.log('Available UTXOs:', utxos.result.utxos.length);

utxos.result.utxos.forEach(utxo => {
  const amount = HoosatUtils.sompiToAmount(utxo.utxoEntry.amount);
  console.log(`- ${amount} HTN (${utxo.outpoint.transactionId})`);
});
```

## 📨 Mempool Methods

### Get All Mempool Entries

```typescript
const mempool = await node.getMempoolEntries();
console.log('Pending transactions:', mempool.result.entries.length);

const totalFees = mempool.result.entries.reduce(
  (sum, entry) => sum + BigInt(entry.fee || '0'), 0n
);
console.log('Total fees:', HoosatUtils.sompiToAmount(totalFees), 'HTN');
```

### Get Mempool Entry by TX ID

```typescript
const entry = await node.getMempoolEntry('tx_id_here');
if (entry.result.transaction) {
  console.log('TX ID:', entry.result.transaction.transactionId);
  console.log('Fee:', HoosatUtils.sompiToAmount(entry.result.fee), 'HTN');
}
```

### Get Pending Transactions for Address

```typescript
const pending = await node.getMempoolEntriesByAddresses([
  'hoosat:qz7ulu...'
]);

pending.result.entries.forEach(entry => {
  console.log(`Address: ${entry.address}`);
  console.log(`Sending: ${entry.sending.length} transactions`);
  console.log(`Receiving: ${entry.receiving.length} transactions`);
});
```

## 📈 Network Analytics

### Estimate Network Hashrate

```typescript
const hashrate = await node.estimateNetworkHashesPerSecond(2000);
const rate = parseFloat(hashrate.result.networkHashesPerSecond);
const gh = (rate / 1e9).toFixed(2);
console.log('Hashrate:', gh, 'GH/s');
```

### Get Coin Supply

```typescript
const supply = await node.getCoinSupply();
const circulating = HoosatUtils.sompiToAmount(supply.result.circulatingSupply);
const max = HoosatUtils.sompiToAmount(supply.result.maxSupply);

console.log('Circulating:', circulating, 'HTN');
console.log('Max:', max, 'HTN');

const percentage = (BigInt(supply.result.circulatingSupply) * 100n) / 
                   BigInt(supply.result.maxSupply);
console.log('Issued:', percentage + '%');
```

### Get Virtual Blue Score

```typescript
const blueScore = await node.getVirtualSelectedParentBlueScore();
console.log('Blue Score:', blueScore.result.blueScore);
```

## 🔄 Real-time UTXO Streaming

Subscribe to UTXO changes for specific addresses and receive real-time updates.

### Basic Subscription

```typescript
// Subscribe to addresses
await node.subscribeToUtxoChanges([
  'hoosat:qz7ulu...',
  'hoosat:qq8xdv...'
]);

// Listen for UTXO changes
node.on('utxoChanged', (change) => {
  console.log(`Change for ${change.address}`);
  
  // New UTXOs (incoming payments)
  change.changes.added.forEach(utxo => {
    const amount = HoosatUtils.sompiToAmount(utxo.amount);
    console.log(`✅ Received: ${amount} HTN`);
  });
  
  // Spent UTXOs (outgoing payments)
  change.changes.removed.forEach(utxo => {
    const amount = HoosatUtils.sompiToAmount(utxo.amount);
    console.log(`❌ Spent: ${amount} HTN`);
  });
});

// Listen for all UTXO changes
node.on('utxosChanged', (changes) => {
  console.log('Total changes:', 
    changes.added.length + changes.removed.length);
});
```

### Streaming Events

```typescript
// Connection events
node.on('streamingError', (error) => {
  console.error('Streaming error:', error);
});

node.on('streamReconnected', () => {
  console.log('Streaming reconnected successfully');
});

node.on('streamMaxReconnectAttemptsReached', () => {
  console.error('Max reconnection attempts reached');
});

// Check connection status
if (node.isStreamingConnected()) {
  console.log('Streaming active');
  const subscribed = node.getSubscribedAddresses();
  console.log('Monitoring', subscribed.length, 'addresses');
}
```

### Unsubscribe

```typescript
// Unsubscribe from specific addresses
await node.unsubscribeFromUtxoChanges(['hoosat:qz7ulu...']);

// Unsubscribe from all
await node.unsubscribeFromUtxoChanges();
```

### Complete Streaming Example

```typescript
import { HoosatNode, HoosatUtils } from '@hoosat/sdk';

const node = new HoosatNode({ host: '127.0.0.1', port: 42420 });

async function monitorWallet(addresses: string[]) {
  // Subscribe
  await node.subscribeToUtxoChanges(addresses);
  console.log('✅ Monitoring', addresses.length, 'addresses');
  
  // Handle changes
  node.on('utxoChanged', (change) => {
    const added = change.changes.added.length;
    const removed = change.changes.removed.length;
    
    if (added > 0) {
      const total = change.changes.added.reduce(
        (sum, utxo) => sum + BigInt(utxo.amount), 0n
      );
      console.log(`📥 Received: ${HoosatUtils.sompiToAmount(total)} HTN`);
    }
    
    if (removed > 0) {
      console.log(`📤 ${removed} UTXOs spent`);
    }
  });
  
  // Handle reconnection
  node.on('streamReconnected', () => {
    console.log('🔄 Connection restored');
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Stopping...');
    await node.unsubscribeFromUtxoChanges();
    node.disconnect();
    process.exit(0);
  });
}

// Start monitoring
monitorWallet(['hoosat:qz7ulu...', 'hoosat:qq8xdv...']).catch(console.error);
```

## 🔐 Cryptographic Operations

### Key Generation

```typescript
import { HoosatCrypto } from '@hoosat/sdk';

// Generate new keys
const wallet = HoosatCrypto.generateKeyPair();
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey.toString('hex'));
console.log('Public Key:', wallet.publicKey.toString('hex'));

// Import existing keys
const imported = HoosatCrypto.importKeyPair(
  'your_private_key_hex_here'
);
```

### Address Operations

```typescript
// Create ECDSA address (33-byte pubkey)
const ecdsaAddress = HoosatCrypto.publicKeyToAddressECDSA(publicKey);

// Create Schnorr address (32-byte pubkey)
const schnorrAddress = HoosatCrypto.publicKeyToAddress(publicKey);

// Convert address to ScriptPublicKey
const script = HoosatCrypto.addressToScriptPublicKey('hoosat:qz7ulu...');
console.log('Script:', script.toString('hex'));

// Validate address
if (HoosatUtils.isValidAddress(address)) {
  console.log('Valid Hoosat address');
}
```

### Hashing

```typescript
// Blake3 hash
const data = Buffer.from('Hello Hoosat');
const hash = HoosatCrypto.blake3Hash(data);

// Double Blake3 (for TX IDs)
const doubleHash = HoosatCrypto.doubleBlake3Hash(data);

// Blake3 keyed hash (for signatures)
const keyedHash = HoosatCrypto.blake3KeyedHash(
  'TransactionSigningHash', 
  data
);
```

### Transaction ID Calculation

```typescript
const transaction = {
  version: 0,
  inputs: [/* ... */],
  outputs: [/* ... */],
  lockTime: '0',
  subnetworkId: '0000000000000000000000000000000000000000',
  gas: '0',
  payload: ''
};

const txId = HoosatCrypto.getTransactionId(transaction);
console.log('Transaction ID:', txId);
```

## ⚙️ Configuration

### Node Configuration

```typescript
const node = new HoosatNode({
  host: '54.38.176.95',      // Node hostname
  port: 42420,               // Node port (default: 42420)
  timeout: 15000             // Request timeout in ms (default: 10000)
});

// Get connection info
const config = node.getClientInfo();
console.log(`Connected to ${config.host}:${config.port}`);
console.log(`Timeout: ${config.timeout}ms`);
```

### Node Requirements

For full functionality, start your Hoosat node with:

```bash
# Enable UTXO indexing (required for balance/UTXO operations)
htnd --utxoindex

# Enable RPC endpoints
htnd --utxoindex --rpclisten=0.0.0.0:42420
```

## 🚨 Error Handling

All methods return `BaseResult<T>` with standardized error handling:

```typescript
const result = await node.getBalance('hoosat:qz7ulu...');

if (result.ok) {
  // Success
  console.log('Balance:', result.result.balance);
} else {
  // Error
  console.error('Error:', result.error);
  
  // Handle specific errors
  if (result.error.includes('utxoindex')) {
    console.log('💡 Start node with --utxoindex flag');
  }
}
```

### Common Error Scenarios

| Error | Cause | Solution |
|-------|-------|----------|
| `utxoindex not available` | Node started without `--utxoindex` | Restart node with `--utxoindex` |
| `Request timeout` | Node unresponsive or slow network | Increase timeout in config |
| `Invalid address format` | Malformed Hoosat address | Validate address format |
| `Connection refused` | Node not running or wrong port | Check node status and config |

## 📋 Examples

Check the `examples/` folder for complete working examples:

- `get-info.ts` - Node information and health checks
- `wallet-balances.ts` - Balance checking and portfolio analysis
- `utxos-and-blue-score.ts` - UTXO management
- `network-hashrate.ts` - Network hashrate monitoring
- `pending-transactions-and-supply.ts` - Mempool and supply analysis
- `get-notify-utxos-changed-subscribe.ts` - Real-time UTXO streaming

### Run Examples

```bash
npm run example:get-info
npm run example:wallet-balances
npm run example:network-hashrate
```

## 🧪 Testing

```bash
# Build the project
npm run build

# Run examples
npm run example:get-info
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
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

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

---

**Made with ❤️ for the Hoosat community**