export class HoosatUtils {
  /**
   * Utility: Format sompi to HTN
   */
  static formatAmount(sompi: string | bigint): string {
    const amount = typeof sompi === 'string' ? BigInt(sompi) : sompi;
    return (Number(amount) / 100000000).toFixed(8);
  }

  /**
   * Utility: Parse HTN to sompi
   */
  static parseAmount(hoo: string): string {
    const amount = parseFloat(hoo) * 100000000;
    return BigInt(Math.floor(amount)).toString();
  }
}
