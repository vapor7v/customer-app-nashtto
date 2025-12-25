// Services Index
// Export all API services for easy importing

export { apiClient, ApiError } from './apiClient';
export { checkoutService } from './checkoutService';
export { API_CONFIG, ENDPOINTS, getDefaultHeaders } from './config';
export { menuService } from './menuService';
export { orderService } from './orderService';
export { RAZORPAY_CONFIG, razorpayService } from './razorpayService';
export { searchService } from './searchService';
export { trackingService } from './trackingService';
export { vendorService } from './vendorService';

export { configure as configureLocationUploader, getConfig as getLocationUploaderConfig, isRunning as isLocationUploaderRunning, pushLocationOnce, startLocationUpload, stopLocationUpload } from './locationUploader';

// Re-export types
export * from './types';

// Default export for convenience
export default {
    apiClient: require('./apiClient').apiClient,
    menuService: require('./menuService').menuService,
    searchService: require('./searchService').searchService,
    vendorService: require('./vendorService').vendorService,
    checkoutService: require('./checkoutService').checkoutService,
    orderService: require('./orderService').orderService,
    trackingService: require('./trackingService').trackingService,
    razorpayService: require('./razorpayService').razorpayService,
    locationUploader: require('./locationUploader').default,
};
