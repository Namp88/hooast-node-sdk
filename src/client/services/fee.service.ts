import { HoosatCrypto } from '@crypto/crypto';
import { AddressService } from '@client/services/address.service';
import { HoosatUtils } from '@utils/utils';

/**
 * Service for calculating minimum transaction fee
 *
 * Automatically fetches UTXOs for sender address and calculates
 * the minimum fee based on actual transaction inputs/outputs count
 */
export class TransactionFeeService {
  private _addressService: AddressService;

  constructor(addressService: AddressService) {
    this._addressService = addressService;
  }

  /**
   * Calculate minimum transaction fee for sender address
   *
   * This method:
   * 1. Fetches UTXOs for the sender address
   * 2. Counts inputs (number of UTXOs)
   * 3. Assumes 2 outputs (recipient + change)
   * 4. Calculates minimum fee using HoosatCrypto.calculateMinFee()
   *
   * @param address - Sender address to calculate fee for
   * @param payloadSize - Payload size in bytes (default: 0, for future use)
   * @returns Minimum fee in sompi
   *
   * @example
   * ```typescript
   * const feeService = new TransactionFeeService(addressService);
   * const minFee = await feeService.calculateMinFee('hoosat:qz7ulu...');
   * console.log('Minimum fee:', minFee, 'sompi');
   * ```
   *
   * @example
   * ```typescript
   * // With payload (for future subnetwork usage)
   * const minFeeWithPayload = await feeService.calculateMinFee('hoosat:qz7ulu...', 256);
   * ```
   */
  async calculateMinFee(address: string, payloadSize: number = 0): Promise<string> {
    // Validate address
    if (!HoosatUtils.isValidAddress(address)) {
      throw new Error(`Invalid address: ${address}`);
    }

    // Get UTXOs for sender address
    const utxosResult = await this._addressService.getUtxosByAddresses([address]);

    if (!utxosResult.ok || !utxosResult.result) {
      throw new Error('Failed to fetch UTXOs for address');
    }

    const utxos = utxosResult.result.utxos;

    if (!utxos || utxos.length === 0) {
      throw new Error('No UTXOs available for this address');
    }

    // Calculate fee based on actual UTXO count
    const numInputs = utxos.length;
    const numOutputs = 2; // recipient + change

    // Use HoosatCrypto static method for calculation
    const fee = HoosatCrypto.calculateMinFee(numInputs, numOutputs, payloadSize);

    return fee;
  }
}
