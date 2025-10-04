# @hoosat/node-sdk

TypeScript SDK for communicating with Hoosat nodes via gRPC.

## Installation
```bash
npm install @hoosat/node-sdk
```

## Quick start

```
import { HoosatNode } from '@hoosat/node-sdk';

const node = new HoosatNode({
  host: '127.0.0.1',
  port: 42420
});

// Get node info
const info = await node.getInfo();
console.log('Node version:', info.serverVersion);

// Check balance
const balance = await node.getBalance('hoosat:...');
console.log('Balance:', node.formatAmount(balance.balance), 'HOO');
```

## Complete API Reference

### Network Information

- `getInfo()` - Node information
- `getBlockDagInfo()` - Blockchain state
- `getBlockCount()` - Total blocks
- `getHeaderCount()` - Total headers
- `getCoinSupply()` - Circulating and max supply
- `estimateNetworkHashesPerSecond()` - Network hashrate
- `getConnectedPeerInfo()` - Connected peers

### Blocks

- `getBlock(hash)` - Single block
- `getBlocks(hashes)` - Multiple blocks
- `getSelectedTipHash()` - Best block hash

### Addresses

- `getBalance(address)` - Address balance
- `getUtxos(addresses)` - UTXOs for addresses
- `getTransactionsByAddress(address)` - All transactions

### Transactions

- `getTransaction(txId)` - Single transaction
- `submitTransaction(tx)` - Broadcast transaction
- `getMempoolEntries()` - Mempool transactions

### Utilities

- `isValidAddress(address)` - Validate address format
- `formatAmount(sompi)` - Convert sompi → HOO
- `parseAmount(hoo)` - Convert HOO → sompi

## Usage Examples

### Check Balance
```typescript
const balance = await node.getBalance('hoosat:qz7ulu...');
console.log('Balance:', node.formatAmount(balance.balance), 'HOO');