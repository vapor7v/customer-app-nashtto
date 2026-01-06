// Vendor & Menu Service
// APIs for vendor details, branch info, and menu items

import apiClient from './apiClient';
import { ENDPOINTS } from './config';
import {
    BranchMenuParams,
    BranchResponse,
    MenuItemResponse,
    VendorResponse,
} from './types';

class VendorService {
    /**
     * Get vendor details by vendor ID
     */
    async getVendor(vendorId: number): Promise<VendorResponse> {
        return apiClient.get<VendorResponse>(ENDPOINTS.VENDOR(vendorId));
    }

    /**
     * Get branch details by branch ID
     */
    async getBranch(branchId: number): Promise<BranchResponse> {
        return apiClient.get<BranchResponse>(ENDPOINTS.BRANCH(branchId));
    }

    /**
     * Get menu items for a branch with optional filtering
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
     * List all branches (no filtering)
     */
    async listBranches(params?: { page?: number; size?: number }): Promise<BranchResponse[]> {
        return apiClient.get<BranchResponse[]>(ENDPOINTS.BRANCHES, {
            page: params?.page || 0,
            size: params?.size || 100,
        });
    }

    /**
     * List all vendors (no filtering)
     */
    async listVendors(params?: { page?: number; size?: number }): Promise<VendorResponse[]> {
        return apiClient.get<VendorResponse[]>(ENDPOINTS.VENDORS, {
            page: params?.page || 0,
            size: params?.size || 100,
        });
    }

    /**
     * Get single menu item details
     */
    async getMenuItem(menuItemId: number): Promise<MenuItemResponse> {
        return apiClient.get<MenuItemResponse>(ENDPOINTS.MENU_ITEM(menuItemId));
    }
}

export const vendorService = new VendorService();
export default vendorService;
