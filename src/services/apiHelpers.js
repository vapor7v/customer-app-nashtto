// API Hooks and Helpers for Screen Integration
// This file provides easy-to-use functions that can replace mock API calls progressively

import { checkoutService } from './checkoutService';
import { orderService } from './orderService';
import { searchService } from './searchService';
import { trackingService } from './trackingService';

// Default location (Mumbai) - in production, get from device location
const DEFAULT_LOCATION = {
    latitude: 19.0760,
    longitude: 72.8777,
};

/**
 * Search API wrapper that transforms response to match existing UI
 */
export async function searchWithRealAPI(query, category = null) {
    try {
        const response = await searchService.search({
            q: query || '',
            type: 'all',
            latitude: DEFAULT_LOCATION.latitude,
            longitude: DEFAULT_LOCATION.longitude,
            radiusKm: 5,
        });

        return {
            success: true,
            results: {
                vendors: response.results?.vendors?.map(v => ({
                    id: v.branchId,
                    name: v.displayName || v.branchName,
                    rating: v.rating,
                    time: v.deliveryTime,
                    distance: `${v.distance} ${v.distanceUnit || 'km'}`,
                    image: v.images?.primary || 'https://images.unsplash.com/photo-1648192312898-838f9b322f47',
                    offers: v.tags?.join(', ') || '',
                    price: `₹${v.minOrderValue} min order`,
                })) || [],
                items: response.results?.items?.map(i => ({
                    id: i.menuItemId,
                    name: i.name,
                    price: i.price,
                    vendorName: i.branchName,
                    vendorId: i.branchId,
                    category: i.category,
                    image: i.images?.primary || 'https://images.unsplash.com/photo-1648192312898-838f9b322f47',
                })) || [],
                total: (response.results?.vendors?.length || 0) + (response.results?.items?.length || 0),
            },
        };
    } catch (error) {
        console.log('[API Helpers] Search error:', error.message);
        throw error;
    }
}

/**
 * Discovery feed API wrapper
 */
export async function getDiscoveryFeedWithRealAPI(userId = null) {
    try {
        const response = await searchService.getDiscoveryFeed({
            latitude: DEFAULT_LOCATION.latitude,
            longitude: DEFAULT_LOCATION.longitude,
            radius: 5,
            userId,
        });

        return {
            success: true,
            vendors: response.nearbyVendors?.map(v => ({
                id: v.branchId,
                name: v.displayName || v.branchName,
                rating: v.rating,
                time: v.deliveryTime,
                distance: `${v.distance} ${v.distanceUnit || 'km'}`,
                image: v.images?.primary || 'https://images.unsplash.com/photo-1648192312898-838f9b322f47',
                offers: v.tags?.[0] || '',
                price: `₹${v.minOrderValue || 100} for two`,
                promoted: false,
                description: v.cuisine?.join(', ') || '',
                menu: [],
            })) || [],
            popularItems: response.popularItems?.map(i => ({
                id: i.menuItemId,
                name: i.name,
                price: i.price,
                vendorId: i.branchId,
                vendorName: i.branchName,
            })) || [],
            recommendations: response.recommendedItems || [],
        };
    } catch (error) {
        console.log('[API Helpers] Discovery feed error:', error.message);
        throw error;
    }
}

/**
 * Vendor menu API wrapper
 */
export async function getVendorMenuWithRealAPI(branchId) {
    try {
        const response = await searchService.getVendorMenu({
            branchId,
            latitude: DEFAULT_LOCATION.latitude,
            longitude: DEFAULT_LOCATION.longitude,
        });

        // Flatten categories into a single menu array
        const menuItems = [];
        response.categories?.forEach(category => {
            category.items?.forEach(item => {
                menuItems.push({
                    id: item.menuItemId,
                    name: item.name,
                    price: item.price,
                    category: category.categoryName || item.category,
                    image: item.images?.primary || 'https://images.unsplash.com/photo-1648192312898-838f9b322f47',
                    description: item.description,
                    isAvailable: item.isAvailable !== false,
                });
            });
        });

        return {
            success: true,
            menu: menuItems,
            vendor: response.vendor ? {
                id: response.vendor.branchId,
                name: response.vendor.displayName || response.vendor.branchName,
                rating: response.vendor.rating,
                time: response.vendor.deliveryTime,
            } : null,
        };
    } catch (error) {
        console.log('[API Helpers] Vendor menu error:', error.message);
        throw error;
    }
}

