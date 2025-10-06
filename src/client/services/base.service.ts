import { RequestType } from '@enums/request-type.enum';

/**
 * Base service class that provides common functionality for all services
 */
export abstract class BaseService {
  protected readonly _client: any;
  protected readonly _timeout: number;

  constructor(client: any, timeout: number) {
    this._client = client;
    this._timeout = timeout;
  }

  /**
   * Makes a request to the Hoosat node
   * @param command - The RPC command to execute
   * @param params - Parameters for the command
   * @returns Promise with the response
   */
  protected async _request<T>(command: RequestType, params: any = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Request ${command} timed out after ${this._timeout}ms`));
      }, this._timeout);

      try {
        const call = this._client.MessageStream();
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
}
