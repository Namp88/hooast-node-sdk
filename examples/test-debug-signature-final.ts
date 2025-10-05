import { HoosatCrypto } from '../src/crypto/crypto';
import { createHash } from 'crypto';
import { HoosatNode } from '../src';

async function testSubscriptVariants() {
  const node = new HoosatNode({
    host: '54.38.176.95',
    port: 42420,
  });

  const wallet = HoosatCrypto.importKeyPair('33a4a81ecd31615c51385299969121707897fb1e167634196f31bd311de5fe43');
  console.log('Wallet:', wallet.address);

  // Получаем UTXO
  const utxosRes = await node.getUtxosByAddresses([wallet.address]);
  if (!utxosRes.ok || utxosRes.result.utxos.length === 0) {
    console.error('No UTXOs found');
    return;
  }

  const utxo = utxosRes.result.utxos[0];
  console.log('\nUTXO script:', utxo.utxoEntry.scriptPublicKey.scriptPublicKey);

  const scriptFull = Buffer.from(utxo.utxoEntry.scriptPublicKey.scriptPublicKey, 'hex');
  console.log('Full script:', scriptFull.toString('hex'), `(${scriptFull.length} bytes)`);

  // Извлекаем pubkey
  const pubkey = scriptFull.slice(1, 34);
  console.log('Pubkey:', pubkey.toString('hex'), `(${pubkey.length} bytes)`);

  // Создаем простую транзакцию
  const transaction = {
    version: 0,
    inputs: [
      {
        previousOutpoint: utxo.outpoint,
        signatureScript: '',
        sequence: '0',
        sigOpCount: 1,
      },
    ],
    outputs: [
      {
        amount: '1000000',
        scriptPublicKey: {
          scriptPublicKey: HoosatCrypto.addressToScriptPublicKey(wallet.address).toString('hex'),
          version: 0,
        },
      },
    ],
    lockTime: '0',
    subnetworkId: '0000000000000000000000000000000000000000',
    gas: '0',
    payload: '',
  };

  console.log('\n=== VARIANT 1: Full script (0x21 + pubkey + 0xab) ===');
  let utxoVar1 = {
    outpoint: utxo.outpoint,
    utxoEntry: {
      amount: utxo.utxoEntry.amount,
      scriptPublicKey: {
        version: 0,
        script: scriptFull.toString('hex'),
      },
      blockDaaScore: utxo.utxoEntry.blockDaaScore,
      isCoinbase: utxo.utxoEntry.isCoinbase,
    },
  };

  const schnorr1 = HoosatCrypto.getSignatureHashSchnorr(transaction, 0, utxoVar1);
  const ecdsa1 = createHash('sha256').update('TransactionSigningHashECDSA').update(schnorr1).digest();
  console.log('Schnorr:', schnorr1.toString('hex'));
  console.log('ECDSA:  ', ecdsa1.toString('hex'));

  console.log('\n=== VARIANT 2: Without final opcode (0x21 + pubkey) ===');
  const scriptNoOpcode = scriptFull.slice(0, -1);
  let utxoVar2 = {
    outpoint: utxo.outpoint,
    utxoEntry: {
      amount: utxo.utxoEntry.amount,
      scriptPublicKey: {
        version: 0,
        script: scriptNoOpcode.toString('hex'),
      },
      blockDaaScore: utxo.utxoEntry.blockDaaScore,
      isCoinbase: utxo.utxoEntry.isCoinbase,
    },
  };

  const schnorr2 = HoosatCrypto.getSignatureHashSchnorr(transaction, 0, utxoVar2);
  const ecdsa2 = createHash('sha256').update('TransactionSigningHashECDSA').update(schnorr2).digest();
  console.log('Schnorr:', schnorr2.toString('hex'));
  console.log('ECDSA:  ', ecdsa2.toString('hex'));

  console.log('\n=== VARIANT 3: Only pubkey (33 bytes) ===');
  let utxoVar3 = {
    outpoint: utxo.outpoint,
    utxoEntry: {
      amount: utxo.utxoEntry.amount,
      scriptPublicKey: {
        version: 0,
        script: pubkey.toString('hex'),
      },
      blockDaaScore: utxo.utxoEntry.blockDaaScore,
      isCoinbase: utxo.utxoEntry.isCoinbase,
    },
  };

  const schnorr3 = HoosatCrypto.getSignatureHashSchnorr(transaction, 0, utxoVar3);
  const ecdsa3 = createHash('sha256').update('TransactionSigningHashECDSA').update(schnorr3).digest();
  console.log('Schnorr:', schnorr3.toString('hex'));
  console.log('ECDSA:  ', ecdsa3.toString('hex'));

  console.log('\n=== COMPARISON ===');
  console.log('Variant 1 vs 2:', schnorr1.equals(schnorr2) ? '❌ Same' : '✅ Different');
  console.log('Variant 1 vs 3:', schnorr1.equals(schnorr3) ? '❌ Same' : '✅ Different');
  console.log('Variant 2 vs 3:', schnorr2.equals(schnorr3) ? '❌ Same' : '✅ Different');
}

testSubscriptVariants().catch(console.error);
