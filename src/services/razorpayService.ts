// Razorpay Payment Service
// Handles payment flow with Razorpay SDK
// Documentation: https://razorpay.com/docs/payments/payment-gateway/react-native-integration/standard/

import RazorpayCheckout from 'react-native-razorpay';

// Razorpay Configuration
export const RAZORPAY_CONFIG = {
    // Test API Key - Replace with live key in production
    KEY_ID: 'rzp_test_RsF4fJfr0d8F0k',
    // Note: API Secret should NEVER be used in client-side code
    // It's only for server-side order creation
    CURRENCY: 'INR',
    COMPANY_NAME: 'Nashtto',
    DESCRIPTION: 'Food Order Payment',
    THEME_COLOR: '#22c55e', // Green theme matching app
};

export interface RazorpayPaymentResult {
    success: boolean;
    paymentId?: string;
    orderId?: string;
    signature?: string;
    error?: {
        code: string;
        description: string;
    };
}

export interface RazorpayOptions {
    description: string;
    image?: string;
    currency: string;
    key: string;
    amount: number; // Amount in paise (smallest currency unit)
    name: string;
    order_id?: string; // Razorpay order ID from backend (if using Orders API)
    prefill: {
        email?: string;
        contact?: string;
        name?: string;
    };
    theme: {
        color: string;
    };
    notes?: Record<string, string>;
}

class RazorpayService {
    /**
     * Initiate payment with Razorpay Checkout
     * 
     * @param amount - Amount in rupees (will be converted to paise)
     * @param checkoutSessionId - Checkout session ID for reference
     * @param customerInfo - Customer details for prefill
     * @returns Payment result with success/failure status
     */
    async initiatePayment(
        amount: number,
        checkoutSessionId: string,
        customerInfo?: {
            name?: string;
            email?: string;
            phone?: string;
        }
    ): Promise<RazorpayPaymentResult> {
        try {
            // Convert amount to paise (Razorpay requires smallest currency unit)
            const amountInPaise = Math.round(amount * 100);

            const options: RazorpayOptions = {
                description: `${RAZORPAY_CONFIG.DESCRIPTION} - ${checkoutSessionId.slice(0, 8)}`,
                currency: RAZORPAY_CONFIG.CURRENCY,
                key: RAZORPAY_CONFIG.KEY_ID,
                amount: amountInPaise,
                name: RAZORPAY_CONFIG.COMPANY_NAME,
                prefill: {
                    email: customerInfo?.email || '',
                    contact: customerInfo?.phone || '',
                    name: customerInfo?.name || '',
                },
                theme: {
                    color: RAZORPAY_CONFIG.THEME_COLOR,
                },
                notes: {
                    checkout_session_id: checkoutSessionId,
                },
            };

            console.log('[RazorpayService] Opening checkout with options:', {
                amount: options.amount,
                currency: options.currency,
                description: options.description,
            });

            // Open Razorpay Checkout
            const data = await RazorpayCheckout.open(options);

            console.log('[RazorpayService] Payment successful:', data);

            return {
                success: true,
                paymentId: data.razorpay_payment_id,
                orderId: data.razorpay_order_id,
                signature: data.razorpay_signature,
            };
        } catch (error: any) {
            console.error('[RazorpayService] Payment failed:', error);

            // Razorpay returns error in specific format
            const errorCode = error?.code || 'UNKNOWN_ERROR';
            const errorDescription = error?.description || error?.message || 'Payment failed';

            return {
                success: false,
                error: {
                    code: String(errorCode),
                    description: errorDescription,
                },
            };
        }
    }

    /**
     * Format error message for display to user
     */
    getErrorMessage(error: { code: string; description: string }): string {
        switch (error.code) {
            case 'BAD_REQUEST_ERROR':
                return 'Invalid payment request. Please try again.';
            case 'GATEWAY_ERROR':
                return 'Payment gateway error. Please try another method.';
            case 'NETWORK_ERROR':
                return 'Network error. Please check your connection.';
            case '2':
                // User cancelled the payment
                return 'Payment was cancelled.';
            default:
                return error.description || 'Payment failed. Please try again.';
        }
    }

    /**
     * Check if error indicates user cancellation
     */
    isUserCancelled(error: { code: string; description: string }): boolean {
        return error.code === '2' || error.description?.toLowerCase().includes('cancelled');
    }
}

export const razorpayService = new RazorpayService();
export default razorpayService;
