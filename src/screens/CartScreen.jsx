import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { checkoutService } from '../services';
import api from '../services/api';

const CartScreen = ({ navigation }) => {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [restaurantNote, setRestaurantNote] = useState('');
  const [checkoutData, setCheckoutData] = useState(null);

  useEffect(() => {
    loadCart();
  }, []);

  // Add focus listener to refresh cart when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCart(); // Refresh cart when screen comes into focus
    });

    return unsubscribe;
  }, [navigation]);

  const loadCart = async () => {
    try {
      const response = await api.getCart();
      if (response.success) {
        setCart(JSON.parse(JSON.stringify(response.cart)));
        if (response.cart.items.length > 0) {
          fetchCheckoutPrices(response.cart.items);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load cart items');
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  };

  const fetchCheckoutPrices = async (cartItems = cart.items) => {
    if (!cartItems || cartItems.length === 0) {
      setCheckoutData(null);
      return;
    }
    try {
      const restaurantGroup = cartItems[0];
      const checkoutRequest = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        vendorBranchId: restaurantGroup.items[0]?.branchId || parseInt(restaurantGroup.restaurantId) || 5,
        deliveryAddress: {
          addressLine1: '123 Main Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
        },
        deliveryLocation: { latitude: 12.9716, longitude: 77.5946 },
        items: restaurantGroup.items.map(item => ({
          menuItemId: parseInt(item.menuItemId) || parseInt(item.id) || 1,
          quantity: item.quantity,
        })),
        paymentMethod: 'GPAY', // Hardcoded for testing
      };

      console.log('[CartScreen] Checkout request:', JSON.stringify(checkoutRequest, null, 2));
      console.log('[CartScreen] Cart items:', JSON.stringify(restaurantGroup.items, null, 2));

      const response = await checkoutService.calculateCheckout(checkoutRequest);
      console.log('[CartScreen] Checkout response:', JSON.stringify(response, null, 2));
      setCheckoutData(response);
    } catch (error) {
      console.error('[CartScreen] Price fetch failed:', error);
      console.error('[CartScreen] Error details:', error.message, error.status, error.details);
      setCheckoutData(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCart();
  };

  const updateQuantity = async (restaurantId, itemId, newQuantity) => {
    if (newQuantity === 0) {
      removeItem(restaurantId, itemId);
      return;
    }
    try {
      const response = await api.updateCartItem(restaurantId, itemId, newQuantity);
      if (response.success && response.cart) {
        setCart(response.cart);
        fetchCheckoutPrices(response.cart.items);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update item quantity');
    }
  };

  const removeItem = async (restaurantId, itemId) => {
    try {
      const response = await api.removeFromCart(restaurantId, itemId);
      if (response.success && response.cart) {
        setCart(response.cart);
        fetchCheckoutPrices(response.cart.items);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to remove item');
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const response = await api.applyCoupon(null, couponCode);
      if (response.success && response.cart) {
        setCart(response.cart);
        Alert.alert('Success', 'Coupon applied successfully!');
        setCouponCode('');
      } else {
        Alert.alert('Invalid Coupon', response.error || 'Please try another code');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to apply coupon');
    }
  };

  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checkout');
      return;
    }
    const restaurantGroup = cart.items[0];
    setLoading(true);
    try {
      const checkoutRequest = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        vendorBranchId: restaurantGroup.items[0]?.branchId || parseInt(restaurantGroup.restaurantId) || 5,
        deliveryAddress: cart.deliveryAddress || {
          addressLine1: '123 Main Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
        },
        deliveryLocation: { latitude: 12.9716, longitude: 77.5946 },
        items: restaurantGroup.items.map(item => ({
          menuItemId: parseInt(item.menuItemId) || parseInt(item.id) || 1,
          quantity: item.quantity,
        })),
        paymentMethod: 'GPAY', // Hardcoded for testing
      };
      const response = await checkoutService.calculateCheckout(checkoutRequest);
      navigation.navigate('Payment', {
        cart: cart.items,
        checkoutResponse: response,
      });
    } catch (error) {
      Alert.alert('Checkout Error', error.message || 'Failed to calculate checkout.');
    } finally {
      setLoading(false);
    }
  };

  const getTotals = () => {
    if (checkoutData?.pricing) {
      return {
        subtotal: checkoutData.pricing.itemTotal || 0,
        deliveryFee: checkoutData.pricing.deliveryCharges || 0,
        tax: checkoutData.pricing.gst || 0,
        platformFee: checkoutData.pricing.platformFee || 0,
        discount: checkoutData.pricing.discount || 0,
        total: checkoutData.pricing.totalAmount || 0
      };
    }
    const subtotal = cart.items.reduce((total, group) =>
      total + group.items.reduce((sum, item) => sum + (item.price * item.quantity), 0), 0);
    const deliveryFee = cart.items[0]?.deliveryFee || 25;
    const tax = subtotal * 0.05;
    return {
      subtotal,
      deliveryFee,
      tax,
      platformFee: 5,
      discount: 0,
      total: subtotal + deliveryFee + tax + 5
    };
  };

  const totals = getTotals();
  const restaurantGroup = cart.items[0];
  const totalItems = cart.items.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.quantity, 0), 0);

  // Show loading spinner during initial load
  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cart</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="cart-outline" size={48} color="#22c55e" />
          <Text style={styles.loadingText}>Loading cart...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (cart.items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cart</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="cart-outline" size={80} color="#22c55e" />
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Looks like you haven't added anything to your cart yet</Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.browseButtonText}>Browse Restaurants</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with restaurant info */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.restaurantName} numberOfLines={1}>{restaurantGroup?.restaurantName || 'Cart'}</Text>
          <Text style={styles.deliveryTime}>
            <Ionicons name="time-outline" size={12} color="#64748b" /> {restaurantGroup?.deliveryTime || '20-25'} mins to Home
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Ionicons name="ellipsis-vertical" size={20} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Savings Banner */}
        {totals.discount > 0 && (
          <LinearGradient colors={['#dcfce7', '#f0fdf4']} style={styles.savingsBanner}>
            <Ionicons name="gift" size={18} color="#22c55e" />
            <Text style={styles.savingsText}>You saved ₹{totals.discount.toFixed(2)} on this order!</Text>
          </LinearGradient>
        )}

        {/* Cart Items */}
        <View style={styles.itemsSection}>
          {cart.items.map(group =>
            group.items.map((item, index) => (
              <View key={item.id || index} style={styles.cartItem}>
                <View style={styles.itemLeft}>
                  <View style={styles.vegIndicator}>
                    <View style={styles.vegDot} />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    <TouchableOpacity style={styles.editButton}>
                      <Text style={styles.editText}>Edit</Text>
                      <Ionicons name="chevron-down" size={12} color="#22c55e" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(group.restaurantId, item.id, item.quantity - 1)}
                    >
                      <Ionicons name="remove" size={16} color="#22c55e" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateQuantity(group.restaurantId, item.id, item.quantity + 1)}
                    >
                      <Ionicons name="add" size={16} color="#22c55e" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Add More Items */}
        <TouchableOpacity style={styles.addMoreButton} onPress={() => navigation.goBack()}>
          <Ionicons name="add-circle-outline" size={20} color="#22c55e" />
          <Text style={styles.addMoreText}>Add more items</Text>
        </TouchableOpacity>

        {/* Restaurant Note */}
        <TouchableOpacity style={styles.noteSection}>
          <Ionicons name="document-text-outline" size={20} color="#64748b" />
          <TextInput
            style={styles.noteInput}
            placeholder="Add a note for the restaurant"
            placeholderTextColor="#94a3b8"
            value={restaurantNote}
            onChangeText={setRestaurantNote}
          />
        </TouchableOpacity>

        {/* Coupon Section */}
        <View style={styles.couponSection}>
          <View style={styles.couponHeader}>
            <Ionicons name="pricetag" size={20} color="#22c55e" />
            <Text style={styles.couponTitle}>Apply Coupon</Text>
          </View>
          <View style={styles.couponInputRow}>
            <TextInput
              style={styles.couponInput}
              placeholder="Enter coupon code"
              placeholderTextColor="#94a3b8"
              value={couponCode}
              onChangeText={setCouponCode}
              autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.applyButton} onPress={applyCoupon}>
              <Text style={styles.applyButtonText}>APPLY</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.viewCouponsButton}>
            <Text style={styles.viewCouponsText}>View all coupons</Text>
            <Ionicons name="chevron-forward" size={16} color="#22c55e" />
          </TouchableOpacity>
        </View>

        {/* Delivery Info */}
        <View style={styles.deliverySection}>
          <View style={styles.deliveryRow}>
            <Ionicons name="bicycle" size={20} color="#64748b" />
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryLabel}>Delivery in {restaurantGroup?.deliveryTime || '20-25'} mins</Text>
              <Text style={styles.deliverySubtext}>Want it later? Schedule it</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </View>
          <View style={styles.divider} />
          <View style={styles.deliveryRow}>
            <Ionicons name="location" size={20} color="#22c55e" />
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryLabel}>Delivery at Home</Text>
              <Text style={styles.deliverySubtext} numberOfLines={1}>123 Main Street, Bangalore</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
          </View>
        </View>

        {/* Bill Details */}
        <TouchableOpacity
          style={styles.billSection}
          onPress={() => setShowBillDetails(!showBillDetails)}
          activeOpacity={0.7}
        >
          <View style={styles.billHeader}>
            <View style={styles.billHeaderLeft}>
              <Ionicons name="receipt-outline" size={20} color="#64748b" />
              <Text style={styles.billTitle}>Total Bill</Text>
              <Text style={styles.billAmount}>₹{totals.total.toFixed(2)}</Text>
            </View>
            <Ionicons name={showBillDetails ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
          </View>

          {showBillDetails && (
            <View style={styles.billDetails}>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Item Total</Text>
                <Text style={styles.billValue}>₹{totals.subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery Fee</Text>
                <Text style={styles.billValue}>₹{totals.deliveryFee.toFixed(2)}</Text>
              </View>
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>GST & Taxes</Text>
                <Text style={styles.billValue}>₹{totals.tax.toFixed(2)}</Text>
              </View>
              {totals.platformFee > 0 && (
                <View style={styles.billRow}>
                  <Text style={styles.billLabel}>Platform Fee</Text>
                  <Text style={styles.billValue}>₹{totals.platformFee.toFixed(2)}</Text>
                </View>
              )}
              {totals.discount > 0 && (
                <View style={styles.billRow}>
                  <Text style={[styles.billLabel, { color: '#22c55e' }]}>Discount</Text>
                  <Text style={[styles.billValue, { color: '#22c55e' }]}>-₹{totals.discount.toFixed(2)}</Text>
                </View>
              )}
              <View style={styles.billDivider} />
              <View style={styles.billRow}>
                <Text style={styles.billTotalLabel}>To Pay</Text>
                <Text style={styles.billTotalValue}>₹{totals.total.toFixed(2)}</Text>
              </View>
            </View>
          )}

          {!showBillDetails && (
            <Text style={styles.billSubtext}>Incl. taxes and charges</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Checkout Bar */}
      <View style={styles.checkoutBar}>
        <View style={styles.checkoutInfo}>
          <Text style={styles.checkoutTotal}>₹{totals.total.toFixed(2)}</Text>
          <Text style={styles.checkoutSubtext}>{totalItems} item{totalItems > 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutButton, loading && styles.checkoutButtonDisabled]}
          onPress={handleCheckout}
          disabled={loading}
        >
          <Text style={styles.checkoutButtonText}>{loading ? 'Processing...' : 'Place Order'}</Text>
          <Ionicons name="arrow-forward" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  deliveryTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    gap: 8,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  itemsSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  itemLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 12,
  },
  vegIndicator: {
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderColor: '#22c55e',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    lineHeight: 20,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 2,
  },
  editText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  qtyBtn: {
    padding: 12,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
    minWidth: 24,
    textAlign: 'center',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 8,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#22c55e',
  },
  noteSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  noteInput: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    padding: 0,
  },
  couponSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  couponHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  couponTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  couponInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  applyButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  viewCouponsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  viewCouponsText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '500',
  },
  deliverySection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  deliverySubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  billSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
  },
  billHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  billHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  billTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  billAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  billSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  billDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  billLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  billValue: {
    fontSize: 14,
    color: '#1e293b',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 10,
  },
  billTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  billTotalValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  checkoutBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  checkoutInfo: {
    flex: 1,
  },
  checkoutTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  checkoutSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  browseButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
});

export default CartScreen;