/**
 * Orders list API wrapper
 */
export async function getOrdersWithRealAPI() {
    try {
        const orders = await orderService.listOrders();

        return {
            success: true,
            orders: orders.map(order => ({
                id: order.orderId,
                vendorName: order.items?.[0]?.itemName || 'Restaurant',
                status: formatOrderState(order.state),
                total: order.totalAmount,
                date: new Date(order.createdAt).toISOString().split('T')[0],
                items: order.items?.map(item => ({
                    name: item.itemName,
                    quantity: item.quantity,
                    price: item.priceAtOrder,
                })) || [],
            })),
        };
    } catch (error) {
        console.log('[API Helpers] Orders error:', error.message);
        throw error;
    }
}

/**
 * Order status tracking API wrapper
 */
export async function getOrderStatusWithRealAPI(customerId, orderId) {
    try {
        const status = await trackingService.getOrderStatus(customerId, orderId);

        return {
            success: true,
            status: status.status,
            primaryMessage: status.primaryMessage,
            secondaryMessage: status.secondaryMessage,
            progressPercentage: status.progressPercentage,
            canCancel: status.canCancel,
            estimatedMinutes: status.estimatedMinutesRemaining,
            riderInfo: status.riderInfo,
        };
    } catch (error) {
        console.log('[API Helpers] Order status error:', error.message);
        throw error;
    }
}

/**
 * Checkout calculate API wrapper
 */
export async function calculateCheckoutWithRealAPI(userId, branchId, items, deliveryAddress) {
    try {
        const response = await checkoutService.calculateCheckout({
            userId,
            vendorBranchId: branchId,
            deliveryAddress: deliveryAddress || {
                addressLine1: '123 Test Street',
                city: 'Mumbai',
                state: 'Maharashtra',
                pincode: '400001',
            },
            deliveryLocation: DEFAULT_LOCATION,
            items: items.map(item => ({
                menuItemId: item.id || item.menuItemId,
                quantity: item.quantity,
            })),
            paymentMethod: 'UPI',
        });

        return {
            success: true,
            sessionId: response.checkoutSessionId,
            pricing: response.pricing,
            deliveryEstimate: response.deliveryEstimate,
            validations: response.validations,
            items: response.items,
        };
    } catch (error) {
        console.log('[API Helpers] Checkout error:', error.message);
        throw error;
    }
}

// Helper function to format order state for display
function formatOrderState(state) {
    const stateMap = {
        'CREATED': 'Pending',
        'VALIDATED': 'Confirmed',
        'PAYMENT_CONFIRMED': 'Confirmed',
        'PENDING_ACCEPTANCE': 'Pending',
        'ACCEPTED': 'Confirmed',
        'PREPARING': 'Preparing',
        'READY_FOR_PICKUP': 'Ready',
        'ASSIGNED_TO_RIDER': 'Out for Delivery',
        'PICKED_UP': 'Out for Delivery',
        'DELIVERED': 'Delivered',
        'CLOSED': 'Delivered',
        'CANCELLED': 'Cancelled',
        'REJECTED': 'Cancelled',
    };
    return stateMap[state] || state;
}

export default {
    searchWithRealAPI,
    getDiscoveryFeedWithRealAPI,
    getVendorMenuWithRealAPI,
    getOrdersWithRealAPI,
    getOrderStatusWithRealAPI,
    calculateCheckoutWithRealAPI,
};
