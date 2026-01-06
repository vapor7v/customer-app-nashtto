// TypeScript Types for Nashtto Customer App API
// Based on OpenAPI 3.0.1 specification from Tea Snacks Delivery platform

// ============================================================================
// Common Types
// ============================================================================

export interface ErrorResponse {
    timestamp: string;
    status: number;
    error: string;
    message: string;
    path: string;
}

export interface ValidationErrorResponse extends ErrorResponse {
    validationErrors: Record<string, string>;
}

export interface LocationDTO {
    latitude: number;
    longitude: number;
    address?: string;
    landmark?: string;
}

export interface GeoLocation {
    latitude: number;
    longitude: number;
}

export interface PaginationInfo {
    currentPage: number;
    totalResults: number;
    hasMore: boolean;
    pageSize: number;
}

// ============================================================================
// Search & Discovery Types
// ============================================================================

export interface ImagesResponse {
    primary?: string;
    cover?: Record<string, string>;
    logo?: Record<string, string>;
    gallery?: Record<string, string>;
}

export interface RankingScores {
    total: number;
    fts: number;
    fuzzy: number;
    popularity: number;
    proximity: number;
}

export interface NutritionInfo {
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    servingSize?: string;
}

export interface VendorSearchResult {
    branchId: number;
    vendorId: number;
    branchName: string;
    displayName: string;
    cuisine: string[];
    rating: number;
    totalRatings: number;
    deliveryTime: string;
    distance: number;
    distanceUnit: string;
    deliveryFee: number;
    minOrderValue: number;
    isOpen: boolean;
    openingTime?: string;
    images: ImagesResponse;
    tags: string[];
    rankingScore: number;
    scores?: RankingScores;
    highlightedText?: string;
}

export interface MenuItemSearchResult {
    menuItemId: number;
    name: string;
    description?: string;
    branchId: number;
    branchName: string;
    vendorName: string;
    price: number;
    category: string;
    images: ImagesResponse;
    rating?: number;
    preparationTime?: number;
    dietaryInfo?: string[];
    nutrition?: NutritionInfo;
    isAvailable: boolean;
    availabilityMessage?: string;
    distance?: number;
    orderCount?: number;
    rankingScore?: number;
    trendingScore?: number;
    recommendationScore?: number;
    scores?: RankingScores;
    highlightedText?: string;
}

export interface SearchResults {
    vendors: VendorSearchResult[];
    items: MenuItemSearchResult[];
}

export interface SearchMetadata {
    searchTime: number;
    cacheHit: boolean;
    rankingStrategy: string;
    queryType: string;
}

export interface SearchResponse {
    query: string;
    type: string;
    results: SearchResults;
    suggestions: string[];
    pagination: PaginationInfo;
    metadata: SearchMetadata;
}

export interface FeedMetadata {
    totalVendors: number;
    cacheUntil?: string;
    cacheHit: boolean;
    rankingVersion: string;
}

export interface DiscoveryFeedResponse {
    nearbyVendors: VendorSearchResult[];
    popularItems: MenuItemSearchResult[];
    recommendedItems: MenuItemSearchResult[];
    topOrderedItems: MenuItemSearchResult[];
    searchSuggestions: string[];
    metadata: FeedMetadata;
}

export interface RecommendationResponse {
    recommendedVendors: VendorSearchResult[];
    recommendedItems: MenuItemSearchResult[];
    frequentlyOrdered: MenuItemSearchResult[];
    timeBasedRecommendations: MenuItemSearchResult[];
    recommendationContext: string;
}

export interface MenuCategoryDto {
    categoryName: string;
    displayOrder: number;
    items: MenuItemSearchResult[];
}

export interface VendorMenuResponse {
    vendor: VendorSearchResult;
    categories: MenuCategoryDto[];
    recommendations: MenuItemSearchResult[];
    popularItems: MenuItemSearchResult[];
}

// ============================================================================
// Vendor & Branch Types
// ============================================================================

