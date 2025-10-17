'use client';

interface ApiClientOptions {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

class ApiClient {
  private baseUrl: string;
  private defaultOptions: ApiClientOptions;

  constructor(baseUrl: string = '', options: ApiClientOptions = {}) {
    this.baseUrl = baseUrl;
    this.defaultOptions = {
      retries: 3,
      retryDelay: 1000,
      timeout: 10000,
      ...options
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit = {},
    retries: number = this.defaultOptions.retries!
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.defaultOptions.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (retries > 0 && this.shouldRetry(error)) {
        console.warn(`API request failed, retrying... (${retries} attempts left)`);
        await this.delay(this.defaultOptions.retryDelay!);
        return this.fetchWithRetry(url, options, retries - 1);
      }

      throw error;
    }
  }

  private shouldRetry(error: any): boolean {
    if (error.name === 'AbortError') return true;
    if (error.message?.includes('Failed to fetch')) return true;
    if (error.message?.includes('NetworkError')) return true;
    if (error.message?.includes('CLIENT_FETCH_ERROR')) return true;
    return false;
  }

  async get(url: string, options: RequestInit = {}): Promise<Response> {
    return this.fetchWithRetry(`${this.baseUrl}${url}`, {
      ...options,
      method: 'GET',
    });
  }

  async post(url: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return this.fetchWithRetry(`${this.baseUrl}${url}`, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put(url: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return this.fetchWithRetry(`${this.baseUrl}${url}`, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete(url: string, options: RequestInit = {}): Promise<Response> {
    return this.fetchWithRetry(`${this.baseUrl}${url}`, {
      ...options,
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
