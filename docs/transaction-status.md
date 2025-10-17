# Transaction Status Checking

## Overview

The Hoosat SDK now provides a comprehensive method to check the status of transactions on the Hoosat Network. You can determine if a transaction is **PENDING** (in mempool), **CONFIRMED** (included in blockchain), or **NOT_FOUND** (rejected or not present).

## Requirements

⚠️ **Important:** Your Hoosat node **must** be started with the `--utxoindex` flag for CONFIRMED status detection to work.

```bash
htnd --utxoindex
```

Without this flag, the SDK can only detect PENDING transactions in the mempool.

## Quick Start

```typescript
import { HoosatClient } from 'hoosat-sdk';

const client = new HoosatClient({
  host: '54.38.176.95',
  port: 42420
});

// Check transaction status
const status = await client.getTransactionStatus(
  'transaction_id_here',
  'sender_address_here',
  'recipient_address_here'
);

if (status.ok) {
  console.log('Status:', status.result.status); // PENDING | CONFIRMED | NOT_FOUND
  console.log('Details:', status.result.details);
}
```

## Transaction Status Types

### 1. PENDING

Transaction is in the mempool, waiting to be included in a block.

```typescript
{
  status: 'PENDING',
  details: {
    txId: 'abc123...',
    inMempool: true,
    isOrphan: false,
    fee: '1000000',
    mass: '250',
    message: 'Transaction is in mempool, waiting for confirmation'
  }
}
```

**Available Details:**
- `inMempool`: Always `true` for PENDING
- `isOrphan`: `true` if transaction references unconfirmed UTXOs
- `fee`: Transaction fee in sompi
- `mass`: Transaction size in bytes
- `message`: Human-readable status message

### 2. CONFIRMED

Transaction has been included in the blockchain.

```typescript
{
  status: 'CONFIRMED',
  details: {
    txId: 'abc123...',
    inMempool: false,
    blockDaaScore: '123456',
    confirmedAmount: '50000000',
    confirmedAddress: 'hoosat:qz...',
    isCoinbase: false,
    message: 'Transaction confirmed in blockchain'
  }
}
```

**Available Details:**
- `blockDaaScore`: The DAA score of the block containing the transaction
- `confirmedAmount`: Amount of the confirmed UTXO in sompi
- `confirmedAddress`: Address where the UTXO was found (recipient or sender change)
- `isCoinbase`: Whether this is a coinbase transaction
- `message`: Human-readable status message

### 3. NOT_FOUND

Transaction was not found in mempool or blockchain.

```typescript
{
  status: 'NOT_FOUND',
  details: {
    txId: 'abc123...',
    inMempool: false,
    message: 'Transaction not found in mempool or UTXOs. Possible reasons: ...'
  }
}
```

**Possible Reasons:**
- Transaction was rejected by the network
- Transaction UTXOs have already been spent
- Transaction ID is incorrect
- Sender/recipient addresses are incorrect
- Node does not have `--utxoindex` enabled
- Transaction is too old and has been pruned

## How It Works

The `getTransactionStatus()` method performs the following checks:

### Step 1: Check Mempool (PENDING)
First, it queries the mempool to see if the transaction is waiting for confirmation.

```typescript
// Internal: client.getMempoolEntry(txId)
```

If found → **PENDING** status

### Step 2: Check Recipient UTXOs (CONFIRMED)
If not in mempool, it checks the recipient's address for UTXOs created by the transaction.

```typescript
// Internal: client.getUtxosByAddresses([recipientAddress])
```

If UTXO with matching txId found → **CONFIRMED** status

### Step 3: Check Sender UTXOs (Additional Verification)
As a fallback, it checks the sender's address for change outputs.

```typescript
// Internal: client.getUtxosByAddresses([senderAddress])
```

If change UTXO with matching txId found → **CONFIRMED** status

### Step 4: Not Found
If none of the above checks succeed → **NOT_FOUND** status

## Why Both Addresses Are Required

### Sender Address
Used to detect change outputs. In many transactions, the sender receives change back from the transaction. This provides an additional way to verify confirmation.

**Example:**
```
Input:  100 HTN (sender's UTXO)
Output: 50 HTN  (to recipient)
Output: 49 HTN  (change to sender)
Fee:    1 HTN
```

### Recipient Address
Primary method for detecting confirmed transactions. Every transaction creates at least one UTXO for the recipient.

**Why it's more reliable:**
- Recipient always gets a new UTXO
- Sender might not get change (if amount + fee = input exactly)
- UTXO remains in recipient's address until spent

## Advanced: Polling for Confirmation

You can continuously poll to monitor transaction confirmation:

