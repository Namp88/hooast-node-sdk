import { RequestType } from '@enums/request-type.enum';
import { NodeManager } from '@client/node-manager';

/**
 * Base service class that provides common functionality for all services
 */
export abstract class BaseService {
  protected readonly _client: any;
  protected readonly _timeout: number;
  protected readonly _nodeManager?: NodeManager;
  protected readonly _retryAttempts: number;
  protected readonly _retryDelay: number;

  constructor(
    client: any,
    timeout: number,
    nodeManager?: NodeManager,
    retryAttempts: number = 3,
    retryDelay: number = 1000
  ) {
    this._client = client;
    this._timeout = timeout;
    this._nodeManager = nodeManager;
    this._retryAttempts = retryAttempts;
    this._retryDelay = retryDelay;
  }

  /**
   * Makes a request to the Hoosat node with automatic failover
   * @param command - The RPC command to execute
   * @param params - Parameters for the command
   * @returns Promise with the response
   */
  protected async _request<T>(command: RequestType, params: any = {}): Promise<T> {
    // If no NodeManager, use simple request
    if (!this._nodeManager) {
      return this._makeRequest(this._client, command, params);
    }

    // With NodeManager: try with automatic failover
    let lastError: Error | null = null;
    const maxAttempts = this._retryAttempts;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const currentClient = this._nodeManager.getCurrentClient();
        return await this._makeRequest(currentClient, command, params);
      } catch (error) {
        lastError = error as Error;

        // If this is the last attempt, throw the error
        if (attempt === maxAttempts - 1) {
          break;
        }

        // Try to switch to next node
        const switched = await this._nodeManager.switchToNextNode();

        if (switched) {
          // Wait before retry
          await this._sleep(this._retryDelay);
        } else {
          // No healthy nodes available, throw error
          throw new Error('All nodes are unhealthy: ' + lastError.message);
        }
      }
    }

    throw lastError || new Error('Request failed after all retry attempts');
  }

  /**
   * Makes a single request to a specific client
   */
  private _makeRequest<T>(client: any, command: RequestType, params: any): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request ${command} timed out after ${this._timeout}ms`));
      }, this._timeout);

      try {
        const call = client.MessageStream();
        let responseReceived = false;

        call.on('data', (response: any) => {
          if (!responseReceived) {
            responseReceived = true;
            clearTimeout(timeout);
            call.end();
            resolve(response);
          }
        });

        call.on('error', (error: any) => {
          clearTimeout(timeout);
          reject(new Error(`gRPC error: ${error.message || error}`));
        });

        call.on('end', () => {
          clearTimeout(timeout);
          if (!responseReceived) {
            reject(new Error(`Stream ended without response for ${command}`));
          }
        });

        const message: any = {};
        message[command] = params;
        call.write(message);
      } catch (error) {
        clearTimeout(timeout);
        reject(new Error(`Failed to send request: ${error}`));
      }
    });
  }

  /**
   * Helper to sleep for a specified duration
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
