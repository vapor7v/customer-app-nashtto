// Search & Discovery Service
// APIs for searching vendors/items and getting discovery feed

import apiClient from './apiClient';
import { ENDPOINTS } from './config';
import {
    DiscoveryFeedParams,
    DiscoveryFeedResponse,
    RecommendationParams,
    RecommendationResponse,
    SearchParams,
    SearchResponse,
    VendorMenuParams,
    VendorMenuResponse,
} from './types';

class SearchService {
    /**
     * Execute unified search with hybrid ranking
     * Searches both vendors and menu items
     */
    async search(params: SearchParams): Promise<SearchResponse> {
        return apiClient.get<SearchResponse>(ENDPOINTS.SEARCH, {
            q: params.q,
            type: params.type || 'all',
            latitude: params.latitude,
            longitude: params.longitude,
            page: params.page || 0,
            size: params.size || 20,
            city: params.city,
            radiusKm: params.radiusKm || 5,
        });
    }

    /**
     * Get personalized discovery feed
     * Returns nearby vendors, popular items, recommendations, and trending items
     */
    async getDiscoveryFeed(params: DiscoveryFeedParams): Promise<DiscoveryFeedResponse> {
        return apiClient.get<DiscoveryFeedResponse>(ENDPOINTS.DISCOVERY_FEED, {
            latitude: params.latitude,
            longitude: params.longitude,
            radius: params.radius || 5,
            userId: params.userId,
            page: params.page || 0,
            size: params.size || 20,
        });
    }

    /**
     * Get personalized recommendations
     * Based on user preferences, order history, and time of day
     */
    async getRecommendations(params: RecommendationParams): Promise<RecommendationResponse> {
        return apiClient.get<RecommendationResponse>(ENDPOINTS.RECOMMENDATIONS, {
            userId: params.userId,
            latitude: params.latitude,
            longitude: params.longitude,
            radiusKm: params.radiusKm || 5,
        });
    }

    /**
     * Get complete vendor menu with categories and recommendations
     */
    async getVendorMenu(params: VendorMenuParams): Promise<VendorMenuResponse> {
        return apiClient.get<VendorMenuResponse>(ENDPOINTS.VENDOR_MENU(params.branchId), {
            userId: params.userId,
            latitude: params.latitude,
            longitude: params.longitude,
        });
    }
}

export const searchService = new SearchService();
export default searchService;
