// Order State Machine for Nashtto Customer App
// Manages order lifecycle states and transitions

import { CustomerOrderStatus } from './types';

/**
 * Order states matching backend CustomerOrderStatus
 */
export type OrderState = CustomerOrderStatus;

/**
 * All possible order states
 */
export const ORDER_STATES: OrderState[] = [
    'ORDER_PLACED',
    'ORDER_CONFIRMED',
    'PREPARING',
    'RIDER_ASSIGNED',
    'READY_FOR_PICKUP',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
];

/**
 * Terminal states - order lifecycle is complete
 */
export const TERMINAL_STATES: OrderState[] = ['DELIVERED', 'CANCELLED'];

/**
 * Cancellable states - order can be cancelled
 */
export const CANCELLABLE_STATES: OrderState[] = [
    'ORDER_PLACED',
    'ORDER_CONFIRMED',
    'PREPARING',
];

/**
 * State transition events
 */
export type OrderEvent =
    | { type: 'CONFIRM' }
    | { type: 'START_PREPARING' }
    | { type: 'ASSIGN_RIDER'; riderId: string; riderName: string; riderPhone?: string }
    | { type: 'READY_FOR_PICKUP' }
    | { type: 'PICK_UP' }
    | { type: 'DELIVER' }
    | { type: 'CANCEL'; reason?: string }
    | { type: 'SET_STATUS'; status: OrderState }; // Direct status update from server

/**
 * Valid transitions from each state
 */
const VALID_TRANSITIONS: Record<OrderState, OrderEvent['type'][]> = {
    ORDER_PLACED: ['CONFIRM', 'CANCEL', 'SET_STATUS'],
    ORDER_CONFIRMED: ['START_PREPARING', 'CANCEL', 'SET_STATUS'],
    PREPARING: ['READY_FOR_PICKUP', 'ASSIGN_RIDER', 'CANCEL', 'SET_STATUS'],
    RIDER_ASSIGNED: ['READY_FOR_PICKUP', 'PICK_UP', 'CANCEL', 'SET_STATUS'],
    READY_FOR_PICKUP: ['PICK_UP', 'ASSIGN_RIDER', 'CANCEL', 'SET_STATUS'],
    OUT_FOR_DELIVERY: ['DELIVER', 'SET_STATUS'],
    DELIVERED: ['SET_STATUS'], // Terminal state
    CANCELLED: ['SET_STATUS'], // Terminal state
};

/**
 * State metadata for UI
 */
export interface OrderStateInfo {
    state: OrderState;
    label: string;
    description: string;
    progress: number; // 0-100
    icon: string;
    color: string;
}

/**
 * Get metadata for a state
 */
export function getOrderStateInfo(state: OrderState): OrderStateInfo {
    const stateInfoMap: Record<OrderState, OrderStateInfo> = {
        ORDER_PLACED: {
            state: 'ORDER_PLACED',
            label: 'Order Placed',
            description: 'Your order has been received',
            progress: 10,
            icon: 'receipt-outline',
            color: '#3b82f6',
        },
        ORDER_CONFIRMED: {
            state: 'ORDER_CONFIRMED',
            label: 'Confirmed',
            description: 'Restaurant has accepted your order',
            progress: 25,
            icon: 'checkmark-circle-outline',
            color: '#22c55e',
        },
        PREPARING: {
            state: 'PREPARING',
            label: 'Preparing',
            description: 'Your food is being prepared',
            progress: 40,
            icon: 'restaurant-outline',
            color: '#f59e0b',
        },
        RIDER_ASSIGNED: {
            state: 'RIDER_ASSIGNED',
            label: 'Rider Assigned',
            description: 'A rider has been assigned to your order',
            progress: 55,
            icon: 'bicycle-outline',
            color: '#8b5cf6',
        },
        READY_FOR_PICKUP: {
            state: 'READY_FOR_PICKUP',
            label: 'Ready for Pickup',
            description: 'Your order is ready and waiting for the rider',
            progress: 65,
            icon: 'bag-check-outline',
            color: '#06b6d4',
        },
        OUT_FOR_DELIVERY: {
            state: 'OUT_FOR_DELIVERY',
            label: 'Out for Delivery',
            description: 'Your order is on its way',
            progress: 80,
            icon: 'car-outline',
            color: '#ec4899',
        },
        DELIVERED: {
            state: 'DELIVERED',
            label: 'Delivered',
            description: 'Your order has been delivered',
            progress: 100,
            icon: 'checkmark-done-circle',
            color: '#22c55e',
        },
        CANCELLED: {
            state: 'CANCELLED',
            label: 'Cancelled',
            description: 'Your order has been cancelled',
            progress: 0,
            icon: 'close-circle-outline',
            color: '#ef4444',
        },
    };

    return stateInfoMap[state] || stateInfoMap.ORDER_PLACED;
}

