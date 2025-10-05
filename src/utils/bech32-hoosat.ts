/**
 * Hoosat Bech32 implementation
 * Based on HTND/util/bech32/bech32.go
 *
 * ИСПРАВЛЕНО: Использует BigInt для корректной работы с большими числами
 */

const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const CHECKSUM_LENGTH = 8;
const GENERATOR = [0x98f2bc8e61, 0x79b76d99e2, 0xf33e5fb3c4, 0xae2eabe2a8, 0x1e4f43e470];

/**
 * Encodes data to Hoosat Bech32 format
 * @param prefix - Address prefix (e.g., "hoosat")
 * @param payload - Raw payload bytes
 * @param version - Version byte (0x00 for Schnorr, 0x01 for ECDSA, 0x08 for ScriptHash)
 */
export function encode(prefix: string, payload: Buffer, version: number): string {
  // 1. Prepend version byte
  const data = Buffer.concat([Buffer.from([version]), payload]);

  // 2. Convert from 8-bit bytes to 5-bit values
  const converted = convertBits(data, 8, 5, true);

  // 3. Calculate checksum
  const checksum = calculateChecksum(prefix, converted);
  const combined = Buffer.concat([converted, checksum]);

  // 4. Encode to base32
  const base32String = encodeToBase32(combined);

  // 5. Format with colon separator (not "1"!)
  return `${prefix}:${base32String}`;
}

/**
 * Decodes Hoosat Bech32 address
 */
export function decode(encoded: string): { prefix: string; payload: Buffer; version: number } {
  // Validation
  if (encoded.length < CHECKSUM_LENGTH + 2) {
    throw new Error(`Invalid bech32 string length ${encoded.length}`);
  }

  // Must be lowercase or uppercase
  const lower = encoded.toLowerCase();
  const upper = encoded.toUpperCase();
  if (encoded !== lower && encoded !== upper) {
    throw new Error('String not all lowercase or all uppercase');
  }

  // Work with lowercase
  const normalized = lower;

  // Find last colon
  const colonIndex = normalized.lastIndexOf(':');
  if (colonIndex < 1 || colonIndex + CHECKSUM_LENGTH + 1 > normalized.length) {
    throw new Error('Invalid index of ":"');
  }

  // Split prefix and data
  const prefix = normalized.slice(0, colonIndex);
  const dataString = normalized.slice(colonIndex + 1);

  // Decode from base32
  const decoded = decodeFromBase32(dataString);

  // Verify checksum
  if (!verifyChecksum(prefix, decoded)) {
    throw new Error('Checksum verification failed');
  }

  // Remove checksum (last 8 bytes)
  const dataWithoutChecksum = decoded.slice(0, -CHECKSUM_LENGTH);

  // Convert from 5-bit to 8-bit
  const converted = convertBits(dataWithoutChecksum, 5, 8, false);

  // Extract version and payload
  const version = converted[0];
  const payload = converted.slice(1);

  return { prefix, payload, version };
}

/**
 * Converts between bit groups
 * ИСПРАВЛЕНО: Более мягкая обработка padding
 */
function convertBits(data: Buffer, fromBits: number, toBits: number, pad: boolean): Buffer {
  const result: number[] = [];
  let accumulator = 0;
  let bits = 0;
  const maxValue = (1 << toBits) - 1;

  for (const value of data) {
    // Проверяем валидность входного значения
    if (value < 0 || value >> fromBits !== 0) {
      throw new Error(`Invalid value for ${fromBits}-bit conversion: ${value}`);
    }

    accumulator = (accumulator << fromBits) | value;
    bits += fromBits;

    while (bits >= toBits) {
      bits -= toBits;
      result.push((accumulator >> bits) & maxValue);
    }
  }

  if (pad) {
    if (bits > 0) {
      result.push((accumulator << (toBits - bits)) & maxValue);
    }
  } else {
    // При декодировании (pad=false) игнорируем padding биты
    // Проверяем только что нет значащих битов
    if (bits >= fromBits) {
      throw new Error('Invalid padding in conversion');
    }
    if (bits > 0 && ((accumulator << (toBits - bits)) & maxValue) !== 0) {
      throw new Error('Non-zero padding bits');
    }
  }

  return Buffer.from(result);
}

/**
 * Encodes to base32 using Hoosat charset
 */
function encodeToBase32(data: Buffer): string {
  let result = '';
  for (const b of data) {
    if (b >= CHARSET.length) {
      throw new Error(`Invalid value for base32: ${b}`);
    }
    result += CHARSET[b];
  }
  return result;
}

/**
 * Decodes from base32 using Hoosat charset
 */
function decodeFromBase32(str: string): Buffer {
  const result: number[] = [];
  for (const char of str) {
    const index = CHARSET.indexOf(char);
    if (index < 0) {
      throw new Error(`Invalid character not part of charset: ${char}`);
    }
    result.push(index);
  }
  return Buffer.from(result);
}

/**
 * Calculates checksum
 * ИСПРАВЛЕНО: Использует BigInt в polyMod
 */
function calculateChecksum(prefix: string, data: Buffer): Buffer {
  const prefixValues = prefixToUint5Array(prefix);
  const values = [
    ...prefixValues,
    0,
    ...Array.from(data),
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0, // 8 zeros
  ];

  const polyModResult = polyMod(values);

  const checksum: number[] = [];
  for (let i = 0; i < CHECKSUM_LENGTH; i++) {
    // Используем BigInt для больших сдвигов
    const shift = 5 * (CHECKSUM_LENGTH - 1 - i);
    const value = Number((BigInt(polyModResult) >> BigInt(shift)) & 31n);
    checksum.push(value);
  }

  return Buffer.from(checksum);
}

/**
 * Verifies checksum
 */
function verifyChecksum(prefix: string, data: Buffer): boolean {
  const prefixValues = prefixToUint5Array(prefix);
  const values = [...prefixValues, 0, ...Array.from(data)];
  return polyMod(values) === 0;
}

/**
 * Converts prefix string to uint5 array
 */
function prefixToUint5Array(prefix: string): number[] {
  const result: number[] = [];
  for (const char of prefix) {
    result.push(char.charCodeAt(0) & 31);
  }
  return result;
}

/**
 * Polynomial modulus for checksum calculation
 * ИСПРАВЛЕНО: Использует BigInt для корректной работы с 40-битными числами
 */
function polyMod(values: number[]): number {
  let checksum = 1n; // BigInt для работы с большими числами!

  for (const value of values) {
    const topBits = checksum >> 35n;
    checksum = ((checksum & 0x07fffffffffn) << 5n) ^ BigInt(value);

    for (let i = 0; i < GENERATOR.length; i++) {
      if ((topBits >> BigInt(i)) & 1n) {
        checksum ^= BigInt(GENERATOR[i]);
      }
    }
  }

  // Возвращаем как обычное число
  return Number(checksum ^ 1n);
}
