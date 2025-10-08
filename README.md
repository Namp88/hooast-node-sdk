# hoosat-sdk

[![npm version](https://badge.fury.io/js/hoosat-sdk.svg)](https://badge.fury.io/js/hoosat-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/Tests-Vitest-green.svg)](https://vitest.dev/)

**Professional TypeScript SDK for the [Hoosat](https://hoosat.fi) blockchain.** Full-featured toolkit for building production-ready applications with robust error handling, real-time monitoring, and advanced transaction management.

## 📋 Table of Contents

- [Key Features](#-key-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Detailed API Documentation](#-detailed-api-documentation)
    - [HoosatClient](#hoosatnode)
    - [HoosatCrypto](#hoosatcrypto)
    - [HoosatTxBuilder](#hoosattxbuilder)
    - [HoosatFeeEstimator](#hoosatfeeestimator)
    - [HoosatQR](#hoosatqr)
    - [HoosatUtils](#hoosatutils)
    - [UtxoStreamManager](#utxostreammanager)
- [Usage Examples](#-usage-examples)
- [Error Handling](#-error-handling)
- [UTXO Management](#-utxo-management)
- [Spam Protection](#-spam-protection)
- [Best Practices](#-best-practices)
- [Testing](#-testing)
- [Development](#-development)

---

## ✨ Key Features

### Core Functionality

- 🔗 **Full Node Integration** - Connect to any Hoosat node via gRPC
- 🔐 **Cryptographic Utilities** - Key generation, address creation, transaction signing
- 🏗️ **Transaction Builder** - Intuitive API with automatic fee calculation
- 📊 **Network Analytics** - Block data, mempool analysis, hashrate estimation
- 💰 **Balance & UTXO Management** - Query balances, manage UTXOs efficiently
- 🎨 **QR Code Generation** - Payment URIs and address QR codes

### Advanced Features

- 📡 **Real-time Streaming** - Subscribe to UTXO changes with automatic reconnection
- 🎯 **Dynamic Fee Estimation** - Network-aware fee recommendations
- 🔄 **UTXO Selection Strategies** - Optimize fees and privacy
- 📦 **Batch Payments** - Send to multiple recipients efficiently
- ⚡ **UTXO Consolidation** - Optimize wallet structure
- 🔀 **UTXO Splitting** - Prepare for future payments

### Production-Ready

- 🛡️ **Spam Protection Compliance** - Built-in limits (max 2 recipients per tx)
- ⚠️ **Comprehensive Error Handling** - Robust error categorization and recovery
- 🔄 **Retry Strategies** - Exponential backoff, circuit breaker patterns
- 📈 **Network Monitoring** - Real-time statistics and health checks
- 🔒 **Type Safety** - Full TypeScript support with comprehensive types
- ✅ **Test Coverage** - Unit tests with Vitest

---

## 📦 Installation

```bash
npm install hoosat-sdk
```

### Requirements

- Node.js >= 20.0.0
- TypeScript >= 5.0 (optional but recommended)

---

## 🚀 Quick Start

### 1. Connect to Node

```typescript
import { HoosatClient } from 'hoosat-sdk';

const client = new HoosatClient({
  host: '54.38.176.95',
  port: 42420,
  timeout: 10000  // Optional, default: 10000ms
});

// Check node status
const info = await client.getInfo();
if (info.ok) {
  console.log('Connected to:', info.result.serverVersion);
  console.log('Is Synced:', info.result.isSynced);
  console.log('UTXO Indexed:', info.result.isUtxoIndexed);
}
```

### 2. Create Wallet

```typescript
import { HoosatCrypto } from 'hoosat-sdk';

// Generate new keypair
const wallet = HoosatCrypto.generateKeyPair();
console.log('Address:', wallet.address);
console.log('Public Key:', wallet.publicKey.toString('hex'));
console.log('Private Key:', wallet.privateKey.toString('hex'));

// Import existing wallet
const imported = HoosatCrypto.importKeyPair('your_private_key_hex');
```

### 3. Check Balance

```typescript
import { HoosatUtils } from 'hoosat-sdk';

const result = await client.getBalance('hoosat:qz7ulu...');
if (result.ok) {
  const balanceHTN = HoosatUtils.sompiToAmount(result.result.balance);
  console.log('Balance:', balanceHTN, 'HTN');
}
```

### 4. Build and Send Transaction

```typescript
import { HoosatTxBuilder, HoosatFeeEstimator, FeePriority } from 'hoosat-sdk';

// Get UTXOs
const utxoResponse = await client.getUtxosByAddresses([wallet.address]);
if (!utxoResponse.ok) {
  throw new Error('Failed to fetch UTXOs');
}

const utxos = utxoResponse.result.utxos;
const selectedUtxo = utxos[0]; // Select UTXO

// Estimate fee
const feeEstimator = new HoosatFeeEstimator(client);
const feeEstimate = await feeEstimator.estimateFee(
  FeePriority.Normal,
  1,  // inputs count
  2   // outputs count (recipient + change)
);

// Build transaction
const builder = new HoosatTxBuilder();
builder.addInput(selectedUtxo, wallet.privateKey);
builder.addOutput('hoosat:recipient_address...', '100000000'); // 1 HTN in sompi
builder.setFee(feeEstimate.totalFee);
builder.addChangeOutput(wallet.address);

const signedTx = builder.sign();

// Submit to network
const submitResult = await client.submitTransaction(signedTx);
if (submitResult.ok) {
  console.log('Transaction ID:', submitResult.result.transactionId);
}
```

### 5. Real-time Balance Monitoring

```typescript
// Subscribe to UTXO changes
await client.subscribeToUtxoChanges([wallet.address]);

client.on('utxoChange', async (notification) => {
  console.log('Added UTXOs:', notification.added.length);
  console.log('Removed UTXOs:', notification.removed.length);
  
  // Update balance
  const balance = await client.getBalance(wallet.address);
  if (balance.ok) {
    console.log('New balance:', HoosatUtils.sompiToAmount(balance.result.balance), 'HTN');
  }
});

client.on('error', (error) => {
  console.error('Streaming error:', error);
});

client.on('disconnect', () => {
  console.log('Disconnected from utxo stream');
});
```

### 6. Generate Payment QR Codes

```typescript
import { HoosatQR } from 'hoosat-sdk';

// Simple address QR
const qr = await HoosatQR.generateAddressQR('hoosat:qz7ulu...');
// Use in HTML: <img src="${qr}" alt="Scan to send HTN" />

// Payment request with amount and metadata
const paymentQR = await HoosatQR.generatePaymentQR({
  address: 'hoosat:qz7ulu...',
  amount: 100,           // 100 HTN
  label: 'Coffee Shop',
  message: 'Order #12345'
});

// Parse scanned QR from mobile wallet
const parsed = HoosatQR.parsePaymentURI('hoosat:qz7ulu...?amount=100');
console.log('Amount:', HoosatUtils.sompiToAmount(parsed.amount!), 'HTN');
console.log('Label:', parsed.label);
console.log('Message:', parsed.message);
```

---

## 📚 Detailed API Documentation

## HoosatClient

**Main class for interacting with Hoosat nodes via gRPC.**

### Constructor

```typescript
const client = new HoosatClient(config: NodeConfig);

interface NodeConfig {
  host?: string;    // Default: 'localhost'
  port?: number;    // Default: 42420
  timeout?: number; // Default: 10000 (ms)
}
```

### Methods - Node Information

#### `getInfo()`
Get node information.

```typescript
await client.getInfo(): Promise<BaseResult<GetInfo>>

interface GetInfo {
  p2pId: string;
  mempoolSize: string;
  serverVersion: string;
  isUtxoIndexed: boolean;
  isSynced: boolean;
}
```

#### `getCurrentNetwork()`
Get current network (mainnet/testnet).

```typescript
await client.getCurrentNetwork(): Promise<BaseResult<GetCurrentNetwork>>

interface GetCurrentNetwork {
  currentNetwork: string;
}
```

#### `getConnectedPeerInfo()`
Get information about connected peers.

```typescript
await client.getConnectedPeerInfo(): Promise<BaseResult<GetConnectedPeerInfo>>
```

### Methods - Blockchain

#### `getSelectedTipHash()`
Get current tip block hash.

```typescript
await client.getSelectedTipHash(): Promise<BaseResult<GetSelectedTipHash>>
```

#### `getBlock(blockHash, includeTransactions?)`
Get block data by hash.

```typescript
await client.getBlock(
  blockHash: string,
  includeTransactions: boolean = true
): Promise<BaseResult<GetBlock>>
```

#### `getBlocks(lowHash, includeTransactions?)`
Get multiple blocks starting from specified hash.

```typescript
await client.getBlocks(
  lowHash: string,
  includeTransactions: boolean = false
): Promise<BaseResult<GetBlocks>>
```

#### `getBlockCount()`
Get current blockchain height.

```typescript
await client.getBlockCount(): Promise<BaseResult<GetBlockCount>>
```

#### `getBlockDagInfo()`
Get blockchain DAG structure information.

```typescript
await client.getBlockDagInfo(): Promise<BaseResult<GetBlockDagInfo>>
```

### Methods - Addresses and Balances

#### `getBalance(address)`
Get address balance.

```typescript
await client.getBalance(address: string): Promise<BaseResult<GetBalanceByAddress>>

interface GetBalanceByAddress {
  balance: string; // Amount in sompi
}
```

#### `getBalancesByAddresses(addresses)`
Get balances for multiple addresses.

```typescript
await client.getBalancesByAddresses(addresses: string[]): Promise<BaseResult<GetBalancesByAddresses>>
```

#### `getUtxosByAddresses(addresses)`
Get all UTXOs for specified addresses.

```typescript
await client.getUtxosByAddresses(addresses: string[]): Promise<BaseResult<GetUtxosByAddresses>>
```

### Methods - Transactions

#### `submitTransaction(transaction, allowOrphan?)`
Submit transaction to network.

```typescript
await client.submitTransaction(
  transaction: Transaction,
  allowOrphan: boolean = false
): Promise<BaseResult<SubmitTransaction>>
```

### Methods - Mempool

#### `getMempoolEntry(txId, includeOrphanPool?, filterTransactionPool?)`
Get transaction information from mempool.

```typescript
await client.getMempoolEntry(
  txId: string,
  includeOrphanPool: boolean = true,
  filterTransactionPool: boolean = false
): Promise<BaseResult<GetMempoolEntry>>
```

#### `getMempoolEntries(includeOrphanPool?, filterTransactionPool?)`
Get all transactions in mempool.

```typescript
await client.getMempoolEntries(
  includeOrphanPool: boolean = true,
  filterTransactionPool: boolean = false
): Promise<BaseResult<GetMempoolEntries>>
```

### Methods - Real-time Streaming

#### `subscribeToUtxoChanges(addresses)`
Subscribe to UTXO changes for specified addresses.

```typescript
await client.subscribeToUtxoChanges(addresses: string[]): Promise<BaseResult<void>>
```

#### `unsubscribeFromUtxoChanges(addresses?)`
Unsubscribe from UTXO changes.

```typescript
await client.unsubscribeFromUtxoChanges(addresses?: string[]): Promise<BaseResult<void>>
```

### Events

- `'utxoChange'` - UTXO change notifications
- `'error'` - Streaming errors
- `'disconnect'` - Node disconnection

### Method - Disconnect

#### `disconnect()`
Close connection to utxo stream.

```typescript
client.disconnect(): void
```

---

## HoosatCrypto

**Class for all cryptographic operations: key generation, address creation, transaction signing.**

### Methods - Key Generation and Import

#### `generateKeyPair()`
Generate new keypair (ECDSA secp256k1).

```typescript
HoosatCrypto.generateKeyPair(): KeyPair

interface KeyPair {
  address: string;
  publicKey: Buffer;
  privateKey: Buffer;
}
```

#### `importKeyPair(privateKeyHex)`
Import existing keypair from private key.

```typescript
HoosatCrypto.importKeyPair(privateKeyHex: string): KeyPair
```

### Methods - Addresses

#### `publicKeyToAddressECDSA(publicKey)`
Convert public key to Hoosat address.

```typescript
HoosatCrypto.publicKeyToAddressECDSA(publicKey: Buffer): string
```

#### `addressToScriptPublicKey(address)`
Convert address to scriptPublicKey.

```typescript
HoosatCrypto.addressToScriptPublicKey(address: string): {
  version: number;
  script: string;
}
```

### Methods - Transactions

#### `getTransactionId(transaction)`
Calculate transaction ID.

```typescript
HoosatCrypto.getTransactionId(transaction: Transaction): string
```

#### `signTransaction(transaction, privateKey, sighashType?)`
Sign transaction with private key.

```typescript
HoosatCrypto.signTransaction(
  transaction: Transaction,
  privateKey: Buffer,
  sighashType: number = HOOSAT_PARAMS.SIGHASH_ALL
): Transaction
```

#### `calculateFee(inputsCount, outputsCount, feeRate)`
Calculate transaction fee.

```typescript
HoosatCrypto.calculateFee(
  inputsCount: number,
  outputsCount: number,
  feeRate: number = HOOSAT_PARAMS.DEFAULT_FEE_PER_BYTE
): string
```

### Methods - Hashing

#### `blake3Hash(data)`
Calculate BLAKE3 hash.

```typescript
HoosatCrypto.blake3Hash(data: Buffer | string): Buffer
```

---

## HoosatTxBuilder

**Convenient class for building and signing transactions with automatic change calculation.**

### Constructor

```typescript
const builder = new HoosatTxBuilder(options?: TxBuilderOptions);

interface TxBuilderOptions {
  debug?: boolean; // Enable debug logging (default: false)
}
```

### Methods - Adding Inputs and Outputs

#### `addInput(utxo, privateKey?)`
Add input to transaction.

```typescript
builder.addInput(utxo: UtxoForSigning, privateKey?: Buffer): this
```

#### `addOutput(address, amount)`
Add output (recipient).

```typescript
builder.addOutput(address: string, amount: string): this
```

**Important:** Maximum 2 recipients due to spam protection.

#### `addOutputRaw(output)`
Add raw output (bypassing validation).

```typescript
builder.addOutputRaw(output: TransactionOutput): this
```

#### `addChangeOutput(changeAddress)`
Automatically calculate and add change output.

```typescript
builder.addChangeOutput(changeAddress: string): this
```

**Important:** Call `setFee()` BEFORE `addChangeOutput()`.

### Methods - Configuration

#### `setFee(fee)`
Set transaction fee.

```typescript
builder.setFee(fee: string): this
```

#### `setLockTime(lockTime)`
Set transaction lockTime.

```typescript
builder.setLockTime(lockTime: string): this
```

### Methods - Building and Signing

#### `build()`
Build unsigned transaction.

```typescript
builder.build(): Transaction
```

#### `sign(globalPrivateKey?)`
Sign transaction.

```typescript
builder.sign(globalPrivateKey?: Buffer): Transaction
```

#### `buildAndSign(globalPrivateKey?)`
Build and sign transaction in one call.

```typescript
builder.buildAndSign(globalPrivateKey?: Buffer): Transaction
```

### Methods - Validation and Information

#### `validate()`
Validate transaction correctness.

```typescript
builder.validate(): void // Throws error if invalid
```

#### `estimateFee(feePerByte?)`
Estimate fee based on transaction size.

```typescript
builder.estimateFee(feePerByte: number = 1): string
```

#### `getTotalInputAmount()`
Get sum of all inputs.

```typescript
builder.getTotalInputAmount(): bigint
```

#### `getTotalOutputAmount()`
Get sum of all outputs.

```typescript
builder.getTotalOutputAmount(): bigint
```

#### `getInputCount()` / `getOutputCount()`
Get number of inputs/outputs.

```typescript
builder.getInputCount(): number
builder.getOutputCount(): number
```

### Methods - State Management

#### `clear()`
Reset builder to initial state.

```typescript
builder.clear(): this
```

---

## HoosatFeeEstimator

**Dynamic fee estimation based on current network state.**

### Constructor

```typescript
const estimator = new HoosatFeeEstimator(client: HoosatClient, config?: FeeEstimatorConfig);

interface FeeEstimatorConfig {
  cacheDuration?: number; // Cache duration in ms (default: 30000)
}
```

### Methods

#### `getRecommendations()`
Get recommended fee rates for all priority levels.

```typescript
await estimator.getRecommendations(): Promise<FeeRecommendations>

interface FeeRecommendations {
  low: FeeEstimate;
  normal: FeeEstimate;
  high: FeeEstimate;
  urgent: FeeEstimate;
}

enum FeePriority {
  Low = 'low',
  Normal = 'normal',
  High = 'high',
  Urgent = 'urgent'
}
```

#### `estimateFee(priority, inputsCount, outputsCount)`
Estimate total fee for specific transaction.

```typescript
await estimator.estimateFee(
  priority: FeePriority,
  inputsCount: number,
  outputsCount: number
): Promise<FeeEstimate>
```

#### `clearCache()`
Clear fee estimation cache.

```typescript
estimator.clearCache(): void
```

#### `setCacheDuration(duration)`
Set cache lifetime.

```typescript
estimator.setCacheDuration(duration: number): void
```

### Priority Recommendations

- **Low** - Non-urgent transactions (0.5x base rate)
- **Normal** - Standard confirmation speed (1.0x base rate)
- **High** - Fast confirmation (2.0x base rate)
- **Urgent** - Priority confirmation (5.0x base rate)

---

## HoosatQR

**Generate and parse QR codes for Hoosat addresses and payment requests.**

### Methods - QR Code Generation

#### `generateAddressQR(address, options?)`
Generate QR code for simple address.

```typescript
await HoosatQR.generateAddressQR(
  address: string,
  options?: QRCodeOptions
): Promise<string>

interface QRCodeOptions {
  width?: number;                          // Default: 300
  errorCorrectionLevel?: 'L'|'M'|'Q'|'H'; // Default: 'M'
  margin?: number;                         // Default: 2
  color?: {
    dark?: string;   // Hex color (default: '#000000')
    light?: string;  // Hex color (default: '#FFFFFF')
  };
}
```

**Returns:** Data URL (base64 PNG image) for use in `<img>` tags.

#### `generatePaymentQR(params, options?)`
Generate QR code for payment request.

```typescript
await HoosatQR.generatePaymentQR(
  params: PaymentURIParams,
  options?: QRCodeOptions
): Promise<string>

interface PaymentURIParams {
  address: string;
  amount?: string | number;  // Amount in HTN (not sompi)
  label?: string;
  message?: string;
}
```

#### `generateQRBuffer(address, options?)`
Generate QR code as PNG Buffer.

```typescript
await HoosatQR.generateQRBuffer(
  address: string,
  options?: QRCodeOptions
): Promise<Buffer>
```

#### `generateQRSVG(address, options?)`
Generate QR code as SVG string.

```typescript
await HoosatQR.generateQRSVG(
  address: string,
  options?: QRCodeOptions
): Promise<string>
```

#### `generateQRTerminal(address)`
Generate ASCII art QR code for terminal.

```typescript
await HoosatQR.generateQRTerminal(address: string): Promise<void>
```

### Methods - URI Operations

#### `buildPaymentURI(params)`
Build payment URI from parameters.

```typescript
HoosatQR.buildPaymentURI(params: PaymentURIParams): string
```

#### `parsePaymentURI(uri)`
Parse payment URI into structured data.

```typescript
HoosatQR.parsePaymentURI(uri: string): ParsedPaymentURI

interface ParsedPaymentURI {
  address: string;
  amount?: string;    // Amount in sompi
  label?: string;
  message?: string;
  rawUri: string;
}
```

#### `isValidPaymentURI(uri)`
Validate payment URI.

```typescript
HoosatQR.isValidPaymentURI(uri: string): boolean
```

### Use Cases

**E-commerce Integration:**
```typescript
const orderQR = await HoosatQR.generatePaymentQR({
  address: merchantAddress,
  amount: orderTotal,
  label: 'My Online Store',
  message: `Order #${orderId}`
});
```

**Donation Button:**
```typescript
const donationQR = await HoosatQR.generateAddressQR(charityAddress, {
  width: 400,
  errorCorrectionLevel: 'H'
});
```

---

## HoosatUtils

**Set of utilities for working with amounts, validation, and formatting.**

### Methods - Amount Conversion

#### `amountToSompi(htn)`
Convert HTN to sompi (smallest unit).

```typescript
HoosatUtils.amountToSompi(htn: string): string
```

#### `sompiToAmount(sompi)`
Convert sompi to HTN.

```typescript
HoosatUtils.sompiToAmount(sompi: string | bigint): string
```

### Methods - Formatting

#### `formatAmount(htn, decimals?)`
Format amount with thousands separators.

```typescript
HoosatUtils.formatAmount(htn: string, decimals: number = 8): string
```

#### `truncateHash(hash, prefixLength?, suffixLength?)`
Truncate hash for display.

```typescript
HoosatUtils.truncateHash(
  hash: string,
  prefixLength: number = 8,
  suffixLength: number = 6
): string
```

#### `truncateAddress(address, prefixLength?, suffixLength?)`
Truncate address for display.

```typescript
HoosatUtils.truncateAddress(
  address: string,
  prefixLength: number = 15,
  suffixLength: number = 6
): string
```

### Methods - Address Validation

#### `isValidAddress(address)`
Validate Hoosat address.

```typescript
HoosatUtils.isValidAddress(address: string): boolean
```

**Supports:** Mainnet (`hoosat:`) and Testnet (`hoosattest:`) addresses.

#### `isValidAddresses(addresses, checkUnique?)`
Validate array of addresses.

```typescript
HoosatUtils.isValidAddresses(
  addresses: string[],
  checkUnique: boolean = false
): boolean
```

#### `getAddressVersion(address)`
Get address version.

```typescript
HoosatUtils.getAddressVersion(address: string): number | null
```

**Returns:** `0x00` (Schnorr), `0x01` (ECDSA), `0x08` (P2SH), or `null`.

#### `getAddressType(address)`
Get address type.

```typescript
HoosatUtils.getAddressType(address: string): 'schnorr' | 'ecdsa' | 'p2sh' | null
```

### Methods - Hash Validation

#### `isValidHash(hash, expectedLength?)`
Validate hex hash.

```typescript
HoosatUtils.isValidHash(hash: string, expectedLength: number = 64): boolean
```

#### `isValidTransactionId(txId)`
Validate transaction ID.

```typescript
HoosatUtils.isValidTransactionId(txId: string): boolean
```

#### `isValidBlockHash(blockHash)`
Validate block hash.

```typescript
HoosatUtils.isValidBlockHash(blockHash: string): boolean
```

#### `isValidHashes(hashes, length?)`
Validate array of hashes.

```typescript
HoosatUtils.isValidHashes(hashes: string[], length: number = 64): boolean
```

### Methods - Key Validation

#### `isValidPrivateKey(privateKey)`
Validate private key.

```typescript
HoosatUtils.isValidPrivateKey(privateKey: string): boolean
```

#### `isValidPublicKey(publicKey, compressed?)`
Validate public key.

```typescript
HoosatUtils.isValidPublicKey(
  publicKey: string,
  compressed: boolean = true
): boolean
```

### Methods - Amount Validation

#### `isValidAmount(amount, maxDecimals?)`
Validate amount.

```typescript
HoosatUtils.isValidAmount(amount: string, maxDecimals: number = 8): boolean
```

### Methods - Comparison

#### `compareAddresses(addr1, addr2)`
Case-insensitive address comparison.

```typescript
HoosatUtils.compareAddresses(addr1: string, addr2: string): boolean
```

#### `compareHashes(hash1, hash2)`
Case-insensitive hash comparison.

```typescript
HoosatUtils.compareHashes(hash1: string, hash2: string): boolean
```

---

## UtxoStreamManager

**Low-level class for managing real-time UTXO streaming (usually used through HoosatClient).**

### Events

```typescript
enum StreamEventName {
  UtxoChange = 'utxoChange',
  Error = 'error',
  Disconnect = 'disconnect',
  Reconnecting = 'reconnecting',
  Reconnected = 'reconnected'
}
```

### Configuration

```typescript
interface UtxoStreamConfig {
  maxReconnectAttempts?: number;  // Default: 5
  baseReconnectDelay?: number;    // Default: 2000ms
  maxSubscribedAddresses?: number; // Default: 1000
}
```

**Note:** In most cases, use `HoosatClient` methods instead of working directly with `UtxoStreamManager`.

---

## 📋 Usage Examples

The SDK includes **40+ detailed examples** covering all aspects of functionality.

### Example Categories

#### 📍 Address & Balance (3 examples)

```bash
npm run example:address:balance              # Check single address balance
npm run example:address:balances-multiple    # Check multiple addresses
npm run example:address:utxos                # Fetch and analyze UTXOs
```

#### 🔐 Cryptography (4 examples)

```bash
npm run example:crypto:generate-keypair      # Generate new wallet
npm run example:crypto:import-keypair        # Import existing wallet
npm run example:crypto:address-types         # Explore address types
npm run example:crypto:hashing               # Cryptographic hashing
```

#### 🌐 Node Operations (4 examples)

```bash
npm run example:node:connect                 # Connect and get info
npm run example:node:blockchain-info         # Blockchain statistics
npm run example:node:blocks                  # Query block data
npm run example:node:mempool                 # Analyze mempool
```

#### 📡 Real-time Streaming (1 example)

```bash
npm run example:streaming:subscribe-utxos    # Real-time UTXO monitoring
```

#### 🎨 QR Codes (3 examples)

```bash
npm run example:qr:address                   # Generate address QR codes
npm run example:qr:payment                   # Payment request QR codes
npm run example:qr:parse                     # Parse payment URIs
```

#### 💸 Transaction Management (9 examples)

```bash
npm run example:transaction:build-simple           # Build simple transaction
npm run example:transaction:build-with-change      # Automatic change handling
npm run example:transaction:multiple-inputs        # Handle multiple inputs
npm run example:transaction:estimate-fee           # Dynamic fee estimation
npm run example:transaction:send-real              # Send real transaction
npm run example:transaction:dynamic-fees           # Network-aware fees
npm run example:transaction:send-real-batch        # Batch payment
npm run example:transaction:consolidate-utxos      # UTXO consolidation
npm run example:transaction:split-utxo             # Split UTXO
```

#### ⚠️ Error Handling (3 examples)

```bash
npm run example:error-handling:network-errors      # Network error handling
npm run example:error-handling:transaction-errors  # Transaction errors
npm run example:error-handling:retry-strategies    # Retry patterns
```

#### 📊 Monitoring (2 examples)

```bash
npm run example:monitoring:track-balance-changes   # Real-time balance tracking
npm run example:monitoring:network-stats           # Network statistics
```

#### 🚀 Advanced (2 examples)

```bash
npm run example:advanced:multi-recipient-batching  # Batch payments (3+ recipients)
npm run example:advanced:utxo-selection-strategy   # UTXO selection algorithms
```

#### 🛠 Utilities (3 examples)

```bash
npm run example:utils:amount-conversion            # Amount conversions
npm run example:utils:validation                   # Input validation
npm run example:utils:formatting                   # Pretty formatting
```

---

## 🔄 Error Handling

All SDK methods return a standardized result:

```typescript
interface BaseResult<T> {
  ok: boolean;
  result: T | null;
  error: string | null;
}
```

### Usage Pattern

```typescript
const result = await client.getBalance(address);

if (result.ok) {
  // Success - use result.result
  console.log('Balance:', result.result.balance);
} else {
  // Error - use result.error
  console.error('Error:', result.error);
}
```

### Error Types

#### Network Errors
- Connection timeout
- Lost connection
- gRPC errors

#### Transaction Errors
- Insufficient balance
- Invalid addresses
- Recipient limit exceeded

#### Validation Errors
- Invalid address formats
- Invalid private keys
- Invalid amounts

### Retry Strategies

#### Exponential Backoff

```typescript
async function connectWithRetry(maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const result = await client.getInfo();
    if (result.ok) return result;
    
    const delay = Math.min(1000 * Math.pow(2, i), 30000);
    console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
    await new Promise(r => setTimeout(r, delay));
  }
  throw new Error('Max retries exceeded');
}
```

#### Circuit Breaker

```typescript
class CircuitBreaker {
  private failureCount = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

### Handling Disconnections

```typescript
client.on('disconnect', async () => {
  console.log('Disconnected from utxo stream - attempting reconnect...');
  await reconnectWithBackoff();
});

client.on('error', (error) => {
  console.error('Node error:', error);
  // Log for monitoring
  logger.error('Node error', { error, timestamp: Date.now() });
});
```

---

## 💼 UTXO Management

### UTXO Selection Strategies

#### 1. Largest-First (Minimize Fees)

```typescript
// Sort UTXOs by amount descending
const sortedUtxos = utxos.sort((a, b) => 
  Number(BigInt(b.utxoEntry.amount) - BigInt(a.utxoEntry.amount))
);

// Select largest UTXOs first
let totalSelected = 0n;
for (const utxo of sortedUtxos) {
  if (totalSelected >= neededAmount) break;
  builder.addInput(utxo, privateKey);
  totalSelected += BigInt(utxo.utxoEntry.amount);
}
```

**Advantages:**
- Minimum number of inputs → lower fees
- Fast transaction building

**Disadvantages:**
- Worse privacy (obvious selection pattern)
- Doesn't clean up small UTXOs

#### 2. Smallest-First (Dust Cleanup)

```typescript
// Sort UTXOs by amount ascending
const sortedUtxos = utxos.sort((a, b) => 
  Number(BigInt(a.utxoEntry.amount) - BigInt(b.utxoEntry.amount))
);

// Select smallest UTXOs first
let totalSelected = 0n;
for (const utxo of sortedUtxos) {
  if (totalSelected >= neededAmount) break;
  builder.addInput(utxo, privateKey);
  totalSelected += BigInt(utxo.utxoEntry.amount);
}
```

**Advantages:**
- Cleans up small UTXOs (dust cleanup)
- Improves wallet structure
- Reduces future fees

**Disadvantages:**
- More inputs → higher current fee
- Slower for large amounts

#### 3. Random Selection (Privacy)

```typescript
// Shuffle UTXOs randomly
const shuffled = utxos.sort(() => Math.random() - 0.5);

let totalSelected = 0n;
for (const utxo of shuffled) {
  if (totalSelected >= neededAmount) break;
  builder.addInput(utxo, privateKey);
  totalSelected += BigInt(utxo.utxoEntry.amount);
}
```

**Advantages:**
- Unpredictable pattern → better privacy
- Makes chain analysis harder

**Disadvantages:**
- Unpredictable fees
- Not optimal for size

### UTXO Consolidation

Combine many small UTXOs into one large UTXO.

```typescript
// Get all UTXOs
const utxos = await client.getUtxosByAddresses([wallet.address]);

// Estimate fee
const feeEstimator = new HoosatFeeEstimator(client);
const feeEstimate = await feeEstimator.estimateFee(
  FeePriority.Low,  // Use low priority for consolidation
  utxos.result.utxos.length,  // All inputs
  1  // Single output
);

// Build consolidation transaction
const builder = new HoosatTxBuilder();

// Add all UTXOs as inputs
for (const utxo of utxos.result.utxos) {
  builder.addInput(utxo, wallet.privateKey);
}

// Single output to same address
const totalIn = builder.getTotalInputAmount();
const fee = BigInt(feeEstimate.totalFee);
const outputAmount = (totalIn - fee).toString();

builder.addOutput(wallet.address, outputAmount);
builder.setFee(feeEstimate.totalFee);

// Submit
const signedTx = builder.sign();
await client.submitTransaction(signedTx);
```

**When to consolidate:**
- Accumulated many small UTXOs (>10)
- Low network activity (cheap fees)
- Before an important transaction

**Pros:**
- Reduces future fees
- Simplifies wallet structure
- Speeds up transaction creation

**Cons:**
- Costs fees now
- Loss of privacy (all UTXOs linked)

### UTXO Splitting

Split one large UTXO into multiple smaller ones.

```typescript
// Get largest UTXO
const utxos = await client.getUtxosByAddresses([wallet.address]);
const largestUtxo = utxos.result.utxos.sort((a, b) => 
  Number(BigInt(b.utxoEntry.amount) - BigInt(a.utxoEntry.amount))
)[0];

// Estimate fee
const feeEstimate = await feeEstimator.estimateFee(
  FeePriority.Normal,
  1,  // Single input
  3   // 2 splits + change
);

// Build split transaction
const totalAmount = BigInt(largestUtxo.utxoEntry.amount);
const fee = BigInt(feeEstimate.totalFee);
const splitAmount = (totalAmount - fee) / 2n;

const builder = new HoosatTxBuilder();
builder.addInput(largestUtxo, wallet.privateKey);
builder.addOutput(wallet.address, splitAmount.toString());  // Split 1
builder.addOutput(wallet.address, splitAmount.toString());  // Split 2
builder.setFee(feeEstimate.totalFee);

const signedTx = builder.sign();
await client.submitTransaction(signedTx);
```

**When to split:**
- Preparing for multiple payments
- Improving privacy
- Parallel transactions

---

## 🛡 Spam Protection

Hoosat inherits **dust-attack protection** from Kaspa. This means a hard protocol-level limitation:

### Transaction Limits

- **Maximum 2 recipient outputs** per transaction
- **Maximum 3 outputs** total (2 recipients + 1 change)

```typescript
// ✅ VALID - 2 recipients + change
builder.addInput(utxo, privateKey);
builder.addOutput('hoosat:recipient1...', '100000000');
builder.addOutput('hoosat:recipient2...', '50000000');
builder.addChangeOutput(wallet.address);  // Total: 3 outputs

// ❌ INVALID - 3 recipients
builder.addInput(utxo, privateKey);
builder.addOutput('hoosat:recipient1...', '100000000');
builder.addOutput('hoosat:recipient2...', '50000000');
builder.addOutput('hoosat:recipient3...', '25000000');  // ERROR!
```

### Handling Multiple Recipients

For sending to 3+ recipients, use **batch payments** (multiple transactions):

```typescript
const recipients = [
  { address: 'hoosat:addr1...', amount: '100000000' },
  { address: 'hoosat:addr2...', amount: '50000000' },
  { address: 'hoosat:addr3...', amount: '75000000' },
  { address: 'hoosat:addr4...', amount: '25000000' },
];

// Split into batches of 2
const batches = [];
for (let i = 0; i < recipients.length; i += 2) {
  batches.push(recipients.slice(i, i + 2));
}

// Process each batch
for (const batch of batches) {
  const builder = new HoosatTxBuilder();
  
  // Get fresh UTXO for each transaction
  const utxos = await client.getUtxosByAddresses([wallet.address]);
  builder.addInput(utxos.result.utxos[0], wallet.privateKey);
  
  // Add recipients (max 2)
  for (const recipient of batch) {
    builder.addOutput(recipient.address, recipient.amount);
  }
  
  builder.setFee(estimatedFee);
  builder.addChangeOutput(wallet.address);
  
  const signedTx = builder.sign();
  await client.submitTransaction(signedTx);
  
  // Add delay between batches
  await new Promise(r => setTimeout(r, 2000));
}
```

**See example:** `examples/advanced/01-multi-recipient-batching.ts`

### Why This Limitation?

1. **Spam Protection** - Prevents creating thousands of small UTXOs
2. **Network Performance** - Reduces validation load
3. **UTXO Set Size** - Controls database growth

---

## 💡 Best Practices

### 1. Always Check Results

```typescript
const result = await client.getBalance(address);
if (!result.ok) {
  console.error('Error:', result.error);
  return;
}

// Safe to use result.result
console.log('Balance:', result.result.balance);
```

### 2. Validate Before Operations

```typescript
// Validate address before querying
if (!HoosatUtils.isValidAddress(address)) {
  throw new Error('Invalid Hoosat address');
}

// Validate private key before importing
if (!HoosatUtils.isValidPrivateKey(privateKeyHex)) {
  throw new Error('Invalid private key format');
}

// Validate amount before sending
if (!HoosatUtils.isValidAmount(amount)) {
  throw new Error('Invalid amount format');
}
```

### 3. Use Dynamic Fee Estimation

```typescript
// ❌ BAD - Fixed fee
builder.setFee('2500');

// ✅ GOOD - Dynamic fee based on network
const feeEstimator = new HoosatFeeEstimator(client);
const estimate = await feeEstimator.estimateFee(
  FeePriority.Normal,
  inputCount,
  outputCount
);
builder.setFee(estimate.totalFee);
```

### 4. Handle Disconnections

```typescript
client.on('disconnect', async () => {
  console.log('Disconnected - reconnecting to utxo stream...');
  await reconnectWithRetry();
});

client.on('error', (error) => {
  console.error('Node error:', error);
  // Log to monitoring system
});
```

### 5. Respect Rate Limits

```typescript
// Add delays between batch operations
for (const batch of batches) {
  await processBatch(batch);
  await new Promise(r => setTimeout(r, 2000)); // 2s delay
}
```

### 6. Use Change Outputs

```typescript
// ❌ BAD - Manual change calculation (error-prone)
const change = totalIn - amount - fee;
builder.addOutput(wallet.address, change.toString());

// ✅ GOOD - Automatic change calculation
builder.addChangeOutput(wallet.address);
```

### 7. Validate Transactions Before Sending

```typescript
try {
  builder.validate();
  const signedTx = builder.sign();
  await client.submitTransaction(signedTx);
} catch (error) {
  console.error('Transaction validation failed:', error);
}
```

### 8. Secure Private Key Storage

```typescript
// ❌ NEVER store private keys in plain text
const privateKey = '33a4a81e...';

// ✅ Use environment variables
const privateKey = process.env.WALLET_PRIVATE_KEY;

// ✅ Use encrypted storage
const encryptedKey = encrypt(privateKey, password);

// ✅ Use hardware wallets for production
```

### 9. Test on Testnet

```typescript
// Use testnet for development
const client = new HoosatClient({
  host: 'testnet-node.hoosat.fi',
  port: 42420
});

// Generate testnet addresses
const wallet = HoosatCrypto.generateKeyPair();
```

### 10. Monitoring and Logging

```typescript
// Log all transactions
const txId = await submitTransaction(tx);
logger.info('Transaction submitted', {
  txId,
  amount,
  recipient,
  timestamp: Date.now()
});

// Monitor UTXO changes
client.on('utxoChange', (notification) => {
  logger.info('UTXO change detected', {
    added: notification.added.length,
    removed: notification.removed.length
  });
});
```

---

## 🧪 Testing

The SDK uses [Vitest](https://vitest.dev/) for unit testing.

### Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run with UI
npm run test:ui

# Watch mode
npm test -- --watch
```

### Test Structure

```
tests/
├── crypto/
│   └── crypto.test.ts         # HoosatCrypto tests
├── transaction/
│   └── tx-builder.test.ts     # HoosatTxBuilder tests
├── utils/
│   └── utils.test.ts          # HoosatUtils tests
└── qr/
    └── qr.test.ts             # HoosatQR tests
```

### Coverage

The SDK aims for high test coverage of critical components:

- ✅ **HoosatCrypto** - 90%+ coverage
- ✅ **HoosatTxBuilder** - 90%+ coverage
- ✅ **HoosatUtils** - 95%+ coverage
- 🔄 **HoosatClient** - Integration tests
- 🔄 **HoosatFeeEstimator** - Unit tests

---

## 🔧 Development

### Clone Repository

```bash
git clone https://github.com/Namp88/hoosat-sdk.git
cd hoosat-sdk
```

### Install Dependencies

```bash
npm install
```

### Development Commands

```bash
# Build project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Format code
npm run format

# Check formatting
npm run format:check

# Run example
npm run example:node:connect
```

### Adding New Feature

1. Create feature branch
```bash
git checkout -b feature/my-new-feature
```

2. Implement feature in appropriate module

3. Add tests
```typescript
// tests/my-feature/my-feature.test.ts
describe('MyFeature', () => {
  it('should work correctly', () => {
    // Test implementation
  });
});
```

4. Add usage example
```typescript
// examples/my-feature/01-basic-usage.ts
async function main() {
  // Example implementation
}

main();
```

5. Update exports in `src/index.ts`

6. Run tests and formatting
```bash
npm test
npm run format
npm run build
```

7. Create Pull Request

---

## 🤝 Contributing

We welcome contributions! Please:

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open Pull Request**

### Guidelines

- Follow existing code style
- Add tests for new functionality
- Update documentation
- Ensure all tests pass
- Write clear commit messages

### Code Style

```bash
# Format code before committing
npm run format

# Check formatting
npm run format:check
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **Hoosat Official Website:** [https://hoosat.fi](https://hoosat.fi)
- **GitHub Repository:** [https://github.com/Namp88/hoosat-sdk](https://github.com/Namp88/hoosat-sdk)
- **NPM Package:** [https://www.npmjs.com/package/hoosat-sdk](https://www.npmjs.com/package/hoosat-sdk)
- **Issues & Support:** [https://github.com/Namp88/hoosat-sdk/issues](https://github.com/Namp88/hoosat-sdk/issues)

---

## 📞 Support

For questions and support:

- **GitHub Issues:** [https://github.com/Namp88/hoosat-sdk/issues](https://github.com/Namp88/hoosat-sdk/issues)
- **Email:** namp2988@gmail.com
- **Hoosat Community:** Join official Hoosat [channels](https://network.hoosat.fi/)

---

## 🙏 Acknowledgments

Special thanks to:

- **Tonto** - Lead Hoosat developer for invaluable technical guidance and spam protection insights
- **Hoosat Core Team** for building an amazing blockchain
- **All Contributors** and community members who help improve this SDK

---

## 📊 Technical Specifications

### Support

- **Node.js:** >= 20.0.0
- **TypeScript:** >= 5.0.0
- **Networks:** Mainnet, Testnet
- **Address Types:** ECDSA (secp256k1), Schnorr, P2SH

---

**Made with ❤️ for the Hoosat community**

*Version: 0.1.0*
*Last Updated: October 2025*