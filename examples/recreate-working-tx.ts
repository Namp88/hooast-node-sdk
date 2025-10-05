import { createHash } from 'crypto';
import { CryptoUtils } from '../src/utils/crypto.utils';

console.log('=== RECREATING WORKING TRANSACTION ===\n');

// Входные данные из рабочего примера
const utxo = {
  outpoint: {
    transactionId: '091ea22a707ac840c8291706fca5421a61ee03147f3f9655133d5b62ec38f29f',
    index: 0,
  },
  utxoEntry: {
    amount: '20000000000', // 19999989000 + 1000 + fee
    scriptPublicKey: {
      version: 0,
      script: '2102eddf8d68ad880ec15b9d0de338d62f53630af2efc2e2d3a03e2f7a65c379fbaaab',
    },
    blockDaaScore: '0',
    isCoinbase: false,
  },
};

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
      amount: '1000',
      scriptPublicKey: {
        version: 0,
        scriptPublicKey: '20fe34183d4e783b5dbd572b338d6e4c084ef92fa941a77bbe9b23acf27107f065ac',
      },
    },
    {
      amount: '19999989000',
      scriptPublicKey: {
        version: 0,
        scriptPublicKey: '2102eddf8d68ad880ec15b9d0de338d62f53630af2efc2e2d3a03e2f7a65c379fbaaab',
      },
    },
  ],
  lockTime: '0',
  subnetworkId: '0000000000000000000000000000000000000000',
  gas: '0',
  payload: '',
};

console.log('Testing all 3 script variants:\n');

// Вариант 1: Полный script
const fullScript = '2102eddf8d68ad880ec15b9d0de338d62f53630af2efc2e2d3a03e2f7a65c379fbaaab';
const utxoVar1 = {
  ...utxo,
  utxoEntry: {
    ...utxo.utxoEntry,
    scriptPublicKey: {
      version: 0,
      script: fullScript,
    },
  },
};

const schnorr1 = CryptoUtils.getSignatureHashSchnorr(transaction, 0, utxoVar1);
const ecdsa1 = createHash('sha256').update('TransactionSigningHashECDSA').update(schnorr1).digest();

console.log('VARIANT 1: Full script (0x21 + pubkey + 0xab)');
console.log('  Schnorr hash:', schnorr1.toString('hex'));
console.log('  ECDSA hash:  ', ecdsa1.toString('hex'));

// Вариант 2: Без финального opcode
const scriptNoOpcode = '2102eddf8d68ad880ec15b9d0de338d62f53630af2efc2e2d3a03e2f7a65c379fbaa';
const utxoVar2 = {
  ...utxo,
  utxoEntry: {
    ...utxo.utxoEntry,
    scriptPublicKey: {
      version: 0,
      script: scriptNoOpcode,
    },
  },
};

const schnorr2 = CryptoUtils.getSignatureHashSchnorr(transaction, 0, utxoVar2);
const ecdsa2 = createHash('sha256').update('TransactionSigningHashECDSA').update(schnorr2).digest();

console.log('\nVARIANT 2: Without final opcode (0x21 + pubkey)');
console.log('  Schnorr hash:', schnorr2.toString('hex'));
console.log('  ECDSA hash:  ', ecdsa2.toString('hex'));

// Вариант 3: Только pubkey
const pubkeyOnly = '02eddf8d68ad880ec15b9d0de338d62f53630af2efc2e2d3a03e2f7a65c379fbaa';
const utxoVar3 = {
  ...utxo,
  utxoEntry: {
    ...utxo.utxoEntry,
    scriptPublicKey: {
      version: 0,
      script: pubkeyOnly,
    },
  },
};

const schnorr3 = CryptoUtils.getSignatureHashSchnorr(transaction, 0, utxoVar3);
const ecdsa3 = createHash('sha256').update('TransactionSigningHashECDSA').update(schnorr3).digest();

console.log('\nVARIANT 3: Only pubkey (33 bytes)');
console.log('  Schnorr hash:', schnorr3.toString('hex'));
console.log('  ECDSA hash:  ', ecdsa3.toString('hex'));

console.log('\n=== ANALYSIS ===');
console.log('Expected signature from working example:');
console.log(
  '39574768e48ea741721773853f9ccac044141399a49d9db6240458a5b19faf8d5d9eff33258e31bc09105af3286f176df328b0e89e91be35605607f94ddaaca7'
);
console.log('\nWe need to find which ECDSA hash, when signed with the correct private key,');
console.log('produces this signature. Since we dont have the private key from the working');
console.log('example, we can only compare the hashes we calculate.');
console.log('\nContact the developer (Tonto) and ask him to:');
console.log('1. Share the Schnorr hash for this exact transaction');
console.log('2. Share the ECDSA hash for this exact transaction');
console.log('3. Tell us which script variant is used (full/no opcode/pubkey only)');
