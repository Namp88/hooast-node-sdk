import { VALIDATION_PARAMS } from '@constants/validation-params.const';
import { HoosatUtils } from '@utils/utils';

/**
 * Validates a hexadecimal hash
 * @param hash - The hash to validate
 * @returns True if valid, false otherwise
 */
export function isValidHash(hash: string): boolean {
  if (!hash || typeof hash !== 'string') {
    return false;
  }
  return /^[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Validates an array of addresses
 * @param addresses - Array of addresses to validate
 * @throws Error if validation fails
 */
export function validateAddresses(addresses: string[]): void {
  if (!Array.isArray(addresses)) {
    throw new Error('Addresses must be an array');
  }

  if (addresses.length === 0) {
    throw new Error('Addresses array cannot be empty');
  }

  if (addresses.length > VALIDATION_PARAMS.MAX_ADDRESSES_BATCH) {
    throw new Error(`Too many addresses. Maximum ${VALIDATION_PARAMS.MAX_ADDRESSES_BATCH} allowed`);
  }

  const invalidAddresses = addresses.filter(addr => !HoosatUtils.isValidAddress(addr));
  if (invalidAddresses.length > 0) {
    throw new Error(`Invalid addresses: ${invalidAddresses.slice(0, 3).join(', ')}${invalidAddresses.length > 3 ? '...' : ''}`);
  }
}

/**
 * Validates a transaction ID
 * @param txId - Transaction ID to validate
 * @throws Error if validation fails
 */
export function validateTransactionId(txId: string): void {
  if (!txId || typeof txId !== 'string') {
    throw new Error('Transaction ID must be a non-empty string');
  }

  if (!isValidHash(txId)) {
    throw new Error('Transaction ID must be a valid 64-character hexadecimal hash');
  }
}

/**
 * Validates a block hash
 * @param hash - Block hash to validate
 * @throws Error if validation fails
 */
export function validateBlockHash(hash: string): void {
  if (!hash || typeof hash !== 'string') {
    throw new Error('Block hash must be a non-empty string');
  }

  if (!isValidHash(hash)) {
    throw new Error('Block hash must be a valid 64-character hexadecimal hash');
  }
}

/**
 * Validates window size parameter
 * @param windowSize - Window size to validate
 * @throws Error if validation fails
 */
export function validateWindowSize(windowSize: number): void {
  if (!Number.isInteger(windowSize) || windowSize < VALIDATION_PARAMS.MIN_WINDOW_SIZE || windowSize > VALIDATION_PARAMS.MAX_WINDOW_SIZE) {
    throw new Error(`Window size must be an integer between ${VALIDATION_PARAMS.MIN_WINDOW_SIZE} and ${VALIDATION_PARAMS.MAX_WINDOW_SIZE}`);
  }
}
