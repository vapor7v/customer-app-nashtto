// Notification Handler for Nashtto Customer App
// Routes notifications to appropriate handlers and manages navigation

import { NavigationContainerRef } from '@react-navigation/native';
import { notificationService } from './notificationService';
import { notificationStorage } from './notificationStorage';
import { NotificationPayload } from './notificationTypes';

// Navigation reference - set from App.js
let navigationRef: NavigationContainerRef<any> | null = null;

// Order state update callback - set from OrderContext
let onOrderStateUpdate: ((payload: NotificationPayload) => void) | null = null;

/**
 * Set the navigation reference for deep linking
 */
export function setNavigationRef(ref: NavigationContainerRef<any>): void {
    navigationRef = ref;
}

/**
 * Register callback for order state updates
 * Called by OrderContext to receive state change notifications
 */
export function setOrderStateUpdateHandler(
    handler: (payload: NotificationPayload) => void
): () => void {
    onOrderStateUpdate = handler;
    return () => {
        onOrderStateUpdate = null;
    };
}

/**
 * Setup notification handler
 * Call this after notificationService.initialize()
 */
export function setupNotificationHandler(): void {
    console.log('[NotificationHandler] Setting up handlers');

    // Handle foreground notifications
    notificationService.onNotificationReceived(handleNotification);

    // Handle notification taps
    notificationService.onNotificationOpened(handleNotificationTap);

    console.log('[NotificationHandler] Handlers registered');
}

/**
 * Handle incoming notification (foreground)
 */
async function handleNotification(payload: NotificationPayload): Promise<void> {
    console.log('[NotificationHandler] Received notification:', payload.type, payload.title);

    // Store notification locally
    await notificationStorage.store(payload);

    // Route based on notification type
    switch (payload.type) {
        case 'ORDER_STATUS_UPDATE':
            handleOrderStatusUpdate(payload);
            break;
        case 'DELIVERY_UPDATE':
            handleDeliveryUpdate(payload);
            break;
        case 'PROMOTIONAL':
        case 'PROMO_CODE':
            // Just store - no special handling needed
            console.log('[NotificationHandler] Promotional notification stored');
            break;
        case 'SYSTEM':
        default:
            console.log('[NotificationHandler] System notification stored');
            break;
    }
}

/**
 * Handle notification tap (opens app from notification)
 */
function handleNotificationTap(payload: NotificationPayload): void {
    console.log('[NotificationHandler] Notification tapped:', payload.type);

    // Navigate based on notification type
    switch (payload.type) {
        case 'ORDER_STATUS_UPDATE':
        case 'DELIVERY_UPDATE':
            if (payload.data.orderId) {
                navigateToScreen('Tracking', { orderId: payload.data.orderId });
            }
            break;
        case 'PROMOTIONAL':
        case 'PROMO_CODE':
            if (payload.data.promoCode) {
                // Navigate to cart with promo code
                navigateToScreen('Cart', { promoCode: payload.data.promoCode });
            } else {
                navigateToScreen('Home');
            }
            break;
        default:
            // Check for deep link
            if (payload.data.screen) {
                navigateToScreen(payload.data.screen, payload.data);
            }
            break;
    }
}

/**
 * Handle order status update notification
 */
function handleOrderStatusUpdate(payload: NotificationPayload): void {
    console.log('[NotificationHandler] Order status update:', payload.data.orderId, '->', payload.data.status);

    // Notify order state machine
    if (onOrderStateUpdate) {
        onOrderStateUpdate(payload);
    }
}

/**
 * Handle delivery update notification
 */
function handleDeliveryUpdate(payload: NotificationPayload): void {
    console.log('[NotificationHandler] Delivery update:', payload.data.orderId);

    // Also treat as order state update if status is provided
    if (payload.data.status && onOrderStateUpdate) {
        onOrderStateUpdate(payload);
    }
}

/**
 * Navigate to a screen
 */
function navigateToScreen(screenName: string, params?: object): void {
    if (!navigationRef) {
        console.warn('[NotificationHandler] Navigation ref not set');
        return;
    }

    if (!navigationRef.isReady()) {
        console.warn('[NotificationHandler] Navigator not ready, delaying navigation');
        // Retry after a short delay
        setTimeout(() => navigateToScreen(screenName, params), 500);
        return;
    }

    console.log('[NotificationHandler] Navigating to:', screenName, params);
    navigationRef.navigate(screenName, params);
}

// Export for testing
export const _testHelpers = {
    handleNotification,
    handleNotificationTap,
};
