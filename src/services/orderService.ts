// Order Service
// APIs for order management - create, list, get, cancel, and tracking

import apiClient from './apiClient';
import { ENDPOINTS } from './config';
import {
    CancelOrderRequest,
    CreateOrderFromCheckoutRequest,
    CustomerStatusResponseDTO,
    DeliveryResponseDTO,
    ListOrdersParams,
    OrderDetailsResponse,
    OrderState
} from './types';

class OrderService {
    /**
     * Create order from checkout session
     * Executes payment and creates the order
     */
    async createOrder(request: CreateOrderFromCheckoutRequest): Promise<OrderDetailsResponse> {
        return apiClient.post<OrderDetailsResponse>(ENDPOINTS.ORDERS, request);
    }

    /**
     * List orders for the authenticated customer
     * Optionally filter by order state
     */
    async listOrders(params?: ListOrdersParams): Promise<OrderDetailsResponse[]> {
        return apiClient.get<OrderDetailsResponse[]>(ENDPOINTS.ORDERS, {
            state: params?.state,
        });
    }

    /**
     * Get order details by order ID
     */
    async getOrder(orderId: string): Promise<OrderDetailsResponse> {
        return apiClient.get<OrderDetailsResponse>(ENDPOINTS.ORDER(orderId));
    }

    /**
     * Cancel an order if it's in a cancellable state
     */
    async cancelOrder(orderId: string, request: CancelOrderRequest): Promise<OrderDetailsResponse> {
        return apiClient.post<OrderDetailsResponse>(ENDPOINTS.ORDER_CANCEL(orderId), request);
    }

    /**
     * Get customer-facing order status with progress and ETA
     * Returns simplified status for tracking UI
     */
    async getOrderStatus(customerId: string, orderId: string): Promise<CustomerStatusResponseDTO> {
        return apiClient.get<CustomerStatusResponseDTO>(ENDPOINTS.ORDER_STATUS(customerId, orderId));
    }

    /**
     * Get delivery information for an order
     * Returns rider info, tracking, and delivery timestamps
     */
    async getOrderDelivery(orderId: string): Promise<DeliveryResponseDTO> {
        return apiClient.get<DeliveryResponseDTO>(ENDPOINTS.ORDER_DELIVERY(orderId));
    }

    /**
     * Get orders by state - convenience methods
     */
    async getActiveOrders(): Promise<OrderDetailsResponse[]> {
        // Active orders are those not in terminal states
        const allOrders = await this.listOrders();
        const terminalStates: OrderState[] = ['DELIVERED', 'CLOSED', 'CANCELLED', 'REJECTED'];
        return allOrders.filter(order => !terminalStates.includes(order.orderState as OrderState));
    }

    async getPastOrders(): Promise<OrderDetailsResponse[]> {
        // Past orders are in terminal states
        const allOrders = await this.listOrders();
        const terminalStates: OrderState[] = ['DELIVERED', 'CLOSED', 'CANCELLED', 'REJECTED'];
        return allOrders.filter(order => terminalStates.includes(order.orderState as OrderState));
    }
}

export const orderService = new OrderService();
export default orderService;
