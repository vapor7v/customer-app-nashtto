// Menu Service
// APIs for menu item operations - get items, branches menu, vendor menu with recommendations

import apiClient from './apiClient';
import { ENDPOINTS } from './config';
import {
    BranchMenuParams,
    MenuItemResponse,
    VendorMenuParams,
    VendorMenuResponse,
} from './types';

class MenuService {
    /**
     * Get single menu item details by menu item ID
     */
    async getMenuItem(menuItemId: number): Promise<MenuItemResponse> {
        return apiClient.get<MenuItemResponse>(ENDPOINTS.MENU_ITEM(menuItemId));
    }

    /**
     * Get all menu items for a branch with optional filtering and pagination
     * Uses the Menu Management API endpoint
     */
    async getBranchMenu(
        branchId: number,
        params?: BranchMenuParams
    ): Promise<MenuItemResponse[]> {
        return apiClient.get<MenuItemResponse[]>(ENDPOINTS.BRANCH_MENU(branchId), {
            category: params?.category,
            page: params?.page || 0,
            size: params?.size || 50,
        });
    }

    /**
     * Get vendor menu with recommendations via Search & Discovery API
     * Returns categories, recommendations, and popular items
     */
    async getVendorMenuWithRecommendations(
        branchId: number,
        params?: Omit<VendorMenuParams, 'branchId'>
    ): Promise<VendorMenuResponse> {
        return apiClient.get<VendorMenuResponse>(ENDPOINTS.VENDOR_MENU(branchId), {
            userId: params?.userId,
            latitude: params?.latitude,
            longitude: params?.longitude,
        });
    }

    /**
     * Get menu items by category for a branch
     * Convenience method for filtering by category
     */
    async getMenuItemsByCategory(
        branchId: number,
        category: string,
        page?: number,
        size?: number
    ): Promise<MenuItemResponse[]> {
        return this.getBranchMenu(branchId, { category, page, size });
    }
}

export const menuService = new MenuService();
export default menuService;
