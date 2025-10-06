/**
 * Mass Calculator for Hoosat Transactions
 *
 * This module provides accurate mass calculation for Hoosat transactions
 * based on the actual htn-core implementation.
 *
 * Mass is used instead of simple byte size for fee calculation because
 * it accounts for computational cost of different transaction components.
 */

/**
 * Mass calculation constants from htn-core
 * @see lib/transaction/transaction.js in htn-core
 */
export const MassConstants = {
  /** Mass per transaction byte */
  MassPerTxByte: 1,

  /** Mass per scriptPubKey byte (10x more expensive!) */
  MassPerScriptPubKeyByte: 10,

  /** Mass per signature operation */
  MassPerSigOp: 1000,

  /** Estimated mass per output (approximate) */
  EstimatedOutputMass: 27,

  /** Base transaction overhead */
  BaseTxOverhead: 10,

  /** Estimated input size in bytes */
  EstimatedInputSize: 151,

  /** Estimated scriptPubKey size per output */
  EstimatedScriptPubKeySize: 34,
} as const;

/**
 * Result of mass calculation
 */
export interface MassCalculationResult {
  /** Total transaction mass */
  mass: number;

  /** Transaction size in bytes */
  txSize: number;

  /** ScriptPubKey size in bytes */
  scriptPubKeySize: number;

  /** Number of signature operations */
  sigOpsCount: number;

  /** Equivalent size for fee calculation (mass / 10) */
  equivalentSize: number;

  /** Breakdown of mass components */
  breakdown: {
    baseMass: number;
    scriptPubKeyMass: number;
    sigOpsMass: number;
  };
}

/**
 * Calculate transaction mass based on inputs and outputs
 *
 * This implements the same logic as htn-core's getMassAndSize() method
 *
 * @param inputs - Number of transaction inputs
 * @param outputs - Number of transaction outputs
 * @returns Detailed mass calculation result
 *
 * @example
 * ```typescript
 * const result = calculateTransactionMass(1, 4);
 * console.log('Mass:', result.mass);
 * console.log('Equivalent size:', result.equivalentSize);
 * ```
 */
export function calculateTransactionMass(inputs: number, outputs: number): MassCalculationResult {
  // Calculate transaction size in bytes
  // txSize = base + (inputs × inputSize)
  const txSize = MassConstants.BaseTxOverhead + inputs * MassConstants.EstimatedInputSize;

  // Calculate scriptPubKey size
  // Each output has: version (2 bytes) + scriptPubKey (~34 bytes)
  const scriptPubKeySize = outputs * (2 + MassConstants.EstimatedScriptPubKeySize);

  // Calculate standalone mass (without signature operations)
  // mass = (txSize × 1) + (scriptPubKeySize × 10)
  const baseMass = txSize * MassConstants.MassPerTxByte;
  const scriptPubKeyMass = scriptPubKeySize * MassConstants.MassPerScriptPubKeyByte;
  const standaloneMass = baseMass + scriptPubKeyMass;

  // Calculate signature operations mass
  // Each input requires 1 signature operation
  const sigOpsCount = inputs;
  const sigOpsMass = sigOpsCount * MassConstants.MassPerSigOp;

  // Total mass
  const totalMass = standaloneMass + sigOpsMass;

  // Equivalent size for fee calculation
  // In htn-core, fee is calculated as: fee / (mass / 10)
  // So we convert mass to "equivalent bytes"
  const equivalentSize = Math.ceil(totalMass / 10);

  return {
    mass: totalMass,
    txSize,
    scriptPubKeySize,
    sigOpsCount,
    equivalentSize,
    breakdown: {
      baseMass,
      scriptPubKeyMass,
      sigOpsMass,
    },
  };
}

/**
 * Calculate fee based on mass and fee rate
 *
 * @param inputs - Number of transaction inputs
 * @param outputs - Number of transaction outputs
 * @param feeRate - Fee rate in sompi per byte
 * @param minFee - Minimum fee in sompi (default: 1000)
 * @returns Fee in sompi as string
 *
 * @example
 * ```typescript
 * const fee = calculateFeeFromMass(1, 4, 5); // 1 input, 4 outputs, 5 sompi/byte
 * console.log('Fee:', fee, 'sompi');
 * ```
 */
export function calculateFeeFromMass(inputs: number, outputs: number, feeRate: number, minFee: number = 1000): string {
  const { equivalentSize } = calculateTransactionMass(inputs, outputs);

  // Calculate fee based on equivalent size
  const calculatedFee = equivalentSize * feeRate;

  // Apply minimum fee
  const finalFee = Math.max(calculatedFee, minFee);

  return finalFee.toString();
}

/**
 * Calculate fee with security margin check
 *
 * This implements the FEE_SECURITY_MARGIN logic from htn-core
 *
 * @param inputs - Number of transaction inputs
 * @param outputs - Number of transaction outputs
 * @param feeRate - Fee rate in sompi per byte
 * @param securityMargin - Security margin multiplier (default: 150)
 * @returns Object with min, recommended, and max fees
 *
 * @example
 * ```typescript
 * const fees = calculateFeeWithMargin(1, 4, 5);
 * console.log('Min fee:', fees.minFee);
 * console.log('Recommended:', fees.recommendedFee);
 * console.log('Max fee:', fees.maxFee);
 * ```
 */
