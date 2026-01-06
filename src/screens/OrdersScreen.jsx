import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import orderService from '../services/orderService';

// Helper function to format order state for display
const formatOrderState = (state) => {
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
  return stateMap[state] || state || 'Unknown';
};

// Helper to format date with time
const formatDateTime = (dateString) => {
  if (!dateString) return 'Recently';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Recently';
  }
};

const OrdersScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ratings, setRatings] = useState({}); // Store food & delivery ratings

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await orderService.listOrders();
      const transformedOrders = (response || []).map(order => ({
        id: order.orderId || order.orderNumber,
        vendorName: order.vendor?.vendorName || order.vendor?.branchName || 'Restaurant',
        vendorLocation: order.vendor?.area || order.vendor?.city || '',
        vendorImage: order.vendor?.image || 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=100',
        status: formatOrderState(order.orderState),
        total: order.pricing?.totalAmount || 0,
        date: formatDateTime(order.orderPlacedAt),
        items: (order.items || []).map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.unitPrice || item.subtotal,
        })),
        _original: order,
      }));

      transformedOrders.sort((a, b) => {
        const dateA = new Date(a._original.orderPlacedAt || 0);
        const dateB = new Date(b._original.orderPlacedAt || 0);
        return dateB - dateA;
      });

      setOrders(transformedOrders);
    } catch (error) {
      console.error('[OrdersScreen] Failed to load orders:', error);
      Alert.alert('Error', 'Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleRating = (orderId, type, value) => {
    setRatings(prev => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [type]: value,
      }
    }));
    // TODO: Send rating to backend
  };

  const handleReorder = (order) => {
    // Navigate to vendor screen or add items to cart
    navigation.navigate('OrderDetails', { order, reorder: true });
  };

  const getStatusStyle = (status) => {
    const isDelivered = status.toLowerCase() === 'delivered';
    const isCancelled = status.toLowerCase() === 'cancelled';
    return {
      color: isDelivered ? '#22c55e' : isCancelled ? '#ef4444' : '#64748b',
    };
  };

  const renderStars = (orderId, type, currentRating = 0) => {
    const rating = ratings[orderId]?.[type] || currentRating;
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleRating(orderId, type, star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={22}
              color={star <= rating ? '#fbbf24' : '#d1d5db'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderOrderCard = (order) => {
    const isDelivered = order.status.toLowerCase() === 'delivered';

    return (
      <View key={order.id} style={styles.orderCard}>
        {/* Restaurant Header */}
        <TouchableOpacity
          style={styles.restaurantHeader}
          onPress={() => navigation.navigate('OrderDetails', { order })}
        >
          <Image
            source={{ uri: order.vendorImage }}
            style={styles.restaurantImage}
          />
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{order.vendorName}</Text>
            {order.vendorLocation && (
              <Text style={styles.restaurantLocation}>{order.vendorLocation}</Text>
            )}
          </View>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, getStatusStyle(order.status)]}>
              {order.status}
            </Text>
            {isDelivered && (
              <Ionicons name="checkmark-circle" size={18} color="#22c55e" style={{ marginLeft: 4 }} />
            )}
          </View>
        </TouchableOpacity>

        {/* Order Items */}
        <View style={styles.itemsSection}>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemQuantity}>{item.quantity}x</Text>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
            </View>
          ))}
        </View>

        {/* Rating Section - Only for delivered orders */}
        {isDelivered && (
          <View style={styles.ratingSection}>
            <View style={styles.ratingColumn}>
              <Text style={styles.ratingLabel}>Your Food Rating</Text>
              {renderStars(order.id, 'food')}
            </View>
            <View style={styles.ratingDivider} />
            <View style={styles.ratingColumn}>
              <Text style={styles.ratingLabel}>Delivery Rating</Text>
              {renderStars(order.id, 'delivery')}
            </View>
          </View>
        )}

        {/* Reorder Button */}
        {isDelivered && (
          <TouchableOpacity
            style={styles.reorderButton}
            onPress={() => handleReorder(order)}
          >
            <Text style={styles.reorderText}>REORDER</Text>
            <Ionicons name="chevron-forward" size={18} color="#f97316" />
          </TouchableOpacity>
        )}

        {/* Order Footer */}
        <View style={styles.orderFooter}>
          <Text style={styles.orderDate}>Ordered: {order.date}</Text>
          <Text style={styles.orderTotal}>Bill Total: ₹{order.total}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="restaurant-outline" size={48} color="#22c55e" />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>PAST ORDERS</Text>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#22c55e']} />
        }
      >
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>
              Your order history will appear here once you place your first order
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.browseButtonText}>Browse Restaurants</Text>
            </TouchableOpacity>
          </View>
        ) : (
          orders.map(renderOrderCard)
        )}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    letterSpacing: 0.5,
  },
  helpButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f97316',
  },
  helpText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#f97316',
  },
  sectionHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
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
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 8,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  orderCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  restaurantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  restaurantImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  restaurantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  restaurantLocation: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  itemsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#64748b',
    width: 28,
  },
  itemName: {
    fontSize: 14,
    color: '#1e293b',
    flex: 1,
  },
  ratingSection: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingVertical: 14,
    marginHorizontal: 16,
  },
  ratingColumn: {
    flex: 1,
  },
  ratingDivider: {
    width: 1,
    backgroundColor: '#e5e5e5',
    marginHorizontal: 16,
  },
  ratingLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  starButton: {
    padding: 2,
  },
  reorderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff7ed',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  reorderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f97316',
    letterSpacing: 0.5,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
  },
  orderDate: {
    fontSize: 12,
    color: '#64748b',
  },
  orderTotal: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
});

export default OrdersScreen;