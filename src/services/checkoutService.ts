// Checkout Service
// APIs for checkout calculation and session management
// Note: Order creation is handled by orderService.createOrder() per OpenAPI spec

import apiClient from './apiClient';
import { ENDPOINTS } from './config';
import {
    CheckoutRequest,
    CheckoutResponse,
} from './types';

class CheckoutService {
    /**
     * Calculate checkout - validates cart and calculates pricing
     * This is step 1 of the two-step checkout process
     * Creates an idempotent checkout session
     */
    async calculateCheckout(request: CheckoutRequest): Promise<CheckoutResponse> {
        const headers: Record<string, string> = {};
        if (request.userId) {
            headers['X-User-Id'] = request.userId;
        }

        return apiClient.post<CheckoutResponse>(
            ENDPOINTS.CHECKOUT_CALCULATE,
            request,
            undefined
        );
    }

    /**
     * Get existing checkout session by ID
     */
    async getCheckoutSession(sessionId: string): Promise<CheckoutResponse> {
        return apiClient.get<CheckoutResponse>(ENDPOINTS.CHECKOUT_SESSION(sessionId));
    }

    /**
     * Health check for checkout service
     */
    async healthCheck(): Promise<string> {
        return apiClient.get<string>(ENDPOINTS.CHECKOUT_HEALTH);
    }

    /**
     * @deprecated Use orderService.createOrder() instead
     * Order creation now uses POST /api/v1/orders endpoint
     */
    // commitCheckout is removed - use orderService.createOrder() instead
}

export const checkoutService = new CheckoutService();
export default checkoutService;
