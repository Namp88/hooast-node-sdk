/**
 * Hoosat Bech32 implementation
 * Based on HTND/util/bech32/bech32.go
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
 * ТОЧНАЯ копия из HTND/util/bech32/bech32.go
 */
function convertBits(data: Buffer, fromBits: number, toBits: number, pad: boolean): Buffer {
  const result: number[] = [];
  let nextByte = 0;
  let filledBits = 0;

  for (const b of data) {
    // Discard unused bits
    let value = b << (8 - fromBits);

    let remainingFromBits = fromBits;
    while (remainingFromBits > 0) {
      const remainingToBits = toBits - filledBits;

      // Extract minimum of remaining bits
      const toExtract = Math.min(remainingFromBits, remainingToBits);

      // Add bits to nextByte
      nextByte = (nextByte << toExtract) | (value >> (8 - toExtract));

      // Update for next iteration
      value = value << toExtract;
      remainingFromBits -= toExtract;
      filledBits += toExtract;

      // If byte is full, add to result
      if (filledBits === toBits) {
        result.push(nextByte);
        filledBits = 0;
        nextByte = 0;
      }
    }
  }

  // Pad if needed
  if (pad && filledBits > 0) {
    nextByte = nextByte << (toBits - filledBits);
    result.push(nextByte);
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
    checksum.push((polyModResult >> (5 * (CHECKSUM_LENGTH - 1 - i))) & 31);
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
 */
function polyMod(values: number[]): number {
  let checksum = 1;

  for (const value of values) {
    const topBits = checksum >>> 35; // Используй >>> (unsigned shift)
    checksum = ((checksum & 0x07ffffffff) << 5) ^ value;

    for (let i = 0; i < GENERATOR.length; i++) {
      if ((topBits >>> i) & 1) {
        // Используй >>> везде
        checksum ^= GENERATOR[i];
      }
    }
  }

  return checksum ^ 1;
}
