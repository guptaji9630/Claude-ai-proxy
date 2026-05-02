import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config';
import { ProxyError } from '../middleware/errorHandler';

export interface APIClientOptions {
  apiKey: string;
  baseUrl: string;
  apiVersion?: string;
}

export class APIClient {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string;

  constructor(options: APIClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl;

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 120000, // 2 minutes for long operations
    });
  }

  /**
   * Make a request to Claude API
   */
  async callClaude(
    endpoint: string,
    body: Record<string, unknown>,
    version?: string
  ): Promise<unknown> {
    try {
      const response = await this.client.post(endpoint, body, {
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': version || config.anthropic.version,
          'content-type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      return this.handleError(error, 'Claude API');
    }
  }

  /**
   * Make a request to NVIDIA NIM API
   */
  async callNIM(
    endpoint: string,
    body: Record<string, unknown>
  ): Promise<unknown> {
    try {
      const response = await this.client.post(endpoint, body, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return response.data;
    } catch (error) {
      return this.handleError(error, 'NVIDIA NIM API');
    }
  }

  /**
   * Handle errors from upstream APIs
   */
  private handleError(error: unknown, source: string): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status || 500;
      const errorData = axiosError.response?.data as Record<string, any>;

      // Extract error message from response
      let message = `${source} request failed`;
      if (errorData?.error && typeof errorData.error === 'object') {
        const errorObj = errorData.error as Record<string, any>;
        if (errorObj.message) {
          message = String(errorObj.message);
        }
      } else if (errorData?.message) {
        message = String(errorData.message);
      } else if (axiosError.message) {
        message = axiosError.message;
      }

      // Map common HTTP status codes to meaningful errors
      const codeMap: Record<number, string> = {
        400: 'bad_request',
        401: 'unauthorized',
        403: 'forbidden',
        404: 'not_found',
        429: 'rate_limit_exceeded',
        500: 'internal_error',
        503: 'service_unavailable',
      };

      const code = codeMap[status] || 'upstream_error';

      throw new ProxyError(
        status,
        code,
        message,
        {
          source,
          upstreamStatus: status,
          upstreamError: errorData?.error || errorData?.type,
        }
      );
    }

    // Handle non-axios errors
    throw new ProxyError(
      500,
      'upstream_error',
      `Error communicating with ${source}: ${String(error)}`,
      { source }
    );
  }
}

/**
 * Creates an API client for Claude API
 */
export function createClaudeClient(): APIClient {
  return new APIClient({
    apiKey: config.anthropic.apiKey!,
    baseUrl: config.anthropic.baseUrl,
    apiVersion: config.anthropic.version,
  });
}

/**
 * Creates an API client for NVIDIA NIM API
 */
export function createNIMClient(): APIClient {
  return new APIClient({
    apiKey: config.nvidia.apiKey!,
    baseUrl: config.nvidia.baseUrl,
  });
}