export function calculateFeeWithMargin(
  inputs: number,
  outputs: number,
  feeRate: number,
  securityMargin: number = 150
): {
  minFee: string;
  recommendedFee: string;
  maxFee: string;
  massDetails: MassCalculationResult;
} {
  const massDetails = calculateTransactionMass(inputs, outputs);
  const baseFee = massDetails.equivalentSize * feeRate;

  // From htn-core:
  // minimumFee = Math.ceil(estimatedFee / FEE_SECURITY_MARGIN)
  // maximumFee = Math.floor(FEE_SECURITY_MARGIN * estimatedFee)
  const minFee = Math.ceil(baseFee / securityMargin);
  const maxFee = Math.floor(securityMargin * baseFee);
  const recommendedFee = Math.max(baseFee, 1000); // Apply min fee of 1000

  return {
    minFee: minFee.toString(),
    recommendedFee: recommendedFee.toString(),
    maxFee: maxFee.toString(),
    massDetails,
  };
}

/**
 * Pretty print mass calculation details
 *
 * @param inputs - Number of inputs
 * @param outputs - Number of outputs
 * @param feeRate - Fee rate in sompi/byte
 */
export function printMassCalculation(inputs: number, outputs: number, feeRate: number): void {
  const result = calculateTransactionMass(inputs, outputs);
  const fee = calculateFeeFromMass(inputs, outputs, feeRate);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   📊 MASS CALCULATION DETAILS');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Transaction Structure:');
  console.log(`  Inputs:  ${inputs}`);
  console.log(`  Outputs: ${outputs}\n`);

  console.log('Size Calculation:');
  console.log(`  Base overhead:       ${MassConstants.BaseTxOverhead} bytes`);
  console.log(
    `  Input size:          ${inputs} × ${MassConstants.EstimatedInputSize} = ${inputs * MassConstants.EstimatedInputSize} bytes`
  );
  console.log(`  Transaction size:    ${result.txSize} bytes`);
  console.log(`  ScriptPubKey size:   ${result.scriptPubKeySize} bytes\n`);

  console.log('Mass Calculation:');
  console.log(`  Base mass:           ${result.breakdown.baseMass} (txSize × ${MassConstants.MassPerTxByte})`);
  console.log(`  ScriptPubKey mass:   ${result.breakdown.scriptPubKeyMass} (scriptPubKeySize × ${MassConstants.MassPerScriptPubKeyByte})`);
  console.log(`  Signature ops mass:  ${result.breakdown.sigOpsMass} (${result.sigOpsCount} × ${MassConstants.MassPerSigOp})`);
  console.log(`  Total mass:          ${result.mass}\n`);

  console.log('Fee Calculation:');
  console.log(`  Equivalent size:     ${result.equivalentSize} bytes (mass / 10)`);
  console.log(`  Fee rate:            ${feeRate} sompi/byte`);
  console.log(`  Calculated fee:      ${fee} sompi`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

/**
 * Compare SDK's old method vs mass-based method
 *
 * @param inputs - Number of inputs
 * @param outputs - Number of outputs
 * @param feeRate - Fee rate
 */
export function compareCalculationMethods(inputs: number, outputs: number, feeRate: number): void {
  // Old SDK method (incorrect)
  const oldSize = 10 + inputs * 150 + outputs * 35;
  const oldFee = Math.max(oldSize * feeRate, 1000);

  // New mass-based method (correct)
  const newFee = parseInt(calculateFeeFromMass(inputs, outputs, feeRate));
  const massResult = calculateTransactionMass(inputs, outputs);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('   ⚖️  COMPARISON: OLD vs NEW METHOD');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log(`Transaction: ${inputs} inputs, ${outputs} outputs @ ${feeRate} sompi/byte\n`);

  console.log('❌ OLD SDK Method (Incorrect):');
  console.log(`  Formula: size = 10 + (inputs × 150) + (outputs × 35)`);
  console.log(`  Size:    ${oldSize} bytes`);
  console.log(`  Fee:     ${oldFee} sompi\n`);

  console.log('✅ NEW Mass-Based Method (Correct):');
  console.log(`  Formula: mass = (txSize × 1) + (scriptPubKey × 10) + (sigOps × 1000)`);
  console.log(`  Mass:    ${massResult.mass}`);
  console.log(`  Equiv:   ${massResult.equivalentSize} bytes`);
  console.log(`  Fee:     ${newFee} sompi\n`);

  const difference = newFee - oldFee;
  const percentDiff = ((difference / oldFee) * 100).toFixed(1);

  console.log('📈 Difference:');
  console.log(`  ${difference > 0 ? '+' : ''}${difference} sompi (${percentDiff}%)`);

  if (difference > 0) {
    console.log(`  ⚠️  Old method underestimated fee by ${difference} sompi!`);
    console.log(`  This is why transactions were rejected as spam.\n`);
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}

// Export for use in other modules
export default {
  calculateTransactionMass,
  calculateFeeFromMass,
  calculateFeeWithMargin,
  printMassCalculation,
  compareCalculationMethods,
  MassConstants,
};
