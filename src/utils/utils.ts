import * as bech32Hoosat from '@utils/bech32-hoosat';
import { VALIDATION_PARAMS } from '@constants/validation-params.const';

export class HoosatUtils {
  /**
   * Formats an amount from sompi (smallest unit) to HTN (readable format)
   *
   * @param sompi - Amount in sompi as string or bigint
   * @returns Formatted amount in HTN with 8 decimal places
   */
  static sompiToAmount(sompi: string | bigint): string {
    const amount = typeof sompi === 'string' ? BigInt(sompi) : sompi;
    return (Number(amount) / 100000000).toFixed(8);
  }

  /**
   * Parses an amount from HTN (readable format) to sompi (smallest unit)
   *
   * @param htn - Amount in HTN as string
   * @returns Amount in sompi as string
   */
  static amountToSompi(htn: string): string {
    const amount = parseFloat(htn) * 100000000;
    return BigInt(Math.round(amount)).toString();
  }

  /**
   * Validates a Hoosat address format
   *
   * @param address - HTN address as string
   * @returns True if valid, false otherwise
   */
  static isValidAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }

    if (!address.startsWith(VALIDATION_PARAMS.ADDRESS_PREFIX)) {
      return false;
    }

    try {
      const decoded = bech32Hoosat.decode(address);
      return [0x00, 0x01, 0x08].includes(decoded.version);
    } catch {
      return false;
    }
  }
}
