import { ErrorResponse } from '@client/models/response/error.response';
import { BaseResult } from '@models/base.result';

/**
 * Builds a standardized result object
 * @private
 * @param error - Error from the response
 * @param model - The result data
 * @returns Standardized result object
 */
export function buildResult<T>(error: ErrorResponse | null, model: T): BaseResult<T> {
  const extractedError = error ? error.message : null;

  return {
    ok: !Boolean(extractedError),
    result: Boolean(extractedError) ? null : model,
    error: extractedError,
  };
}
