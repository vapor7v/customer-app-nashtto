// useCheckout Hook - Integrates with real checkout API
// This hook can be used in CartScreen to call the real checkout API

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { checkoutService } from '../services';

/**
 * Hook for handling checkout with real backend API
 * 
 * Usage in CartScreen:
 * const { calculateCheckout, isLoading, checkoutResponse } = useCheckout();
 * 
 * // Then in your handleCheckout function:
 * const response = await calculateCheckout(cartItems, deliveryAddress, couponCode);
 * if (response) {
 *   navigation.navigate('Payment', { checkoutResponse: response, ... });
 * }
 */
export const useCheckout = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [checkoutResponse, setCheckoutResponse] = useState(null);
    const [error, setError] = useState(null);

    const calculateCheckout = useCallback(async (restaurantGroup, deliveryAddress, couponCode) => {
        setIsLoading(true);
        setError(null);

        try {
            const checkoutRequest = {
                userId: 'customer-' + Date.now(), // TODO: Get from auth context
                vendorBranchId: parseInt(restaurantGroup.restaurantId) || 1,
                deliveryAddress: deliveryAddress || {
                    addressLine1: '123 Main Street',
                    city: 'Bangalore',
                    state: 'Karnataka',
                    pincode: '560001',
                },
                deliveryLocation: { latitude: 12.9716, longitude: 77.5946 },
                items: restaurantGroup.items.map(item => ({
                    menuItemId: parseInt(item.id) || 1,
                    quantity: item.quantity,
                    specialInstructions: item.specialInstructions || '',
                })),
                paymentMethod: 'CASH_ON_DELIVERY',
                couponCode: couponCode || undefined,
            };

            console.log('[useCheckout] Request:', JSON.stringify(checkoutRequest, null, 2));

            const response = await checkoutService.calculateCheckout(checkoutRequest);

            console.log('[useCheckout] Response:', JSON.stringify(response, null, 2));

            setCheckoutResponse(response);
            return response;
        } catch (err) {
            console.error('[useCheckout] Error:', err);
            setError(err);
            Alert.alert('Checkout Error', err.message || 'Failed to calculate checkout.');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        calculateCheckout,
        isLoading,
        checkoutResponse,
        error,
    };
};

export default useCheckout;
