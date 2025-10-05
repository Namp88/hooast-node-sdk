import * as bech32Hoosat from '../src/utils/crypto.utils';

// Известный публичный ключ и адрес из HTND
const knownPublicKey = Buffer.from('...', 'hex'); // Получи из HTND
const expectedAddress = 'hoosat:qpk...'; // Соответствующий адрес

// Тест энкодинга
const encoded = bech32Hoosat.encode('hoosat', knownPublicKey, 0x01);
console.log('Generated:', encoded);
console.log('Expected: ', expectedAddress);
console.log('Match:', encoded === expectedAddress);

// Тест декодинга (обратная операция)
try {
  const decoded = bech32Hoosat.decode(expectedAddress);
  console.log('Decoded successfully');
  console.log('Version:', decoded.version);
  console.log('Payload length:', decoded.payload.length);
} catch (error) {
  console.error('Decode failed:', error.message);
}