export interface VendorResponse {
    vendorId: number;
    companyName: string;
    brandName: string;
    legalEntityName?: string;
    companyEmail: string;
    companyPhone: string;
    panNumber?: string;
    gstNumber?: string;
    images: Record<string, any>;
    metadata: Record<string, any>;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

export interface BranchResponse {
    branchId: number;
    vendorId: number;
    branchName: string;
    branchCode?: string;
    address: Record<string, any>;
    latitude: number;
    longitude: number;
    city: string;
    branchPhone?: string;
    branchEmail?: string;
    branchManagerName?: string;
    onboardingStatus: string;
    isActive: boolean;
    isOpen: boolean;
    preferences: Record<string, any>;
    operatingHours: Record<string, any>;
    images: Record<string, any>;
    metadata: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export interface MenuItemResponse {
    menuItemId: number;
    branchId: number;
    name: string;
    description?: string;
    price: number;
    category: string;
    isAvailable: boolean;
    preparationTimeMinutes?: number;
    images: Record<string, any>;
    metadata: Record<string, any>;
    tags: string[];
    createdAt: string;
    updatedAt: string;
}

// ============================================================================
// Checkout Types
// ============================================================================

export interface DeliveryAddress {
    addressLine1: string;
    addressLine2?: string;
    landmark?: string;
    city: string;
    state: string;
    pincode: string;
    addressType?: string;
    label?: string;
}

export interface CartItemRequest {
    menuItemId: number;
    quantity: number;
    customizations?: Record<string, any>;
    specialInstructions?: string;
}

export interface CheckoutRequest {
    userId: string;
    vendorBranchId: number;
    deliveryAddress: DeliveryAddress;
    deliveryLocation: GeoLocation;
    items: CartItemRequest[];
    paymentMethod: string;
    couponCode?: string;
    scheduledDeliveryTime?: string;
    contactlessDelivery?: boolean;
    leaveAtDoor?: boolean;
    deliveryInstructions?: string;
}

export interface VendorInfo {
    vendorId: number;  // Changed from string to number per OpenAPI spec
    vendorName: string;
    vendorBranchId: number;
    branchName: string;
    branchPhone?: string;  // New field from OpenAPI spec
    branchAddress?: string;  // New field from OpenAPI spec
    estimatedPrepTime: number;
    isAcceptingOrders: boolean;
}

export interface CheckoutItem {
    orderItemId?: string;  // New field from OpenAPI spec
    menuItemId: number;
    name: string;
    description?: string;  // New field from OpenAPI spec
    imageUrl?: string;  // New field from OpenAPI spec
    categoryName?: string;  // New field from OpenAPI spec
    quantity: number;
    unitPrice: number;
    subtotal: number;
    customizations?: Record<string, any>;
    specialInstructions?: string;  // New field from OpenAPI spec
    isAvailable: boolean;
    stockQuantity?: number;
}

export interface DiscountDetails {
    couponCode?: string;
    discountType?: string;
    discountValue?: number;
    maxDiscount?: number;
    appliedDiscount?: number;
}

export interface DeliveryDetails {
    distance: number;
    distanceUnit: string;
    deliveryZone: string;
    baseFee: number;
    distanceFee: number;
}

export interface GstDetails {
    cgst: number;
    sgst: number;
    gstRate: number;
}

export interface PricingDetails {
    itemTotal: number;
    discount: number;
    discountDetails?: DiscountDetails;
    subtotalAfterDiscount: number;
    deliveryCharges: number;
    deliveryDetails?: DeliveryDetails;
    platformFee: number;
    gst: number;
    gstDetails?: GstDetails;
    totalAmount: number;
    currency: string;
    // Display labels from OpenAPI spec
    itemTotalLabel?: string;
    deliveryLabel?: string;
    taxesLabel?: string;
    discountLabel?: string;
    totalLabel?: string;
}

export interface DeliveryEstimate {
    estimatedDeliveryTime: string;
    estimatedPrepTime: number;
    estimatedDeliveryDuration: number;
    totalEstimatedTime: number;
}

export interface ValidationResults {
    allItemsAvailable: boolean;
    deliveryAddressValid: boolean;
    deliveryZoneServiceable: boolean;
    vendorAcceptingOrders: boolean;
    paymentMethodSupported: boolean;
}

export interface CheckoutError {
    code: string;
    message: string;
    field?: string;
    severity?: string;
    metadata?: Record<string, any>;
}

export type CheckoutStatus =
    | 'READY_FOR_COMMIT'
    | 'IN_PROGRESS'
    | 'VALIDATION_FAILED'
    | 'COMMITTED'
    | 'EXPIRED';

export interface CheckoutResponse {
    checkoutSessionId: string;
    status: CheckoutStatus;
    expiresAt: string;
    vendor: VendorInfo;
    items: CheckoutItem[];
    pricing: PricingDetails;
    deliveryEstimate: DeliveryEstimate;
    validations: ValidationResults;
    errors: CheckoutError[];
}

/**
 * @deprecated Use CreateOrderFromCheckoutRequest instead
 * The OpenAPI spec now uses POST /api/v1/orders with CreateOrderFromCheckoutRequest
 */
export interface CommitCheckoutRequest {
    checkoutSessionId: string;
    paymentTransactionId?: string;
    paymentMethod?: string;
}

export interface CreateOrderFromCheckoutRequest {
    checkoutSessionId: string;
    paymentToken?: string;
}

// ============================================================================
// Order Types
// ============================================================================

export type OrderState =
    | 'CREATED'
    | 'VALIDATED'
    | 'PAYMENT_CONFIRMED'
    | 'PENDING_ACCEPTANCE'
    | 'ACCEPTED'
    | 'PREPARING'
    | 'READY_FOR_PICKUP'
    | 'ASSIGNED_TO_RIDER'
    | 'PICKED_UP'
    | 'DELIVERED'
    | 'CLOSED'
    | 'CANCELLED'
    | 'REJECTED';

export type PaymentStatus =
    | 'PENDING'
    | 'AUTHORIZED'
    | 'CAPTURED'
    | 'PAID'
    | 'FAILED'
    | 'REFUNDED'
    | 'PARTIALLY_REFUNDED';

export interface OrderItemResponse {
    orderItemId: string;
    menuItemId: number;
    itemName: string;
    quantity: number;
    priceAtOrder: number;
    notes?: string;
    customizations?: Record<string, any>;
}

// Full order details response (from checkout/order APIs)
export interface PaymentInfo {
    status: string;
    statusDisplayName?: string;
    method?: string;
    methodDisplayName?: string;
    transactionId?: string;
    amountPaid?: number;
    paidAt?: string;
}

export interface DeliveryInfoResponse {
    address: DeliveryAddress;
    latitude?: number;
    longitude?: number;
    specialInstructions?: string;
    estimatedDeliveryTime?: string;
    estimatedPrepTime?: number;
    estimatedDeliveryDuration?: number;
    totalEstimatedTime?: number;
    deliveryTimeRange?: string;
}

export interface OrderDetailsResponse {
    // Checkout session fields
    checkoutSessionId?: string;
    status?: CheckoutStatus;
    statusDisplayName?: string;
    expiresAt?: string;