```typescript
async function waitForConfirmation(
  client: HoosatClient,
  txId: string,
  senderAddr: string,
  recipientAddr: string
): Promise<boolean> {
  const maxAttempts = 60; // Poll for max 5 minutes
  const pollInterval = 5000; // Check every 5 seconds

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await client.getTransactionStatus(
      txId,
      senderAddr,
      recipientAddr
    );

    if (!result.ok) {
      console.error('Error checking status:', result.error);
      continue;
    }

    if (result.result.status === 'CONFIRMED') {
      console.log('✅ Transaction confirmed!');
      return true;
    }

    if (result.result.status === 'NOT_FOUND') {
      console.log('❌ Transaction not found (may be rejected)');
      return false;
    }

    console.log(`⏳ Still pending... (${attempt}/${maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  console.log('⚠️  Timeout: Transaction still not confirmed');
  return false;
}
```

## Real-Time Monitoring with Events

For more efficient monitoring, use the event streaming API:

```typescript
import { HoosatClient } from 'hoosat-sdk';

const client = new HoosatClient({
  host: '54.38.176.95',
  port: 42420
});

// Subscribe to UTXO changes for the recipient
await client.events.subscribeToUtxoChanges([recipientAddress]);

// Listen for confirmation
client.events.on('utxoChange', (notification) => {
  const confirmedUtxo = notification.added.find(
    utxo => utxo.outpoint.transactionId === txId
  );

  if (confirmedUtxo) {
    console.log('✅ Transaction confirmed!');
    console.log('Block DAA Score:', confirmedUtxo.utxoEntry.blockDaaScore);
    console.log('Amount:', confirmedUtxo.utxoEntry.amount);
  }
});
```

## Error Handling

Always check the `ok` flag before accessing results:

```typescript
const status = await client.getTransactionStatus(txId, sender, recipient);

if (!status.ok) {
  console.error('Failed to get status:', status.error);
  return;
}

// Safe to access status.result
console.log('Status:', status.result.status);
```

## Common Issues

### Issue: Always returns NOT_FOUND for confirmed transactions

**Solution:** Ensure node has `--utxoindex` flag:
```bash
htnd --utxoindex
```

### Issue: PENDING transactions show as NOT_FOUND

**Solution:**
- Wait a few seconds for transaction to propagate
- Check that transaction was actually submitted to the network
- Verify transaction ID is correct

### Issue: Can't find transaction even though it was confirmed

**Solution:**
- Verify sender and recipient addresses are correct
- Check if UTXO was already spent in another transaction
- Transaction may be too old and pruned from UTXO index

## TypeScript Types

```typescript
import type {
  GetTransactionStatus,
  TransactionStatusType,
  TransactionStatusDetails
} from 'hoosat-sdk';

type TransactionStatusType = 'PENDING' | 'CONFIRMED' | 'NOT_FOUND';

interface GetTransactionStatus {
  status: TransactionStatusType;
  details: TransactionStatusDetails;
}

interface TransactionStatusDetails {
  txId: string;
  inMempool?: boolean;
  isOrphan?: boolean;
  fee?: string;
  mass?: string;
  blockDaaScore?: string;
  confirmedAmount?: string;
  confirmedAddress?: string;
  isCoinbase?: boolean;
  message?: string;
}
```

## Complete Example

See the full working example:
```bash
npm run example:transaction:10
```

Located at: `examples/transaction/10-check-transaction-status.ts`

## API Reference

### `client.getTransactionStatus(txId, senderAddress, recipientAddress)`

**Parameters:**
- `txId` (string): Transaction ID to check
- `senderAddress` (string): Sender's Hoosat address
- `recipientAddress` (string): Recipient's Hoosat address

**Returns:** `Promise<BaseResult<GetTransactionStatus>>`

**Throws:** Never throws - returns `BaseResult` with `ok: false` on error

**Example:**
```typescript
const result = await client.getTransactionStatus(
  'abc123...',
  'hoosat:qzsender...',
  'hoosat:qzrecipient...'
);

if (result.ok) {
  const { status, details } = result.result;
  // Handle status
} else {
  console.error('Error:', result.error);
}
```

## Best Practices

1. **Always check node has `--utxoindex` enabled** before relying on CONFIRMED status
2. **Use both sender and recipient addresses** for maximum reliability
3. **Implement polling with reasonable intervals** (5 seconds recommended)
4. **Handle all three status types** in your application logic
5. **Use event streaming** for real-time monitoring when possible
6. **Set timeouts** for polling to avoid infinite loops
7. **Check `ok` flag** before accessing result data

## Migration Guide

If you were previously checking status manually:

### Before
```typescript
// Manual mempool check
const mempool = await client.getMempoolEntry(txId);
if (mempool.ok && mempool.result) {
  console.log('Transaction is pending');
}

// No easy way to check if confirmed
```

### After
```typescript
// Unified status check
const status = await client.getTransactionStatus(txId, sender, recipient);
if (status.ok) {
  switch (status.result.status) {
    case 'PENDING':
      console.log('Transaction is pending');
      break;
    case 'CONFIRMED':
      console.log('Transaction is confirmed');
      break;
    case 'NOT_FOUND':
      console.log('Transaction not found');
      break;
  }
}
```
