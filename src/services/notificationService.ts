// Notification Service for Nashtto Customer App
// Handles FCM initialization, permissions, token management, and message handling

import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import {
    NotificationPayload,
    NotificationPermissionStatus,
    NotificationServiceOptions,
    NotificationType,
} from './notificationTypes';

/**
 * Default service options
 */
const DEFAULT_OPTIONS: NotificationServiceOptions = {
    requestProvisional: false,
    autoRegister: true,
    showForegroundNotifications: true,
};

/**
 * Notification service singleton
 * Manages FCM lifecycle and message handling
 */
class NotificationService {
    private initialized = false;
    private options: NotificationServiceOptions = DEFAULT_OPTIONS;
    private foregroundUnsubscribe: (() => void) | null = null;
    private tokenRefreshUnsubscribe: (() => void) | null = null;
    private notificationOpenedUnsubscribe: (() => void) | null = null;
    private currentToken: string | null = null;

    // Callbacks
    private onNotificationCallback: ((payload: NotificationPayload) => void) | null = null;
    private onNotificationOpenedCallback: ((payload: NotificationPayload) => void) | null = null;
    private onTokenRefreshCallback: ((token: string) => void) | null = null;

    /**
     * Initialize the notification service
     * Call this early in app lifecycle (App.js useEffect)
     */
    async initialize(options?: Partial<NotificationServiceOptions>): Promise<void> {
        if (this.initialized) {
            console.log('[NotificationService] Already initialized');
            return;
        }

        this.options = { ...DEFAULT_OPTIONS, ...options };
        console.log('[NotificationService] Initializing with options:', this.options);

        try {
            // Set up foreground message handler
            this.foregroundUnsubscribe = messaging().onMessage(this.handleForegroundMessage);

            // Set up token refresh handler
            this.tokenRefreshUnsubscribe = messaging().onTokenRefresh(this.handleTokenRefresh);

            // Set up notification opened handler (when app is opened from notification)
            this.notificationOpenedUnsubscribe = messaging().onNotificationOpenedApp(
                this.handleNotificationOpened
            );

            // Check if app was opened from a notification (when app was quit)
            const initialNotification = await messaging().getInitialNotification();
            if (initialNotification) {
                console.log('[NotificationService] App opened from quit state via notification');
                this.handleNotificationOpened(initialNotification);
            }

            // Get initial token
            if (this.options.autoRegister) {
                await this.getToken();
            }

            this.initialized = true;
            console.log('[NotificationService] Initialization complete');
        } catch (error) {
            console.error('[NotificationService] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Request notification permissions
     * Returns true if permission granted
     */
    async requestPermission(): Promise<boolean> {
        try {
            console.log('[NotificationService] Requesting permission...');

            const authStatus = await messaging().requestPermission({
                provisional: this.options.requestProvisional,
            });

            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            console.log('[NotificationService] Permission status:', this.mapAuthStatus(authStatus));
            return enabled;
        } catch (error) {
            console.error('[NotificationService] Permission request failed:', error);
            return false;
        }
    }

    /**
     * Check current permission status
     */
    async getPermissionStatus(): Promise<NotificationPermissionStatus> {
        const authStatus = await messaging().hasPermission();
        return this.mapAuthStatus(authStatus);
    }

    /**
     * Get FCM token for this device
     * Token is used to send targeted notifications
     */
    async getToken(): Promise<string | null> {
        try {
            // Check if we have permission first
            const hasPermission = await messaging().hasPermission();
            if (hasPermission !== messaging.AuthorizationStatus.AUTHORIZED &&
                hasPermission !== messaging.AuthorizationStatus.PROVISIONAL) {
                console.log('[NotificationService] No permission to get token');
                return null;
            }

            const token = await messaging().getToken();
            this.currentToken = token;
            console.log('[NotificationService] FCM Token:', token.substring(0, 20) + '...');
            return token;
        } catch (error) {
            console.error('[NotificationService] Failed to get token:', error);
            return null;
        }
    }

    /**
     * Delete the FCM token (useful for logout)
     */
    async deleteToken(): Promise<void> {
        try {
            await messaging().deleteToken();
            this.currentToken = null;
            console.log('[NotificationService] Token deleted');
        } catch (error) {
            console.error('[NotificationService] Failed to delete token:', error);
        }
    }

    /**
     * Register callback for when notification is received (foreground)
     */
    onNotificationReceived(callback: (payload: NotificationPayload) => void): () => void {
        this.onNotificationCallback = callback;
        return () => {
            this.onNotificationCallback = null;
        };
    }

    /**
     * Register callback for when notification is tapped
     */
    onNotificationOpened(callback: (payload: NotificationPayload) => void): () => void {
        this.onNotificationOpenedCallback = callback;
        return () => {
            this.onNotificationOpenedCallback = null;
        };
    }

    /**
     * Register callback for token refresh
     */
    onTokenRefresh(callback: (token: string) => void): () => void {
        this.onTokenRefreshCallback = callback;
        return () => {
            this.onTokenRefreshCallback = null;
        };
    }

    /**
     * Get the current cached token
     */
    getCurrentToken(): string | null {
        return this.currentToken;
    }

    /**
     * Send FCM token to backend for storage
     * TODO: Implement when backend endpoint is available
     */
    async sendTokenToServer(token: string, customerId: string): Promise<void> {
        console.log('[NotificationService] Would send token to server for customer:', customerId);
        // TODO: Implement API call when endpoint is available
        // Example: await apiClient.put(`/api/v1/customers/${customerId}/fcm-token`, { token });
    }

    /**
     * Cleanup service (call on app unmount)
     */
    cleanup(): void {
        this.foregroundUnsubscribe?.();
        this.tokenRefreshUnsubscribe?.();
        this.notificationOpenedUnsubscribe?.();
        this.initialized = false;
        console.log('[NotificationService] Cleaned up');
    }

    // ============================================================================
    // Private Methods
    // ============================================================================

    private handleForegroundMessage = async (
        remoteMessage: FirebaseMessagingTypes.RemoteMessage
    ): Promise<void> => {
        console.log('[NotificationService] Foreground message received:', remoteMessage.messageId);

        const payload = this.parseRemoteMessage(remoteMessage);

        if (this.onNotificationCallback) {
            this.onNotificationCallback(payload);
        }
    };

    private handleNotificationOpened = (
        remoteMessage: FirebaseMessagingTypes.RemoteMessage
    ): void => {
        console.log('[NotificationService] Notification opened:', remoteMessage.messageId);

        const payload = this.parseRemoteMessage(remoteMessage);

        if (this.onNotificationOpenedCallback) {
            this.onNotificationOpenedCallback(payload);
        }
    };

    private handleTokenRefresh = (token: string): void => {
        console.log('[NotificationService] Token refreshed');
        this.currentToken = token;

        if (this.onTokenRefreshCallback) {
            this.onTokenRefreshCallback(token);
        }
    };

    private parseRemoteMessage(
        remoteMessage: FirebaseMessagingTypes.RemoteMessage
    ): NotificationPayload {
        const data = remoteMessage.data || {};

        return {
            messageId: remoteMessage.messageId || `local-${Date.now()}`,
            type: (data.type as NotificationType) || 'SYSTEM',
            title: remoteMessage.notification?.title || data.title || 'Notification',
            body: remoteMessage.notification?.body || data.body || '',
            data: {
                type: (data.type as NotificationType) || 'SYSTEM',
                orderId: data.orderId,
                status: data.status,
                riderId: data.riderId,
                riderName: data.riderName,
                riderPhone: data.riderPhone,
                promoCode: data.promoCode,
                deepLink: data.deepLink,
                screen: data.screen,
                ...data,
            },
            sentTime: remoteMessage.sentTime,
        };
    }

    private mapAuthStatus(
        status: FirebaseMessagingTypes.AuthorizationStatus
    ): NotificationPermissionStatus {
        switch (status) {
            case messaging.AuthorizationStatus.AUTHORIZED:
                return 'granted';
            case messaging.AuthorizationStatus.DENIED:
                return 'denied';
            case messaging.AuthorizationStatus.PROVISIONAL:
                return 'provisional';
            case messaging.AuthorizationStatus.NOT_DETERMINED:
            default:
                return 'not_determined';
        }
    }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
