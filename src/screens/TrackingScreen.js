import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapmyIndiaMap from '../components/MapmyIndiaMap';
import trackingService from '../services/trackingService';


// Map backend status to UI step IDs
const mapBackendStatusToStepId = (status) => {
  const statusMap = {
    'ORDER_PLACED': 'confirmed',
    'ORDER_CONFIRMED': 'confirmed',
    'PREPARING': 'preparing',
    'RIDER_ASSIGNED': 'preparing',
    'READY_FOR_PICKUP': 'ready',
    'OUT_FOR_DELIVERY': 'picked_up',
    'DELIVERED': 'delivered',
    'CANCELLED': 'cancelled',
  };
  return statusMap[status] || 'confirmed';
};

const TrackingScreen = ({ route, navigation }) => {
  const { order, isNewOrder } = route.params || {};
  const [orderStatus, setOrderStatus] = useState(order?.status?.toLowerCase() || 'confirmed');
  const [statusDetails, setStatusDetails] = useState(null);
  const [riderInfo, setRiderInfo] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(25);
  const [riderLocation, setRiderLocation] = useState(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(isNewOrder);

  // Hide success banner after 4 seconds
  useEffect(() => {
    if (showSuccessBanner) {
      const timer = setTimeout(() => setShowSuccessBanner(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessBanner]);

  // Fetch real order status from backend
  useEffect(() => {
    if (!order?.id && !order?._original?.orderId) return;

    const orderId = order?._original?.orderId || order?.id;
    const customerId = order?._original?.customerId || '123e4567-e89b-12d3-a456-426614174000';

    const fetchStatus = async () => {
      try {
        console.log('[TrackingScreen] Fetching order status for:', orderId);
        const status = await trackingService.getOrderStatus(customerId, orderId);
        console.log('[TrackingScreen] Status received:', status.status);

        setOrderStatus(mapBackendStatusToStepId(status.status));
        setStatusDetails(status);
        setRiderInfo(status.riderInfo);
        setEstimatedTime(status.estimatedMinutesRemaining || 25);

        // Try to get rider location if rider is assigned
        if (status.riderInfo?.riderId) {
          try {
            const delivery = await trackingService.getDeliveryByOrderId(orderId);
            if (delivery?.deliveryId) {
              const location = await trackingService.getRiderLocation(delivery.deliveryId);
              setRiderLocation(location);
            }
          } catch (locError) {
            console.log('[TrackingScreen] Rider location not available:', locError.message);
          }
        }
      } catch (error) {
        console.error('[TrackingScreen] Error fetching status:', error);
        // Keep using local order status if backend fails
      }
    };

    fetchStatus();

    // Poll for updates every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, [order]);

  // Mock locations for demo - updated with real rider location when available
  const shopLocation = {
    latitude: 19.0760,
    longitude: 72.8777,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const deliveryLocation = riderLocation ? {
    latitude: riderLocation.latitude,
    longitude: riderLocation.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  } : {
    latitude: 19.0820,
    longitude: 72.8820,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const customerLocation = {
    latitude: 19.0780,
    longitude: 72.8790,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return '#22c55e';
      case 'preparing':
        return '#f59e0b';
      case 'ready':
        return '#3b82f6';
      case 'picked_up':
        return '#8b5cf6';
      case 'delivered':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (statusId, isActive) => {
    const color = isActive ? '#ffffff' : '#94a3b8';
    switch (statusId) {
      case 'confirmed':
        return <Ionicons name="checkmark" size={16} color={color} />;
      case 'preparing':
        return <Ionicons name="restaurant" size={16} color={color} />;
      case 'ready':
        return <Ionicons name="bag-check" size={16} color={color} />;
      case 'picked_up':
        return <Ionicons name="bicycle" size={16} color={color} />;
      case 'delivered':
        return <Ionicons name="home" size={16} color={color} />;
      default:
        return <Ionicons name="ellipse-outline" size={16} color={color} />;
    }
  };

  const trackingSteps = [
    { id: 'confirmed', label: 'Order\nConfirmed' },
    { id: 'preparing', label: 'Preparing\nFood' },
    { id: 'ready', label: 'Ready for\nPickup' },
    { id: 'picked_up', label: 'Out for\nDelivery' },
    { id: 'delivered', label: 'Delivered' }
  ];

  const currentStepIndex = trackingSteps.findIndex(step => step.id === orderStatus);

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Tracking</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="receipt-outline" size={64} color="#cbd5e1" />
          <Text style={{ marginTop: 16, color: '#64748b' }}>No order details available.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Order Tracking</Text>
          <Text style={styles.orderId}>#{(order.id || '').slice(0, 8)}...</Text>
        </View>
        <View style={styles.etaBadge}>
          <Text style={styles.etaNumber}>{estimatedTime}</Text>
          <Text style={styles.etaLabel}>min</Text>
        </View>
      </View>

      {/* Success Banner */}
      {showSuccessBanner && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
          <Text style={styles.successText}>Order placed successfully!</Text>
        </View>
      )}

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Map Section - Large */}
        <View style={styles.mapContainer}>
          <MapmyIndiaMap
            style={styles.map}
            center={{
              latitude: shopLocation.latitude,
              longitude: shopLocation.longitude,
            }}
            zoom={14}
            markers={[
              {
                latitude: shopLocation.latitude,
                longitude: shopLocation.longitude,
                title: order.vendorName || 'Restaurant',
              },
              {
                latitude: deliveryLocation.latitude,
                longitude: deliveryLocation.longitude,
                title: 'Delivery Partner',
              },
              {
                latitude: customerLocation.latitude,
                longitude: customerLocation.longitude,
                title: 'Your Location',
              },
            ]}
          />
        </View>

        {/* Progress Steps */}
        <View style={styles.progressCard}>
          <View style={styles.progressContainer}>
            {trackingSteps.map((step, index) => {
              const isActive = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <View key={step.id} style={styles.progressStep}>
                  <View style={[
                    styles.progressIcon,
                    isActive && styles.progressIconActive,
                    isCurrent && styles.progressIconCurrent,
                  ]}>
                    {getStatusIcon(step.id, isActive)}
                  </View>
                  {index < trackingSteps.length - 1 && (
                    <View style={[
                      styles.progressLine,
                      index < currentStepIndex && styles.progressLineActive,
                    ]} />
                  )}
                </View>
              );
            })}
          </View>
          <View style={styles.progressLabels}>
            {trackingSteps.map((step, index) => (
              <Text key={step.id} style={[
                styles.progressLabel,
                index <= currentStepIndex && styles.activeLabel,
              ]}>
                {step.label}
              </Text>
            ))}
          </View>
        </View>

        {/* Restaurant & Rider Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoSection}>
              <Ionicons name="restaurant" size={20} color="#22c55e" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>{order.vendorName || 'Restaurant'}</Text>
                <Text style={styles.infoSubtext}>Preparing your order</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <Ionicons name="call" size={18} color="#22c55e" />
            </TouchableOpacity>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoSection}>
              <Ionicons name="bicycle" size={20} color="#8b5cf6" />
              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>{riderInfo?.riderName || 'Assigning rider...'}</Text>
                <Text style={styles.infoSubtext}>Delivery Partner</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <Ionicons name="call" size={18} color="#8b5cf6" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.addressCard}>
          <View style={styles.addressIcon}>
            <Ionicons name="location" size={20} color="#ef4444" />
          </View>
          <View style={styles.addressContent}>
            <Text style={styles.addressLabel}>Delivering to</Text>
            <Text style={styles.addressText}>Home • 123 Main Street, Mumbai</Text>
          </View>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#22c55e',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  orderId: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  etaBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  etaNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  etaLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    gap: 8,
  },
  successText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  mapContainer: {
    height: 360,
    backgroundColor: '#e2e8f0',
  },
  map: {
    flex: 1,
  },
  progressCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: -24,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressIconActive: {
    backgroundColor: '#22c55e',
  },
  progressIconCurrent: {
    backgroundColor: '#22c55e',
    borderWidth: 3,
    borderColor: '#bbf7d0',
  },
  progressLine: {
    width: 24,
    height: 3,
    backgroundColor: '#e2e8f0',
    marginHorizontal: 4,
  },
  progressLineActive: {
    backgroundColor: '#22c55e',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'center',
    flex: 1,
    lineHeight: 14,
  },
  activeLabel: {
    color: '#1e293b',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  infoText: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  infoSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 10,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  addressIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addressContent: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  addressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
    marginTop: 2,
  },
});

export default TrackingScreen;