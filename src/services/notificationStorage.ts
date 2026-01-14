// Notification Storage Service for Nashtto Customer App
// Local storage for notifications using AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationPayload, StoredNotification } from './notificationTypes';

const STORAGE_KEY = '@nashtto_notifications';
const MAX_NOTIFICATIONS = 100;
const RETENTION_DAYS = 7;

/**
 * Notification storage service
 * Persists notifications locally for the notifications screen
 */
class NotificationStorage {
    private cache: StoredNotification[] | null = null;

    /**
     * Store a new notification
     */
    async store(payload: NotificationPayload): Promise<StoredNotification> {
        const notifications = await this.getAll();

        const storedNotification: StoredNotification = {
            id: payload.messageId || `notif-${Date.now()}`,
            type: payload.type,
            title: payload.title,
            body: payload.body,
            data: payload.data,
            read: false,
            receivedAt: new Date().toISOString(),
        };

        // Add to beginning (newest first)
        notifications.unshift(storedNotification);

        // Limit to max notifications
        const trimmed = notifications.slice(0, MAX_NOTIFICATIONS);

        await this.save(trimmed);
        console.log('[NotificationStorage] Stored notification:', storedNotification.id);

        return storedNotification;
    }

    /**
     * Get all stored notifications
     */
    async getAll(): Promise<StoredNotification[]> {
        if (this.cache) {
            return this.cache;
        }

        try {
            const json = await AsyncStorage.getItem(STORAGE_KEY);
            if (json) {
                const notifications = JSON.parse(json) as StoredNotification[];
                // Filter out expired notifications
                const valid = this.filterExpired(notifications);
                this.cache = valid;
                return valid;
            }
        } catch (error) {
            console.error('[NotificationStorage] Failed to get notifications:', error);
        }

        this.cache = [];
        return [];
    }

    /**
     * Get unread notifications
     */
    async getUnread(): Promise<StoredNotification[]> {
        const all = await this.getAll();
        return all.filter(n => !n.read);
    }

    /**
     * Get unread count
     */
    async getUnreadCount(): Promise<number> {
        const unread = await this.getUnread();
        return unread.length;
    }

    /**
     * Mark a notification as read
     */
    async markAsRead(notificationId: string): Promise<void> {
        const notifications = await this.getAll();
        const updated = notifications.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
        );
        await this.save(updated);
        console.log('[NotificationStorage] Marked as read:', notificationId);
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(): Promise<void> {
        const notifications = await this.getAll();
        const updated = notifications.map(n => ({ ...n, read: true }));
        await this.save(updated);
        console.log('[NotificationStorage] Marked all as read');
    }

    /**
     * Delete a notification
     */
    async delete(notificationId: string): Promise<void> {
        const notifications = await this.getAll();
        const filtered = notifications.filter(n => n.id !== notificationId);
        await this.save(filtered);
        console.log('[NotificationStorage] Deleted notification:', notificationId);
    }

    /**
     * Clear all notifications
     */
    async clearAll(): Promise<void> {
        await AsyncStorage.removeItem(STORAGE_KEY);
        this.cache = [];
        console.log('[NotificationStorage] Cleared all notifications');
    }

    /**
     * Clear expired notifications (older than retention period)
     */
    async clearExpired(): Promise<number> {
        const notifications = await this.getAll();
        const valid = this.filterExpired(notifications);
        const removed = notifications.length - valid.length;

        if (removed > 0) {
            await this.save(valid);
            console.log('[NotificationStorage] Cleared', removed, 'expired notifications');
        }

        return removed;
    }

    /**
     * Get notification by ID
     */
    async getById(notificationId: string): Promise<StoredNotification | null> {
        const notifications = await this.getAll();
        return notifications.find(n => n.id === notificationId) || null;
    }

    /**
     * Get notifications by type
     */
    async getByType(type: string): Promise<StoredNotification[]> {
        const all = await this.getAll();
        return all.filter(n => n.type === type);
    }

    // ============================================================================
    // Private Methods
    // ============================================================================

    private async save(notifications: StoredNotification[]): Promise<void> {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
            this.cache = notifications;
        } catch (error) {
            console.error('[NotificationStorage] Failed to save notifications:', error);
        }
    }

    private filterExpired(notifications: StoredNotification[]): StoredNotification[] {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

        return notifications.filter(n => {
            const receivedDate = new Date(n.receivedAt);
            return receivedDate > cutoffDate;
        });
    }
}

// Export singleton instance
export const notificationStorage = new NotificationStorage();
export default notificationStorage;
