import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, {
  FadeInDown
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScaleOnPress } from '../components/AnimatedCard';
import { Card, CardContent } from '../components/Card';
import api from '../services/api';
import orderService from '../services/orderService';
import searchService from '../services/searchService';
import AddressSelectionModal from './AddressSelectionModal';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const HomeScreen = ({ navigation }) => {
  const [searchText, setSearchText] = useState('');
  const [selectedAddress, setSelectedAddress] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [orderAgainItems, setOrderAgainItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('rating');

  // Filter modal state
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilterTab, setActiveFilterTab] = useState('sort');
  const [filterRating, setFilterRating] = useState(null); // null, 3.5, 4.0
  const [filterTime, setFilterTime] = useState(null); // null, 'fast'

  useEffect(() => {
    loadHomeData();
    loadCart();
    loadWallet();
    loadOrderAgainItems();
  }, []);

  // Add focus listener to refresh data when returning to home
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCart(); // Refresh cart when screen comes into focus
      loadHomeData(); // Refresh vendors to get updated isOpen status
    });

    return unsubscribe;
  }, [navigation]);

  const loadHomeData = async () => {
    try {
      // Load categories, addresses, and notifications from mock API (not in backend spec)
      const [categoriesResponse, addressesResponse, notificationsResponse] = await Promise.all([
        api.getCategories(),
        api.getAddresses(),
        api.getNotifications(),
      ]);

      if (categoriesResponse.success) setCategories(categoriesResponse.categories);
      if (addressesResponse.success) setAddresses(addressesResponse.addresses);
      if (notificationsResponse.success) setNotifications(notificationsResponse.notifications);

      // Load vendors from real backend - discovery feed and search API
      try {
        console.log('[HomeScreen] Fetching vendors from backend...');

        let backendVendors = [];

        // Try discovery feed first
        try {
          const discoveryFeed = await searchService.getDiscoveryFeed({
            latitude: 19.0760,
            longitude: 72.8777,
            radius: 20, // Max radius in km per API spec
          });
          console.log('[HomeScreen] Discovery feed response:', JSON.stringify(discoveryFeed, null, 2));

          if (discoveryFeed?.nearbyVendors?.length > 0) {
            backendVendors = discoveryFeed.nearbyVendors;
          }
        } catch (feedError) {
          console.log('[HomeScreen] Discovery feed failed:', feedError.message);
        }

        // If discovery feed failed or empty, try search API
        if (backendVendors.length === 0) {
          console.log('[HomeScreen] Trying search API...');
          const searchResponse = await searchService.search({
            q: '',
            type: 'vendors',
            latitude: 19.0760,
            longitude: 72.8777,
            radiusKm: 20,
            size: 50,
          });
          console.log('[HomeScreen] Search response:', JSON.stringify(searchResponse, null, 2));

          if (searchResponse?.results?.vendors?.length > 0) {
            backendVendors = searchResponse.results.vendors;
          }
        }

        console.log('[HomeScreen] Total branches found:', backendVendors.length);

        // Log each branch's details to help debug
        backendVendors.forEach((branch, i) => {
          console.log(`[HomeScreen] Branch ${i}: vendorId=${branch.vendorId}, branchId=${branch.branchId}, name=${branch.branchName}, isOpen=${branch.isOpen}`);
        });

        // Group branches by vendorId to show vendors with multiple branches
        const vendorGroups = new Map();
        backendVendors.forEach(branch => {
          const vendorId = branch.vendorId || branch.branchId;
          if (!vendorGroups.has(vendorId)) {
            vendorGroups.set(vendorId, []);
          }
          vendorGroups.get(vendorId).push(branch);
        });

        console.log('[HomeScreen] Grouped vendors:', vendorGroups.size);
        vendorGroups.forEach((branches, vendorId) => {
          console.log(`[HomeScreen] Vendor ${vendorId}: ${branches.length} branches - IDs: ${branches.map(b => b.branchId).join(', ')}`);
        });

        // Transform grouped vendors - pick closest branch as primary, include all branches
        const transformedVendors = Array.from(vendorGroups.entries()).map(([vendorId, branches]) => {
          // Sort by distance (closest first)
          const sortedBranches = [...branches].sort((a, b) => (a.distance || 999) - (b.distance || 999));
          const primaryBranch = sortedBranches[0];

          return {
            id: vendorId,
            branchId: primaryBranch.branchId,
            name: primaryBranch.displayName || primaryBranch.branchName?.split(' - ')[0] || primaryBranch.branchName,
            branchName: primaryBranch.branchName,
            rating: primaryBranch.rating || 4.5,
            time: primaryBranch.deliveryTime || '25-30 min',
            distance: primaryBranch.distance ? `${primaryBranch.distance} ${primaryBranch.distanceUnit || 'km'}` : '2 km',
            price: primaryBranch.minOrderValue ? `₹${primaryBranch.minOrderValue} for two` : '₹200 for two',
            offers: primaryBranch.tags?.includes('Free Delivery') ? 'Free delivery' : '20% off on first order',
            image: primaryBranch.images?.primary || primaryBranch.images?.cover?.thumbnail || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4',
            promoted: primaryBranch.tags?.includes('Promoted') || false,
            branchCount: branches.length,
            branches: sortedBranches.map(b => ({
              branchId: b.branchId,
              branchName: b.branchName,
              distance: b.distance,
              distanceUnit: b.distanceUnit || 'km',
              isOpen: b.isOpen,
              deliveryTime: b.deliveryTime,
              _original: b,
            })),
            menu: [],
            _original: primaryBranch,
          };
        });

        setVendors(transformedVendors);
        console.log('[HomeScreen] Set vendors (grouped):', transformedVendors.length);
      } catch (vendorError) {
        console.error('[HomeScreen] All vendor fetch methods failed:', vendorError.message);
        setVendors([]);
      }
    } catch (error) {
      console.error('[HomeScreen] Failed to load home data:', error);
      Alert.alert('Error', 'Failed to load home data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    navigation.navigate('Search', { searchQuery: searchText });
  };

  const handleVendorPress = (vendor) => {
    navigation.navigate('Vendor', { vendor });
  };

  const handleCategoryPress = (category) => {
    navigation.navigate('Search', { category: category.name });
  };

  const handleSortPress = (sortKey) => {
    try {
      console.log('handleSortPress called with:', sortKey);
      if (!vendors) {
        console.error('Vendors is null or undefined');
        return;
      }
      if (!Array.isArray(vendors)) {
        console.error('Vendors is not an array:', typeof vendors);
        return;
      }

      setSortBy(sortKey);
      // Sort vendors based on the selected criteria
      const sortedVendors = [...vendors].sort((a, b) => {
        const getPriceValue = (price) => {
          if (typeof price === 'number') return price;
          if (typeof price === 'string') {
            return parseFloat(price.replace('₹', '').replace(' for two', '')) || 0;
          }
          return 0;
        };

        switch (sortKey) {
          case 'price_low':
            return getPriceValue(a.price) - getPriceValue(b.price);
          case 'price_high':
            return getPriceValue(b.price) - getPriceValue(a.price);
          case 'rating':
            return (b.rating || 0) - (a.rating || 0);
          case 'distance':
            return parseFloat(a.distance || '0') - parseFloat(b.distance || '0');
          default:
            return 0;
        }
      });
      setVendors(sortedVendors);
    } catch (error) {
      console.error('Sort Error:', error);
      Alert.alert('Sort Error', error.message + '\n' + error.stack);
    }
  };

  // Apply all filters and close modal
  const applyFilters = () => {
    let filteredVendors = [...vendors];

    // Apply rating filter
    if (filterRating) {
      filteredVendors = filteredVendors.filter(v => (v.rating || 0) >= filterRating);
    }

    // Apply time filter (fast = under 25 min)
    if (filterTime === 'fast') {
      filteredVendors = filteredVendors.filter(v => {
        const time = parseInt(v.time) || 30;
        return time <= 25;
      });
    }

    setVendors(filteredVendors);
    setShowFilterModal(false);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilterRating(null);
    setFilterTime(null);
    setSortBy('rating');
    loadHomeData(); // Reload original data
  };

  const handleSeeAllOrderAgain = () => {
    navigation.navigate('Search', { section: 'orderAgain' });
  };

  const handleSeeAllVendors = () => {
    navigation.navigate('Search', { section: 'allVendors' });
  };


  const handleNotificationPress = () => {
    navigation.navigate('Notifications');
  };

  const handleClaimOffer = () => {
    Alert.alert('Offer Claimed!', 'Code NASHTO40 applied to your account.');
  };

  const [cart, setCart] = useState({ items: [] });
  const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
  const [addressModalVisible, setAddressModalVisible] = useState(false);

  const loadCart = async () => {
    try {
      const response = await api.getCart();
      if (response.success) {
        // Deep clone to ensure React detects state change
        setCart(JSON.parse(JSON.stringify(response.cart)));
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    }
  };

  const loadWallet = async () => {
    try {
      const response = await api.getWallet();
      if (response.success) {
        setWallet(response.wallet);
      }
    } catch (error) {
      console.error('Failed to load wallet:', error);
    }
  };

  // Load "Order again" items from past orders
  const loadOrderAgainItems = async () => {
    try {
      const orders = await orderService.listOrders();
      if (orders && orders.length > 0) {
        // Extract unique items from past orders
        const itemsMap = new Map();
        orders.forEach(order => {
          const restaurantId = order.vendor?.vendorBranchId || order.vendor?.vendorId;
          const restaurantName = order.vendor?.branchName || order.vendor?.vendorName || 'Restaurant';

          (order.items || []).forEach(item => {
            const key = `${restaurantId}-${item.menuItemId}`;
            if (!itemsMap.has(key)) {
              itemsMap.set(key, {
                id: item.menuItemId,
                menuItemId: item.menuItemId,
                name: item.name,
                price: item.unitPrice || item.priceAtOrder,
                vendorId: restaurantId,
                branchId: restaurantId,
                restaurantName: restaurantName,
              });
            }
          });
        });

        // Convert to array and take first 6 items
        const items = Array.from(itemsMap.values()).slice(0, 6);
        setOrderAgainItems(items);
      }
    } catch (error) {
      console.error('Failed to load order again items:', error);
      // No fallback - just show empty section
    }
  };

  const handleAddToCart = async (item, restaurantId, restaurantName) => {
    try {
      const response = await api.addToCart(item, restaurantId, restaurantName);
      if (response.success) {
        // Deep clone to ensure React detects state change
        setCart(JSON.parse(JSON.stringify(response.cart)));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add item to cart');
    }
  };

  const handleUpdateCartItem = async (restaurantId, itemId, quantity) => {
    try {
      const response = await api.updateCartItem(restaurantId, itemId, quantity);
      if (response.success) {
        // Deep clone to ensure React detects state change
        setCart(JSON.parse(JSON.stringify(response.cart)));
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update item quantity');
    }
  };

  const getItemQuantity = (itemId) => {
    // Search through all restaurant groups
    for (const restaurantGroup of cart.items || []) {
      const cartItem = restaurantGroup.items.find(item => item.id === itemId);
      if (cartItem) return cartItem.quantity;
    }
    return 0;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const handleAddressPress = () => {
    setAddressModalVisible(true);
  };

  const handleAddressSelect = (address) => {
    setSelectedAddress(addresses.findIndex(addr => addr.id === address.id));
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={styles.categoryItem}
      onPress={() => handleCategoryPress(item)}
      accessibilityLabel={`${item.name} category with ${item.items} items`}
      accessibilityRole="button"
    >
      <Image source={{ uri: item.image }} style={styles.categoryImage} accessibilityLabel={`${item.name} category image`} />
      <Text style={styles.categoryName}>{item.name}</Text>
      <Text style={styles.categoryItems}>{item.items} items</Text>
    </TouchableOpacity>
  );

  const renderVendor = ({ item }) => (
    <Card
      style={styles.vendorCard}
      onPress={() => handleVendorPress(item)}
    >
      <View style={styles.vendorContent}>
        <View style={styles.vendorImageContainer}>
          <Image
            source={{ uri: item.image }}
            style={styles.vendorImage}
            accessibilityLabel={`${item.name} restaurant image`}
          />
          {item.promoted && (
            <View style={styles.promotedBadge}>
              <Text style={styles.promotedText}>Promoted</Text>
            </View>
          )}
        </View>
        <CardContent style={styles.vendorInfo}>
          <View style={styles.vendorTitleRow}>
            <Text style={styles.vendorName} numberOfLines={1}>{item.name}</Text>
            {item.branchCount > 1 && (
              <View style={styles.branchCountBadge}>
                <Ionicons name="location-outline" size={10} color="#22c55e" />
                <Text style={styles.branchCountText}>{item.branchCount} branches</Text>
              </View>
            )}
          </View>
          <View style={styles.vendorMeta}>
            <View style={styles.vendorMetaItem}>
              <Ionicons name="star" size={12} color="#fbbf24" />
              <Text style={styles.vendorRating}>{item.rating}</Text>
            </View>
            <View style={styles.vendorMetaItem}>
              <Ionicons name="time-outline" size={12} color="#64748b" />
              <Text style={styles.vendorTime}>{item.time || 'N/A'}</Text>
            </View>
            <Text style={styles.vendorDistance}>• {item.distance}</Text>
          </View>
          <View style={styles.vendorOffer}>
            <Text style={styles.offerText}>{item.offers}</Text>
            <Text style={styles.priceText}>{item.price}</Text>
          </View>
        </CardContent>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.addressContainer} onPress={handleAddressPress}>
          <View style={styles.locationIcon}>
            <Ionicons name="location" size={16} color="#22c55e" />
          </View>
          <View style={styles.addressContent}>
            <Text style={styles.deliverToText}>Deliver to</Text>
            <View style={styles.addressRow}>
              <Text style={styles.addressName}>{addresses[selectedAddress]?.name || 'Home'}</Text>
              <Text style={styles.addressText} numberOfLines={1}>• {addresses[selectedAddress]?.address || 'Loading...'}</Text>
            </View>
          </View>
          <Ionicons name="chevron-down" size={14} color="#64748b" style={styles.dropdownIcon} />
        </TouchableOpacity>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleNotificationPress}
          >
            <Ionicons name="notifications-outline" size={20} color="#64748b" />
            {unreadNotificationsCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationText}>{unreadNotificationsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Wallet')}
          >
            <Ionicons name="wallet-outline" size={20} color="#64748b" />
            <Text style={styles.walletBalance}>₹{wallet.balance}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar - Tap to navigate to SearchScreen */}
      <TouchableOpacity
        style={styles.searchContainer}
        onPress={() => navigation.navigate('Search')}
        activeOpacity={0.7}
      >
        <Ionicons name="search-outline" size={18} color="#94a3b8" style={{ marginRight: 12 }} />
        <Text style={styles.searchPlaceholder}>Search for food, drinks, vendors...</Text>
      </TouchableOpacity>

      {/* Filter Section - Swiggy Style */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {/* Filter Button */}
          <TouchableOpacity
            style={styles.filterMainButton}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons name="options-outline" size={16} color="#1e293b" />
            <Text style={styles.filterMainText}>Filters</Text>
            {(filterRating || filterTime) && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>
                  {(filterRating ? 1 : 0) + (filterTime ? 1 : 0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Sort By Chip */}
          <TouchableOpacity
            style={[styles.filterChip, sortBy !== 'rating' && styles.filterChipActive]}
            onPress={() => setShowFilterModal(true)}
          >
            <Text style={[styles.filterChipText, sortBy !== 'rating' && styles.filterChipTextActive]}>
              Sort by
            </Text>
            <Ionicons name="chevron-down" size={14} color={sortBy !== 'rating' ? '#ffffff' : '#64748b'} />
          </TouchableOpacity>

          {/* Rating Chip */}
          <TouchableOpacity
            style={[styles.filterChip, filterRating && styles.filterChipActive]}
            onPress={() => {
              setActiveFilterTab('rating');
              setShowFilterModal(true);
            }}
          >
            <Ionicons name="star" size={12} color={filterRating ? '#ffffff' : '#64748b'} />
            <Text style={[styles.filterChipText, filterRating && styles.filterChipTextActive]}>
              {filterRating ? `${filterRating}+` : 'Rating'}
            </Text>
          </TouchableOpacity>

          {/* Fast Delivery Chip */}
          <TouchableOpacity
            style={[styles.filterChip, filterTime === 'fast' && styles.filterChipActive]}
            onPress={() => setFilterTime(filterTime === 'fast' ? null : 'fast')}
          >
            <Ionicons name="flash" size={12} color={filterTime === 'fast' ? '#ffffff' : '#64748b'} />
            <Text style={[styles.filterChipText, filterTime === 'fast' && styles.filterChipTextActive]}>
              Fast Delivery
            </Text>
          </TouchableOpacity>

          {/* Pure Veg Chip - Always active since it's a veg-only app */}
          <View style={[styles.filterChip, styles.filterChipActive]}>
            <View style={styles.vegDot} />
            <Text style={[styles.filterChipText, styles.filterChipTextActive]}>Pure Veg</Text>
          </View>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Special Offers Section - Enhanced */}
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.section}>
          <Text style={styles.sectionTitle}>Special Offers</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[
              { title: 'Free Delivery', subtitle: 'Orders ₹500+', icon: 'bicycle', gradient: ['#8b5cf6', '#7c3aed'] },
              { title: '₹100 Off', subtitle: 'Use code WELCOME', icon: 'pricetag', gradient: ['#f97316', '#ea580c'] },
              { title: 'Buy 1 Get 1', subtitle: 'On selected items', icon: 'gift', gradient: ['#14b8a6', '#0d9488'] },
            ].map((offer, index) => (
              <ScaleOnPress key={index} style={styles.offerItem}>
                <LinearGradient
                  colors={offer.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.offerItemGradient}
                >
                  <View style={styles.offerIconContainer}>
                    <Ionicons name={offer.icon} size={16} color="#ffffff" />
                  </View>
                  <Text style={styles.offerItemTitle}>{offer.title}</Text>
                  <Text style={styles.offerItemSubtitle}>{offer.subtitle}</Text>
                </LinearGradient>
              </ScaleOnPress>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Categories - removed, no backend API available */}

        {/* Order Again - only show if user has past orders */}
        {orderAgainItems.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="refresh-circle" size={18} color="#22c55e" style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Order again</Text>
              </View>
              <TouchableOpacity onPress={handleSeeAllOrderAgain}>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12 }}>
              {orderAgainItems.map((item, index) => (
                <ScaleOnPress key={`${item.vendorId}-${item.id}`}>
                  <View style={styles.orderAgainItem}>
                    <View style={styles.orderAgainImageContainer}>
                      <Image
                        source={{ uri: item.image || 'https://images.unsplash.com/photo-1648192312898-838f9b322f47?w=200' }}
                        style={styles.orderAgainImage}
                      />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={styles.orderAgainImageOverlay}
                      />
                      <Text style={styles.orderAgainImagePrice}>₹{item.price}</Text>
                    </View>
                    <View style={styles.orderAgainContent}>
                      <Text style={styles.orderAgainName} numberOfLines={2}>{item.name}</Text>
                      <Text style={styles.orderAgainVendor} numberOfLines={1}>{item.restaurantName}</Text>
                    </View>
                    {getItemQuantity(item.id) > 0 ? (
                      <View style={styles.orderAgainQuantityControls}>
                        <TouchableOpacity
                          style={styles.orderAgainQtyBtn}
                          onPress={() => handleUpdateCartItem(item.vendorId, item.id, getItemQuantity(item.id) - 1)}
                        >
                          <Ionicons name="remove" size={14} color="#22c55e" />
                        </TouchableOpacity>
                        <Text style={styles.orderAgainQtyText}>{getItemQuantity(item.id)}</Text>
                        <TouchableOpacity
                          style={styles.orderAgainQtyBtn}
                          onPress={() => handleUpdateCartItem(item.vendorId, item.id, getItemQuantity(item.id) + 1)}
                        >
                          <Ionicons name="add" size={14} color="#22c55e" />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.orderAgainAddBtn}
                        onPress={() => handleAddToCart({
                          ...item,
                          menuItemId: item.menuItemId || item.id,
                          branchId: item.branchId || item.vendorId,
                        }, item.vendorId, item.restaurantName)}
                      >
                        <Ionicons name="add" size={14} color="#ffffff" />
                        <Text style={styles.orderAgainAddBtnText}>Add</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </ScaleOnPress>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Popular Stores */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular stores near you</Text>
            <TouchableOpacity onPress={handleSeeAllVendors}>
              <Text style={styles.seeAllText}>See all ›</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={vendors}
            renderItem={renderVendor}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="home" size={24} color="#22c55e" />
          <Text style={[styles.navText, { color: '#22c55e' }]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Cart')}>
          <View style={styles.navIconContainer}>
            <Ionicons name="cart-outline" size={24} color="#64748b" />
            {(cart.items || []).reduce((total, group) => total + group.items.length, 0) > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{(cart.items || []).reduce((total, group) => total + group.items.length, 0)}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.navText, { color: '#64748b' }]}>Cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Orders')}>
          <Ionicons name="list-outline" size={24} color="#64748b" />
          <Text style={[styles.navText, { color: '#64748b' }]}>Orders</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
          <Ionicons name="person-outline" size={24} color="#64748b" />
          <Text style={[styles.navText, { color: '#64748b' }]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Modal - Swiggy Style */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.filterModalOverlay}>
          <View style={styles.filterModalContainer}>
            {/* Modal Header */}
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filters and sorting</Text>
              <TouchableOpacity onPress={clearAllFilters}>
                <Text style={styles.filterClearText}>Clear all</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.filterModalBody}>
              {/* Left Sidebar */}
              <View style={styles.filterSidebar}>
                {[
                  { key: 'sort', label: 'Sort By', icon: 'swap-vertical' },
                  { key: 'time', label: 'Time', icon: 'time-outline' },
                  { key: 'rating', label: 'Rating', icon: 'star-outline' },
                ].map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.filterSidebarItem,
                      activeFilterTab === tab.key && styles.filterSidebarItemActive
                    ]}
                    onPress={() => setActiveFilterTab(tab.key)}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={20}
                      color={activeFilterTab === tab.key ? '#22c55e' : '#64748b'}
                    />
                    <Text style={[
                      styles.filterSidebarText,
                      activeFilterTab === tab.key && styles.filterSidebarTextActive
                    ]}>{tab.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Right Content */}
              <View style={styles.filterContent}>
                {activeFilterTab === 'sort' && (
                  <View>
                    <View style={styles.filterContentHeader}>
                      <Text style={styles.filterContentTitle}>Sort by</Text>
                      <TouchableOpacity onPress={() => setSortBy('rating')}>
                        <Text style={styles.filterContentSubtitle}>
                          {sortBy === 'rating' ? 'Relevance' :
                            sortBy === 'price_low' ? 'Price: Low to High' :
                              sortBy === 'price_high' ? 'Price: High to Low' :
                                'Distance'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.filterOptionsGrid}>
                      {[
                        { key: 'rating', label: 'Relevance', icon: 'sparkles' },
                        { key: 'price_low', label: 'Cost: Low to High', icon: 'arrow-down' },
                        { key: 'price_high', label: 'Cost: High to Low', icon: 'arrow-up' },
                        { key: 'distance', label: 'Distance', icon: 'location' },
                      ].map((option) => (
                        <TouchableOpacity
                          key={option.key}
                          style={[
                            styles.filterOption,
                            sortBy === option.key && styles.filterOptionActive
                          ]}
                          onPress={() => handleSortPress(option.key)}
                        >
                          <Ionicons
                            name={option.icon}
                            size={18}
                            color={sortBy === option.key ? '#22c55e' : '#64748b'}
                          />
                          <Text style={[
                            styles.filterOptionText,
                            sortBy === option.key && styles.filterOptionTextActive
                          ]}>{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {activeFilterTab === 'time' && (
                  <View>
                    <Text style={styles.filterContentTitle}>Time</Text>
                    <View style={styles.filterOptionsGrid}>
                      <TouchableOpacity
                        style={[
                          styles.filterOption,
                          filterTime === 'fast' && styles.filterOptionActive
                        ]}
                        onPress={() => setFilterTime(filterTime === 'fast' ? null : 'fast')}
                      >
                        <Ionicons name="flash" size={18} color={filterTime === 'fast' ? '#22c55e' : '#64748b'} />
                        <Text style={[
                          styles.filterOptionText,
                          filterTime === 'fast' && styles.filterOptionTextActive
                        ]}>Near & Fast</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {activeFilterTab === 'rating' && (
                  <View>
                    <Text style={styles.filterContentTitle}>Restaurant Rating</Text>
                    <View style={styles.filterOptionsGrid}>
                      <TouchableOpacity
                        style={[
                          styles.filterOption,
                          filterRating === 3.5 && styles.filterOptionActive
                        ]}
                        onPress={() => setFilterRating(filterRating === 3.5 ? null : 3.5)}
                      >
                        <Ionicons name="star" size={18} color={filterRating === 3.5 ? '#22c55e' : '#fbbf24'} />
                        <Text style={[
                          styles.filterOptionText,
                          filterRating === 3.5 && styles.filterOptionTextActive
                        ]}>Rated 3.5+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.filterOption,
                          filterRating === 4.0 && styles.filterOptionActive
                        ]}
                        onPress={() => setFilterRating(filterRating === 4.0 ? null : 4.0)}
                      >
                        <Ionicons name="star" size={18} color={filterRating === 4.0 ? '#22c55e' : '#fbbf24'} />
                        <Text style={[
                          styles.filterOptionText,
                          filterRating === 4.0 && styles.filterOptionTextActive
                        ]}>Rated 4.0+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Modal Footer */}
            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={styles.filterCloseButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.filterCloseText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterApplyButton}
                onPress={applyFilters}
              >
                <Text style={styles.filterApplyText}>Show results</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AddressSelectionModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        onSelectAddress={handleAddressSelect}
        selectedAddress={addresses[selectedAddress]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
    marginRight: 12,
  },
  addressContent: {
    flex: 1,
    marginRight: 4,
  },
  dropdownIcon: {
    marginLeft: 4,
  },
  locationIcon: {
    width: 28,
    height: 28,
    backgroundColor: '#dcfce7',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  locationIconText: {
    fontSize: 16,
  },
  deliverToText: {
    fontSize: 12,
    color: '#64748b',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  addressText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingHorizontal: 6,
  },
  actionIcon: {
    fontSize: 18,
  },
  walletBalance: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: '#94a3b8',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    marginRight: 8,
  },
  filterScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
  },
  offerCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    marginTop: 4,
  },
  offerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offerTextContainer: {
    flex: 1,
  },
  offerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  offerSubtitle: {
    fontSize: 12,
    color: '#f0fdf4',
    marginTop: 2,
  },
  claimButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  seeAllText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '600',
  },
  categoriesList: {
    paddingVertical: 8,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  categoryImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  categoryItems: {
    fontSize: 10,
    color: '#64748b',
    textAlign: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderAgainItem: {
    width: 140,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  orderAgainImageContainer: {
    position: 'relative',
    width: '100%',
    height: 90,
  },
  orderAgainImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9',
  },
  orderAgainImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
  },
  orderAgainImagePrice: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  orderAgainContent: {
    padding: 10,
    paddingBottom: 6,
  },
  orderAgainName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 16,
    minHeight: 32,
  },
  orderAgainVendor: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  orderAgainAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    marginHorizontal: 10,
    marginBottom: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  orderAgainAddBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  orderAgainQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    marginBottom: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  orderAgainQtyBtn: {
    padding: 6,
    paddingHorizontal: 10,
  },
  orderAgainQtyText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#22c55e',
    minWidth: 24,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  vendorCard: {
    marginBottom: 12,
    padding: 0,
  },
  vendorContent: {
    flexDirection: 'row',
  },
  vendorImageContainer: {
    position: 'relative',
  },
  vendorImage: {
    width: 80,
    height: 80,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  promotedBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#22c55e',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  promotedText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
  },
  branchCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 8,
    gap: 3,
  },
  branchCountText: {
    color: '#22c55e',
    fontSize: 10,
    fontWeight: '600',
  },
  vendorInfo: {
    flex: 1,
    padding: 12,
  },
  vendorTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  vendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  vendorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  vendorMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  vendorRating: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '600',
  },
  vendorTime: {
    fontSize: 12,
    color: '#64748b',
  },
  vendorDistance: {
    fontSize: 12,
    color: '#64748b',
  },
  vendorOffer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offerText: {
    fontSize: 10,
    backgroundColor: '#dcfce7',
    color: '#22c55e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  priceText: {
    fontSize: 10,
    color: '#64748b',
  },
  bottomPadding: {
    height: 20,
  },
  offerItem: {
    marginRight: 10,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  offerItemGradient: {
    width: 120,
    height: 72,
    padding: 10,
    justifyContent: 'space-between',
  },
  offerIconContainer: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerItemTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  offerItemSubtitle: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 8,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconContainer: {
    position: 'relative',
    marginBottom: 2,
  },
  navIcon: {
    fontSize: 20,
  },
  cartBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  navText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Add missing styles for quantity controls
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quantityButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64748b',
  },
  quantityText: {
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    minWidth: 20,
    textAlign: 'center',
  },
  // Filter Chips and Modal Styles
  filterMainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
    gap: 6,
  },
  filterMainText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  filterBadge: {
    backgroundColor: '#22c55e',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 8,
    gap: 4,
  },
  filterChipActive: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  // Filter Modal Styles
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filterModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  filterClearText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22c55e',
  },
  filterModalBody: {
    flexDirection: 'row',
    minHeight: 300,
  },
  filterSidebar: {
    width: 80,
    backgroundColor: '#f8fafc',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    paddingVertical: 8,
  },
  filterSidebarItem: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  filterSidebarItemActive: {
    backgroundColor: '#ffffff',
    borderLeftColor: '#22c55e',
  },
  filterSidebarText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  filterSidebarTextActive: {
    color: '#22c55e',
    fontWeight: '600',
  },
  filterContent: {
    flex: 1,
    padding: 16,
  },
  filterContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  filterContentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  filterContentSubtitle: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '500',
  },
  filterOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  filterOptionActive: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  filterOptionTextActive: {
    color: '#22c55e',
    fontWeight: '600',
  },
  filterModalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  filterCloseButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  filterCloseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  filterApplyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    alignItems: 'center',
  },
  filterApplyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default HomeScreen;