import { createHash } from 'crypto';
import { CryptoUtils } from '../src/utils/crypto.utils';

// Рабочий пример из переписки с разработчиком
const workingTx = {
  version: 0,
  inputs: [
    {
      previousOutpoint: {
        transactionId: '091ea22a707ac840c8291706fca5421a61ee03147f3f9655133d5b62ec38f29f',
        index: 0,
      },
      signatureScript:
        '4139574768e48ea741721773853f9ccac044141399a49d9db6240458a5b19faf8d5d9eff33258e31bc09105af3286f176df328b0e89e91be35605607f94ddaaca701',
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

console.log('=== WORKING TRANSACTION FROM DEVELOPER ===\n');

// Вычисляем TX ID рабочей транзакции
const workingTxId = CryptoUtils.getTransactionId(workingTx);
console.log('Our TX ID calculation:', workingTxId);
console.log('Should probably be different from what node calculates\n');

// Анализируем подпись из рабочей транзакции
const workingSigScript = Buffer.from(workingTx.inputs[0].signatureScript, 'hex');
console.log('Working signature script analysis:');
console.log('  Length:', workingSigScript.length, 'bytes');
console.log('  First byte:', '0x' + workingSigScript[0].toString(16), `(${workingSigScript[0]})`);
console.log('  Signature (64 bytes):', workingSigScript.slice(1, 65).toString('hex'));
console.log('  HashType:', '0x' + workingSigScript[65].toString(16));

// Извлекаем pubkey из output script
const outputScript = Buffer.from(workingTx.outputs[1].scriptPublicKey.scriptPublicKey, 'hex');
console.log('\nOutput script analysis:');
console.log('  Full script:', outputScript.toString('hex'));
console.log('  Length:', outputScript.length, 'bytes');
console.log('  First byte (length):', '0x' + outputScript[0].toString(16));
console.log('  Pubkey:', outputScript.slice(1, 34).toString('hex'));
console.log('  Last byte (opcode):', '0x' + outputScript[outputScript.length - 1].toString(16));

console.log('\n=== TRY TO RECREATE THIS TRANSACTION ===\n');
console.log('Use this working example to compare with your implementation');
console.log('The signature in this transaction IS VALID and was accepted by the node');
