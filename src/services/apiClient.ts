// API Client for Nashtto Customer App
// Centralized HTTP client with error handling

import { API_CONFIG, getDefaultHeaders } from './config';
import { ErrorResponse } from './types';

class ApiClient {
    private baseUrl: string;
    private timeout: number;
    // Customer ID is set after authentication via setCustomerId()
    private customerId: string | null = null;

    constructor() {
        this.baseUrl = API_CONFIG.BASE_URL;
        this.timeout = API_CONFIG.TIMEOUT;
    }

    // Set the customer ID for authenticated requests
    setCustomerId(customerId: string | null) {
        this.customerId = customerId;
    }

    getCustomerId(): string | null {
        return this.customerId;
    }

    // Build URL with query parameters
    private buildUrl(endpoint: string, params?: Record<string, any>): string {
        const url = new URL(endpoint, this.baseUrl);

        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    url.searchParams.append(key, String(value));
                }
            });
        }

        return url.toString();
    }

    // Generic request handler with error handling
    private async request<T>(
        method: string,
        endpoint: string,
        options?: {
            params?: Record<string, any>;
            body?: any;
            headers?: Record<string, string>;
        }
    ): Promise<T> {
        const url = this.buildUrl(endpoint, options?.params);

        const headers = {
            ...getDefaultHeaders(this.customerId || undefined),
            ...options?.headers,
        };

        const config: RequestInit = {
            method,
            headers,
        };

        if (options?.body) {
            config.body = JSON.stringify(options.body);
        }

        try {
            console.log(`[API] ${method} ${url}`);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            config.signal = controller.signal;

            const response = await fetch(url, config);
            clearTimeout(timeoutId);

            const data = await response.json();

            if (!response.ok) {
                const error = data as ErrorResponse;
                console.error(`[API Error] ${response.status}: ${error.message}`);
                throw new ApiError(error.message, response.status, error);
            }

            console.log(`[API] Success: ${method} ${endpoint}`);
            return data as T;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }

            if (error instanceof Error) {
                if (error.name === 'AbortError') {
                    throw new ApiError('Request timeout', 408);
                }
                throw new ApiError(error.message, 0);
            }

            throw new ApiError('Unknown error occurred', 0);
        }
    }

    // HTTP Methods
    async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
        return this.request<T>('GET', endpoint, { params });
    }

    async post<T>(endpoint: string, body?: any, params?: Record<string, any>): Promise<T> {
        return this.request<T>('POST', endpoint, { body, params });
    }

    async put<T>(endpoint: string, body?: any): Promise<T> {
        return this.request<T>('PUT', endpoint, { body });
    }

    async patch<T>(endpoint: string, body?: any): Promise<T> {
        return this.request<T>('PATCH', endpoint, { body });
    }

    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>('DELETE', endpoint);
    }
}

// Custom Error class for API errors
export class ApiError extends Error {
    status: number;
    details?: ErrorResponse;

    constructor(message: string, status: number, details?: ErrorResponse) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
