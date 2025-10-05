import { CryptoUtils } from '../src/utils/crypto.utils';

async function dumpPreimage() {
  const transaction = {
    version: 0,
    inputs: [
      {
        previousOutpoint: {
          transactionId: '091ea22a707ac840c8291706fca5421a61ee03147f3f9655133d5b62ec38f29f',
          index: 0,
        },
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

  const utxo = {
    outpoint: transaction.inputs[0].previousOutpoint,
    utxoEntry: {
      amount: '20000000000',
      scriptPublicKey: {
        version: 0,
        script: '2102eddf8d68ad880ec15b9d0de338d62f53630af2efc2e2d3a03e2f7a65c379fbaaab',
      },
      blockDaaScore: '0',
      isCoinbase: false,
    },
  };

  // Temporarily modify getSignatureHashSchnorr to dump the preimage
  console.log('Full signature hash preimage (before Blake3 keyed hash):');
  console.log('Send this hex to Tonto and ask him to calculate Blake3 keyed hash');
  console.log('to verify our preimage is correct.\n');

  // For now, calculate the hash
  const schnorrHash = CryptoUtils.getSignatureHashSchnorr(transaction, 0, utxo);
  console.log('Schnorr hash:', schnorrHash.toString('hex'));
}

dumpPreimage();
