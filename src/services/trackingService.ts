// Tracking Service
// APIs for customer order tracking and delivery tracking

import apiClient from './apiClient';
import { ENDPOINTS } from './config';
import {
    CustomerStatusResponseDTO,
    DeliveryResponseDTO,
    LocationDTO,
} from './types';

class TrackingService {
    /**
     * Get customer-friendly order status
     * Returns simplified status with ETA, progress, and rider info
     */
    async getOrderStatus(customerId: string, orderId: string): Promise<CustomerStatusResponseDTO> {
        return apiClient.get<CustomerStatusResponseDTO>(
            ENDPOINTS.ORDER_STATUS(customerId, orderId)
        );
    }

    /**
     * Get delivery information by order ID
     */
    async getDeliveryByOrderId(orderId: string): Promise<DeliveryResponseDTO> {
        return apiClient.get<DeliveryResponseDTO>(ENDPOINTS.ORDER_DELIVERY(orderId));
    }

    /**
     * Get delivery details by delivery ID
     */
    async getDelivery(deliveryId: string): Promise<DeliveryResponseDTO> {
        return apiClient.get<DeliveryResponseDTO>(ENDPOINTS.DELIVERY(deliveryId));
    }

    /**
     * Get real-time rider location for active delivery
     */
    async getRiderLocation(deliveryId: string): Promise<LocationDTO> {
        return apiClient.get<LocationDTO>(ENDPOINTS.DELIVERY_LOCATION(deliveryId));
    }

    /**
     * Start polling for order status updates
     * Returns a function to stop polling
     */
    startOrderStatusPolling(
        customerId: string,
        orderId: string,
        onUpdate: (status: CustomerStatusResponseDTO) => void,
        onError: (error: Error) => void,
        intervalMs: number = 10000
    ): () => void {
        let isActive = true;

        const poll = async () => {
            if (!isActive) return;

            try {
                const status = await this.getOrderStatus(customerId, orderId);
                onUpdate(status);

                // Stop polling if order is delivered or cancelled
                if (status.status === 'DELIVERED' || status.status === 'CANCELLED') {
                    isActive = false;
                    return;
                }
            } catch (error) {
                onError(error instanceof Error ? error : new Error('Unknown error'));
            }

            if (isActive) {
                setTimeout(poll, intervalMs);
            }
        };

        poll();

        return () => {
            isActive = false;
        };
    }

    /**
     * Start polling for rider location updates
     * Returns a function to stop polling
     */
    startLocationPolling(
        deliveryId: string,
        onUpdate: (location: LocationDTO) => void,
        onError: (error: Error) => void,
        intervalMs: number = 5000
    ): () => void {
        let isActive = true;

        const poll = async () => {
            if (!isActive) return;

            try {
                const location = await this.getRiderLocation(deliveryId);
                onUpdate(location);
            } catch (error) {
                onError(error instanceof Error ? error : new Error('Unknown error'));
            }

            if (isActive) {
                setTimeout(poll, intervalMs);
            }
        };

        poll();

        return () => {
            isActive = false;
        };
    }
}

export const trackingService = new TrackingService();
export default trackingService;