    // Order fields
    orderId?: string;
    orderNumber?: string;
    orderState?: OrderState;
    orderStateDisplayName?: string;
    orderPlacedAt?: string;

    isSuccess?: boolean;
    message?: string;
    customerId?: string;

    vendor?: VendorInfo;
    items?: CheckoutItem[];
    totalItemCount?: number;
    pricing?: PricingDetails;
    delivery?: DeliveryInfoResponse;
    payment?: PaymentInfo;
    validations?: ValidationResults;
    errors?: CheckoutError[];
    deliveryEstimate?: DeliveryEstimate;
}

export interface OrderResponse {
    orderId: string;
    customerId: string;
    orderType: 'SINGLE' | 'MULTI_RESTAURANT';
    state: OrderState;
    paymentStatus: PaymentStatus;
    items: OrderItemResponse[];
    itemTotal: number;
    deliveryCharges: number;
    platformFee: number;
    gst: number;
    discount: number;
    totalAmount: number;
    deliveryAddress: DeliveryAddress;
    specialInstructions?: string;
    createdAt: string;
    updatedAt: string;
    acceptedAt?: string;
    deliveredAt?: string;
}

export interface CancelOrderRequest {
    reason: string;
    cancelledBy?: string;
}

// ============================================================================
// Delivery & Tracking Types
// ============================================================================

export type DeliveryState =
    | 'PENDING'
    | 'SEARCHING_RIDER'
    | 'RIDER_ASSIGNED'
    | 'RIDER_ACCEPTED'
    | 'AT_RESTAURANT'
    | 'PICKED_UP'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'FAILED';

export interface DeliveryResponseDTO {
    deliveryId: string;
    orderId: string;
    riderId?: string;
    state: DeliveryState;
    deliveryFee: number;
    pickupLocation: LocationDTO;
    deliveryLocation: LocationDTO;
    riderLocation?: LocationDTO;
    riderAssignedAt?: string;
    riderAcceptedAt?: string;
    reachedRestaurantAt?: string;
    pickedUpAt?: string;
    deliveredAt?: string;
    failedAt?: string;
    failureReason?: string;
    restaurantWaitTimeMinutes?: number;
    totalDeliveryTimeMinutes?: number;
    createdAt: string;
    updatedAt: string;
}

export type CustomerOrderStatus =
    | 'ORDER_PLACED'
    | 'ORDER_CONFIRMED'
    | 'PREPARING'
    | 'RIDER_ASSIGNED'
    | 'READY_FOR_PICKUP'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'CANCELLED';

export interface RiderInfoDTO {
    riderId: string;
    name: string;
    phone: string;
    rating: number;
    currentLocation?: LocationDTO;
}

export interface CustomerStatusResponseDTO {
    orderId: string;
    status: CustomerOrderStatus;
    primaryMessage: string;
    secondaryMessage?: string;
    progressPercentage: number;
    canCancel: boolean;
    estimatedArrival?: string;
    estimatedMinutesRemaining?: number;
    riderInfo?: RiderInfoDTO;
    orderPlacedAt: string;
    lastUpdatedAt: string;
}

// ============================================================================
// API Request Parameter Types
// ============================================================================

export interface SearchParams {
    q: string;
    type?: 'all' | 'vendors' | 'items';
    latitude: number;
    longitude: number;
    page?: number;
    size?: number;
    city?: string;
    radiusKm?: number;
}

export interface DiscoveryFeedParams {
    latitude: number;
    longitude: number;
    radius?: number;
    userId?: string;
    page?: number;
    size?: number;
}

export interface RecommendationParams {
    userId: string;
    latitude: number;
    longitude: number;
    radiusKm?: number;
}

export interface VendorMenuParams {
    branchId: number;
    userId?: string;
    latitude?: number;
    longitude?: number;
}

export interface BranchMenuParams {
    category?: string;
    page?: number;
    size?: number;
}

export interface ListOrdersParams {
    state?: OrderState;
}