/**
 * Check if a transition is valid
 */
export function isValidTransition(
    currentState: OrderState,
    event: OrderEvent
): boolean {
    const validEvents = VALID_TRANSITIONS[currentState] || [];
    return validEvents.includes(event.type);
}

/**
 * Get the next state for a given event
 */
export function getNextState(
    currentState: OrderState,
    event: OrderEvent
): OrderState {
    // SET_STATUS allows any state change (from server)
    if (event.type === 'SET_STATUS') {
        return event.status;
    }

    // Check if transition is valid
    if (!isValidTransition(currentState, event)) {
        console.warn(
            `[OrderStateMachine] Invalid transition: ${currentState} + ${event.type}`
        );
        return currentState;
    }

    // State transition map
    switch (event.type) {
        case 'CONFIRM':
            return 'ORDER_CONFIRMED';
        case 'START_PREPARING':
            return 'PREPARING';
        case 'ASSIGN_RIDER':
            return 'RIDER_ASSIGNED';
        case 'READY_FOR_PICKUP':
            return 'READY_FOR_PICKUP';
        case 'PICK_UP':
            return 'OUT_FOR_DELIVERY';
        case 'DELIVER':
            return 'DELIVERED';
        case 'CANCEL':
            return 'CANCELLED';
        default:
            return currentState;
    }
}

/**
 * Check if order is in a terminal state
 */
export function isTerminalState(state: OrderState): boolean {
    return TERMINAL_STATES.includes(state);
}

/**
 * Check if order can be cancelled
 */
export function canCancel(state: OrderState): boolean {
    return CANCELLABLE_STATES.includes(state);
}

/**
 * Get progress percentage for UI
 */
export function getProgressPercentage(state: OrderState): number {
    return getOrderStateInfo(state).progress;
}

/**
 * Tracked order with metadata
 */
export interface TrackedOrder {
    orderId: string;
    state: OrderState;
    previousState?: OrderState;
    riderInfo?: {
        riderId: string;
        name: string;
        phone?: string;
    };
    estimatedMinutes?: number;
    lastUpdated: string;
    cancelReason?: string;
}

/**
 * Order state machine reducer
 */
export function orderReducer(
    order: TrackedOrder,
    event: OrderEvent
): TrackedOrder {
    const previousState = order.state;
    const nextState = getNextState(order.state, event);

    // If no state change, return as-is
    if (nextState === previousState && event.type !== 'SET_STATUS') {
        return order;
    }

    const updatedOrder: TrackedOrder = {
        ...order,
        state: nextState,
        previousState,
        lastUpdated: new Date().toISOString(),
    };

    // Handle rider assignment
    if (event.type === 'ASSIGN_RIDER') {
        updatedOrder.riderInfo = {
            riderId: event.riderId,
            name: event.riderName,
            phone: event.riderPhone,
        };
    }

    // Handle cancellation
    if (event.type === 'CANCEL') {
        updatedOrder.cancelReason = event.reason;
    }

    console.log(
        `[OrderStateMachine] ${order.orderId}: ${previousState} -> ${nextState}`
    );

    return updatedOrder;
}
