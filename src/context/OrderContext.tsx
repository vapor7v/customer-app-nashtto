// Order Context for Nashtto Customer App
// React context for global order state management

import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useReducer,
    useRef,
} from 'react';
import { setOrderStateUpdateHandler } from '../services/notificationHandler';
import { NotificationPayload } from '../services/notificationTypes';
import {
    getOrderStateInfo,
    isTerminalState,
    OrderEvent,
    orderReducer,
    OrderState,
    OrderStateInfo,
    TrackedOrder,
} from '../services/orderStateMachine';
import { CustomerOrderStatus } from '../services/types';

// ============================================================================
// Types
// ============================================================================

interface OrdersState {
    orders: Record<string, TrackedOrder>;
    loading: boolean;
}

type OrdersAction =
    | { type: 'SET_ORDERS'; orders: Record<string, TrackedOrder> }
    | { type: 'ADD_ORDER'; order: TrackedOrder }
    | { type: 'UPDATE_ORDER'; orderId: string; event: OrderEvent }
    | { type: 'REMOVE_ORDER'; orderId: string }
    | { type: 'SET_LOADING'; loading: boolean };

interface OrderContextValue {
    orders: TrackedOrder[];
    activeOrders: TrackedOrder[];
    loading: boolean;
    addOrder: (orderId: string, initialState?: OrderState) => void;
    updateOrderState: (orderId: string, event: OrderEvent) => void;
    updateOrderFromNotification: (orderId: string, status: CustomerOrderStatus) => void;
    removeOrder: (orderId: string) => void;
    getOrder: (orderId: string) => TrackedOrder | null;
    getOrderStateInfo: (orderId: string) => OrderStateInfo | null;
}

// ============================================================================
// Storage
// ============================================================================

const STORAGE_KEY = '@nashtto_tracked_orders';

async function loadOrdersFromStorage(): Promise<Record<string, TrackedOrder>> {
    try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) {
            return JSON.parse(json);
        }
    } catch (error) {
        console.error('[OrderContext] Failed to load orders:', error);
    }
    return {};
}

async function saveOrdersToStorage(
    orders: Record<string, TrackedOrder>
): Promise<void> {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (error) {
        console.error('[OrderContext] Failed to save orders:', error);
    }
}

// ============================================================================
// Reducer
// ============================================================================

function ordersReducer(state: OrdersState, action: OrdersAction): OrdersState {
    switch (action.type) {
        case 'SET_ORDERS':
            return { ...state, orders: action.orders, loading: false };

        case 'ADD_ORDER':
            return {
                ...state,
                orders: { ...state.orders, [action.order.orderId]: action.order },
            };

        case 'UPDATE_ORDER': {
            const existingOrder = state.orders[action.orderId];
            if (!existingOrder) {
                console.warn('[OrderContext] Order not found:', action.orderId);
                return state;
            }
            const updatedOrder = orderReducer(existingOrder, action.event);
            return {
                ...state,
                orders: { ...state.orders, [action.orderId]: updatedOrder },
            };
        }

        case 'REMOVE_ORDER': {
            const { [action.orderId]: removed, ...remaining } = state.orders;
            return { ...state, orders: remaining };
        }

        case 'SET_LOADING':
            return { ...state, loading: action.loading };

        default:
            return state;
    }
}

// ============================================================================
// Context
// ============================================================================

const OrderContext = createContext<OrderContextValue | null>(null);

interface OrderProviderProps {
    children: React.ReactNode;
}

export function OrderProvider({ children }: OrderProviderProps): JSX.Element {
    const [state, dispatch] = useReducer(ordersReducer, {
        orders: {},
        loading: true,
    });

    const stateRef = useRef(state);
    stateRef.current = state;

    // Load orders from storage on mount
    useEffect(() => {
        const loadOrders = async () => {
            const orders = await loadOrdersFromStorage();
            dispatch({ type: 'SET_ORDERS', orders });
        };
        loadOrders();
    }, []);

    // Save orders to storage when they change
    useEffect(() => {
        if (!state.loading) {
            saveOrdersToStorage(state.orders);
        }
    }, [state.orders, state.loading]);

    // Register notification handler
    useEffect(() => {
        const unsubscribe = setOrderStateUpdateHandler(handleNotification);
        return () => {
            unsubscribe();
        };
    }, []);

    // Handle notification from push
    const handleNotification = useCallback((payload: NotificationPayload) => {
        const { orderId, status } = payload.data;
        if (orderId && status) {
            console.log('[OrderContext] Received notification update:', orderId, status);

            // Check if we're tracking this order
            const currentOrders = stateRef.current.orders;
            if (!currentOrders[orderId]) {
                // Add the order if not tracked
                dispatch({
                    type: 'ADD_ORDER',
                    order: {
                        orderId,
                        state: status as OrderState,
                        lastUpdated: new Date().toISOString(),
                    },
                });
            } else {
                // Update existing order
                dispatch({
                    type: 'UPDATE_ORDER',
                    orderId,
                    event: { type: 'SET_STATUS', status: status as OrderState },
                });
            }
        }
    }, []);

    // Context value
    const value: OrderContextValue = {
        orders: Object.values(state.orders),
        activeOrders: Object.values(state.orders).filter(
            (o) => !isTerminalState(o.state)
        ),
        loading: state.loading,

        addOrder: useCallback((orderId: string, initialState: OrderState = 'ORDER_PLACED') => {
            dispatch({
                type: 'ADD_ORDER',
                order: {
                    orderId,
                    state: initialState,
                    lastUpdated: new Date().toISOString(),
                },
            });
        }, []),

        updateOrderState: useCallback((orderId: string, event: OrderEvent) => {
            dispatch({ type: 'UPDATE_ORDER', orderId, event });
        }, []),

        updateOrderFromNotification: useCallback(
            (orderId: string, status: CustomerOrderStatus) => {
                dispatch({
                    type: 'UPDATE_ORDER',
                    orderId,
                    event: { type: 'SET_STATUS', status },
                });
            },
            []
        ),

        removeOrder: useCallback((orderId: string) => {
            dispatch({ type: 'REMOVE_ORDER', orderId });
        }, []),

        getOrder: useCallback(
            (orderId: string) => state.orders[orderId] || null,
            [state.orders]
        ),

        getOrderStateInfo: useCallback(
            (orderId: string) => {
                const order = state.orders[orderId];
                return order ? getOrderStateInfo(order.state) : null;
            },
            [state.orders]
        ),
    };

    return (
        <OrderContext.Provider value={value}>{children}</OrderContext.Provider>
    );
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Use the order context
 */
export function useOrders(): OrderContextValue {
    const context = useContext(OrderContext);
    if (!context) {
        throw new Error('useOrders must be used within an OrderProvider');
    }
    return context;
}

/**
 * Use a specific order by ID
 */
export function useActiveOrder(orderId: string): {
    order: TrackedOrder | null;
    state: OrderState | null;
    stateInfo: OrderStateInfo | null;
    updateState: (event: OrderEvent) => void;
} {
    const { getOrder, getOrderStateInfo: getInfo, updateOrderState } = useOrders();
    const order = getOrder(orderId);

    return {
        order,
        state: order?.state || null,
        stateInfo: order ? getInfo(orderId) : null,
        updateState: (event: OrderEvent) => updateOrderState(orderId, event),
    };
}

export default OrderContext;
