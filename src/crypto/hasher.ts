import { HoosatCrypto } from '@crypto/crypto';

/**
 * Message prefix used in Bitcoin-style message signing
 * Ensures signatures cannot be replayed as transaction signatures
 */
export const MESSAGE_PREFIX = 'Hoosat Signed Message:\n';

/**
 * Encodes length as variable-length integer (Bitcoin-style varint)
 * @internal
 */
function encodeVarint(value: number): Buffer {
  if (value < 0xfd) {
    const buf = Buffer.alloc(1);
    buf.writeUInt8(value, 0);
    return buf;
  } else if (value <= 0xffff) {
    const buf = Buffer.alloc(3);
    buf.writeUInt8(0xfd, 0);
    buf.writeUInt16LE(value, 1);
    return buf;
  } else if (value <= 0xffffffff) {
    const buf = Buffer.alloc(5);
    buf.writeUInt8(0xfe, 0);
    buf.writeUInt32LE(value, 1);
    return buf;
  } else {
    const buf = Buffer.alloc(9);
    buf.writeUInt8(0xff, 0);
    buf.writeBigUInt64LE(BigInt(value), 1);
    return buf;
  }
}

/**
 * Formats message with prefix (internal step)
 * @param message - Original message text
 * @returns Formatted message with length-prefixed components
 * @internal
 * @example
 * formatMessage('Hello') // "Hoosat Signed Message:\nHello"
 */
export function formatMessage(message: string): Buffer {
  const prefixBuffer = Buffer.from(MESSAGE_PREFIX, 'utf8');
  const messageBuffer = Buffer.from(message, 'utf8');

  // Format: [prefix_length_varint][prefix][message_length_varint][message]
  const prefixLength = encodeVarint(prefixBuffer.length);
  const messageLength = encodeVarint(messageBuffer.length);

  return Buffer.concat([prefixLength, prefixBuffer, messageLength, messageBuffer]);
}

/**
 * Hashes message with BLAKE3 (Hoosat's standard hash function)
 * @param message - Message text to hash
 * @returns 32-byte hash of formatted message
 * @example
 * const hash = hashMessage('Hello, Hoosat!');
 * console.log(hash.toString('hex')); // 64-char hex string
 */
export function hashMessage(message: string): Buffer {
  const formatted = formatMessage(message);
  return HoosatCrypto.blake3Hash(formatted);
}

/**
 * Hashes raw buffer with BLAKE3 (for advanced use cases)
 * @param buffer - Raw data to hash
 * @returns 32-byte hash
 * @example
 * const hash = hashBuffer(Buffer.from('custom data'));
 */
export function hashBuffer(buffer: Buffer): Buffer {
  return HoosatCrypto.blake3Hash(buffer);
}
