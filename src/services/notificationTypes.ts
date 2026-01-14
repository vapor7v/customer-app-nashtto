// Notification Types for Nashtto Customer App
// Type definitions for push notification payloads

import { CustomerOrderStatus, RiderInfoDTO } from './types';

/**
 * Types of notifications the app can receive
 */
export type NotificationType =
    | 'ORDER_STATUS_UPDATE'  // Order lifecycle updates
    | 'DELIVERY_UPDATE'      // Rider location/status updates
    | 'PROMOTIONAL'          // Marketing & offers
    | 'PROMO_CODE'           // Discount codes
    | 'SYSTEM';              // App updates, maintenance

/**
 * FCM Data payload structure
 * Maps to the 'data' field in FCM messages
 */
export interface NotificationData {
    type: NotificationType;
    // Order-related
    orderId?: string;
    status?: CustomerOrderStatus;
    // Rider-related
    riderId?: string;
    riderName?: string;
    riderPhone?: string;
    // Promo-related
    promoCode?: string;
    discountPercent?: number;
    expiresAt?: string;
    // Navigation
    deepLink?: string;
    screen?: string;
    // Generic
    [key: string]: any;
}

/**
 * Full notification payload combining title, body, and data
 */
export interface NotificationPayload {
    messageId: string;
    type: NotificationType;
    title: string;
    body: string;
    data: NotificationData;
    sentTime?: number;
}

/**
 * Stored notification with local metadata
 */
export interface StoredNotification {
    id: string;
    type: NotificationType;
    title: string;
    body: string;
    data: NotificationData;
    read: boolean;
    receivedAt: string;
    expiresAt?: string;
}

/**
 * Order state update event from push notification
 */
export interface OrderStateUpdateEvent {
    orderId: string;
    previousStatus?: CustomerOrderStatus;
    newStatus: CustomerOrderStatus;
    riderInfo?: RiderInfoDTO;
    message?: string;
    timestamp: string;
}

/**
 * Notification permission status
 */
export type NotificationPermissionStatus =
    | 'granted'
    | 'denied'
    | 'not_determined'
    | 'provisional';

/**
 * Notification service initialization options
 */
export interface NotificationServiceOptions {
    // Request provisional authorization on iOS (quiet notifications)
    requestProvisional?: boolean;
    // Auto-register for remote notifications
    autoRegister?: boolean;
    // Show notifications when app is in foreground
    showForegroundNotifications?: boolean;
}
