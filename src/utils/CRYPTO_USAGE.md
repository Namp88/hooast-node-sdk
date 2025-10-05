# 🔐 Hoosat SDK Crypto Utilities - Quick Start

## 📦 Installation

Make sure you have the required dependencies:

```bash
npm install blake3 secp256k1 bech32
npm install --save-dev @types/secp256k1
```

## 🚀 Quick Start

### 1. Generate New Wallet

```typescript
import { CryptoUtils } from './src/utils/crypto.utils';

// Generate new wallet
const wallet = CryptoUtils.generateKeyPair();

console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey.toString('hex'));
console.log('Public Key:', wallet.publicKey.toString('hex'));
```

### 2. Import Existing Wallet

```typescript
// Import from private key
const privateKeyHex = 'your_64_character_private_key_here';
const importedWallet = CryptoUtils.importKeyPair(privateKeyHex);

console.log('Imported Address:', importedWallet.address);
```

### 3. Create and Sign Transaction

```typescript
import { TransactionBuilder } from './src/utils/crypto.utils';

// Mock UTXO (in real app, get from node.getUtxosByAddresses())
const utxo = {
  outpoint: {
    transactionId: 'your_transaction_id_here',
    index: 0
  },
  utxoEntry: {
    amount: '200000000', // 2 HTN in sompi
    scriptPublicKey: CryptoUtils.addressToScriptPublicKey(senderWallet.address).toString('hex'),
    blockDaaScore: '1000',
    isCoinbase: false
  }
};

// Build and sign transaction
const builder = new TransactionBuilder();
const signedTx = await builder
  .addInput(utxo)
  .addOutput(recipientAddress, '100000000') // Send 1 HTN
  .addOutput(senderAddress, '99000000')     // Change 0.99 HTN
  .setFee('1000000')                        // Fee 0.01 HTN
  .sign(privateKey);

// Get transaction ID
const txId = CryptoUtils.getTransactionId(signedTx);
console.log('Transaction ID:', txId);

// Submit to network
const node = new HoosatNode();
const result = await node.submitTransaction(signedTx);
```

### 4. Blake3 Hashing

```typescript
// Single Blake3 hash
const data = Buffer.from('Hello Hoosat!');
const hash = CryptoUtils.blake3Hash(data);
console.log('Hash:', hash.toString('hex'));

// Double Blake3 (for transaction IDs)
const doubleHash = CryptoUtils.doubleBlake3Hash(data);
console.log('Double Hash:', doubleHash.toString('hex'));
```

### 5. Address Validation

```typescript
// Validate address
if (CryptoUtils.isValidAddress('hoosat:qz7ulu...')) {
  console.log('Valid Hoosat address');
} else {
  console.log('Invalid address');
}
```

### 6. Amount Conversion

```typescript
// Convert sompi to HTN
const readable = CryptoUtils.formatAmount('100000000'); // '1.00000000'
console.log(`Balance: ${readable} HTN`);

// Convert HTN to sompi
const sompi = CryptoUtils.parseAmount('1.5'); // '150000000'
console.log(`Amount: ${sompi} sompi`);
```

## 🧪 Running Tests

```bash
# Full crypto functionality test
npm run test:crypto:full

# Quick basic test
npm run test:crypto:quick

# Error handling test
npm run test:crypto:errors
```

## ⚠️ Important Notes

### 1. Private Key Security
```typescript
// ❌ DON'T: Store private keys in plain text
const wallet = { privateKey: 'a1b2c3d4...' };

// ✅ DO: Use secure storage
const privateKey = process.env.WALLET_PRIVATE_KEY;
if (!privateKey) throw new Error('Private key not found');
```

### 2. Transaction Validation
```typescript
// Always validate transaction before signing
const builder = new TransactionBuilder();
builder.addInput(utxo).addOutput(address, amount);

// Validate before signing
builder.validate(); // Throws if insufficient funds

const tx = await builder.sign(privateKey);
```

### 3. Network Compatibility
```typescript
// Always check if addresses are valid for current network
if (!CryptoUtils.isValidAddress(address)) {
  throw new Error('Invalid address format');
}
```

## 🔧 Troubleshooting

### Blake3 Import Error
```bash
# If you get Blake3 import errors:
npm install blake3
# Or use alternative implementation if needed
```

### secp256k1 Build Issues
```bash
# On Windows:
npm install --global windows-build-tools

# On macOS:
xcode-select --install

# On Linux:
sudo apt-get install build-essential
```

### Address Generation Issues
```typescript
// If addresses look wrong, check network:
const address = CryptoUtils.publicKeyToAddress(publicKey);
console.log('Generated address:', address);

// Should start with 'hoosat:'
if (!address.startsWith('hoosat:')) {
  console.error('Wrong network or implementation issue');
}
```

## 📚 Full Example

Complete wallet workflow:

```typescript
import { HoosatNode, CryptoUtils, TransactionBuilder } from '@hoosat/node-sdk';

async function completeWalletWorkflow() {
  // 1. Connect to node
  const node = new HoosatNode({ host: '127.0.0.1', port: 42420 });
  
  // 2. Create wallet
  const wallet = CryptoUtils.generateKeyPair();
  console.log('Wallet Address:', wallet.address);
  
  // 3. Check balance
  const balance = await node.getBalance(wallet.address);
  if (balance.ok) {
    console.log('Balance:', node.formatAmount(balance.result.balance), 'HTN');
  }
  
  // 4. Get UTXOs
  const utxos = await node.getUtxosByAddresses([wallet.address]);
  if (utxos.ok && utxos.result.utxos.length > 0) {
    // 5. Create transaction
    const recipient = CryptoUtils.generateKeyPair();
    const utxo = utxos.result.utxos[0];
    
    const tx = await new TransactionBuilder()
      .addInput(utxo)
      .addOutput(recipient.address, '50000000') // 0.5 HTN
      .addOutput(wallet.address, '49000000')   // Change
      .setFee('1000000')                       // 0.01 HTN fee
      .sign(wallet.privateKey);
    
    // 6. Submit transaction
    const result = await node.submitTransaction(tx);
    if (result.ok) {
      console.log('Transaction submitted:', result.result.transactionId);
    }
  }
}
```

## 🔗 Links

- [Main README](./README.md)
- [Examples](./examples/)
- [API Documentation](./docs/)
- [GitHub Issues](https://github.com/Namp88/hoosat-node-sdk/issues)