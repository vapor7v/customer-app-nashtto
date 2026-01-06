import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Card, CardContent } from '../components/Card';
import api from '../services/api';
import orderService from '../services/orderService';
import { razorpayService } from '../services/razorpayService';

const PaymentScreen = ({ navigation, route }) => {
  const { cart, checkoutResponse } = route.params || {};
  const [cartItems, setCartItems] = useState(cart || []);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('razorpay');
  const [deliveryAddress, setDeliveryAddress] = useState('Home - 123 Main Street, Mumbai');
  const [loading, setLoading] = useState(false);

  const paymentMethods = [
    { id: 'razorpay', name: 'Pay Online (UPI, Cards, Wallets)', icon: 'card-outline' },
    { id: 'cod', name: 'Cash on Delivery', icon: 'cash-outline' },
  ];

  useEffect(() => {
    if (!cart) {
      loadCart();
    }
  }, []);

  const loadCart = async () => {
    try {
      const response = await api.getCart();
      if (response.success) {
        setCartItems(response.cart);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load cart');
    }
  };

  const getTotalPrice = () => {
    if (checkoutResponse?.pricing?.itemTotal != null) {
      return checkoutResponse.pricing.itemTotal;
    }
    if (cartItems.length > 0 && cartItems[0].restaurantId) {
      return cartItems.reduce((total, restaurant) => {
        return total + restaurant.items.reduce((restaurantTotal, item) => {
          return restaurantTotal + ((item.price || item.unitPrice || 0) * (item.quantity || 1));
        }, 0);
      }, 0);
    }
    return cartItems.reduce((total, item) => total + ((item.price || item.unitPrice || 0) * (item.quantity || 1)), 0);
  };

  const getDeliveryFee = () => checkoutResponse?.pricing?.deliveryCharges ?? 40;
  const getGST = () => checkoutResponse?.pricing?.gst ?? getTotalPrice() * 0.05;
  const getPlatformFee = () => checkoutResponse?.pricing?.platformFee ?? 0;
  const getGrandTotal = () => checkoutResponse?.pricing?.totalAmount ?? (getTotalPrice() + getDeliveryFee() + getGST());

  const handleRazorpayPayment = async () => {
    if (!checkoutResponse?.checkoutSessionId) {
      Alert.alert('Error', 'No valid checkout session. Please go back and try again.');
      return;
    }

    setLoading(true);

    try {
      const totalAmount = getGrandTotal();
      console.log('[PaymentScreen] Initiating Razorpay payment for amount:', totalAmount);

      // Get customer info from checkout response
      const customerInfo = {
        name: 'Customer', // In production, get from user profile
        email: 'customer@example.com',
        phone: '+919876543210',
      };

      // Initiate Razorpay Checkout
      const paymentResult = await razorpayService.initiatePayment(
        totalAmount,
        checkoutResponse.checkoutSessionId,
        customerInfo
      );

      console.log('[PaymentScreen] Payment result:', paymentResult);

      if (paymentResult.success && paymentResult.paymentId) {
        // Payment successful - create order
        // TODO: Remove hardcoded token after testing - using tok_gpay_1234 for backend testing
        await createOrderAfterPayment('tok_gpay_1234'); // paymentResult.paymentId
      } else if (paymentResult.error) {
        // Payment failed
        if (razorpayService.isUserCancelled(paymentResult.error)) {
          // User cancelled - don't show error
          console.log('[PaymentScreen] User cancelled payment');
        } else {
          Alert.alert(
            'Payment Failed',
            razorpayService.getErrorMessage(paymentResult.error),
            [{ text: 'Try Again', onPress: () => setLoading(false) }]
          );
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('[PaymentScreen] Payment error:', error);
      Alert.alert('Error', error?.message || 'Payment failed. Please try again.');
      setLoading(false);
    }
  };

  const createOrderAfterPayment = async (paymentId) => {
    try {
      console.log('[PaymentScreen] Creating order with payment ID:', paymentId);
      console.log('[PaymentScreen] Checkout session ID:', checkoutResponse?.checkoutSessionId);
      // Debug: Log customer ID being sent
      const apiClient = require('../services/apiClient').default;
      console.log('[PaymentScreen] Customer ID in apiClient:', apiClient.getCustomerId());

      const orderRequest = {
        checkoutSessionId: checkoutResponse.checkoutSessionId,
        paymentToken: paymentId, // Use Razorpay payment ID as token
      };

      console.log('[PaymentScreen] Order request:', JSON.stringify(orderRequest, null, 2));
      const orderResponse = await orderService.createOrder(orderRequest);
      console.log('[PaymentScreen] Order response:', JSON.stringify(orderResponse, null, 2));

      if (orderResponse?.orderId) {
        // Clear cart after successful order
        await api.clearCart();

        // Navigate directly to Tracking screen without dialog
        navigation.reset({
          index: 1,
          routes: [
            { name: 'Home' },
            {
              name: 'Tracking',
              params: {
                order: {
                  id: orderResponse.orderId,
                  vendorName: checkoutResponse.vendorName || 'Restaurant',
                  status: 'confirmed',
                  total: getGrandTotal(),
                  _original: orderResponse,
                },
                isNewOrder: true,
              },
            },
          ],
        });
      } else {
        // Fallback - navigate to Orders if no orderId
        navigation.reset({
          index: 1,
          routes: [{ name: 'Home' }, { name: 'Orders' }],
        });
      }
    } catch (error) {
      console.error('[PaymentScreen] Order creation error:', error);
      console.error('[PaymentScreen] Error details:', {
        message: error?.message,
        status: error?.status,
        details: error?.details,
        stack: error?.stack,
      });

      // Show more detailed error message for debugging
      const errorMessage = error?.details?.message || error?.message || 'Unknown error';
      const errorStatus = error?.status || 'N/A';

      Alert.alert(
        'Order Error',
        `Payment was successful but order creation failed.\n\nError: ${errorMessage}\nStatus: ${errorStatus}\n\nPlease contact support.`,
        [{
          text: 'OK', onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          })
        }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCODPayment = async () => {
    if (!checkoutResponse?.checkoutSessionId) {
      Alert.alert('Error', 'No valid checkout session. Please go back and try again.');
      return;
    }

    setLoading(true);

    try {
      const orderRequest = {
        checkoutSessionId: checkoutResponse.checkoutSessionId,
        paymentToken: 'COD', // Cash on Delivery
      };

      const orderResponse = await orderService.createOrder(orderRequest);

      if (orderResponse?.orderId) {
        await api.clearCart();

        // Navigate directly to Tracking screen without dialog
        navigation.reset({
          index: 1,
          routes: [
            { name: 'Home' },
            {
              name: 'Tracking',
              params: {
                order: {
                  id: orderResponse.orderId,
                  vendorName: checkoutResponse.vendorName || 'Restaurant',
                  status: 'confirmed',
                  total: getGrandTotal(),
                  paymentMethod: 'COD',
                  _original: orderResponse,
                },
                isNewOrder: true,
              },
            },
          ],
        });
      }
    } catch (error) {
      console.error('[PaymentScreen] COD order error:', error);
      Alert.alert('Error', error?.message || 'Failed to place order.');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (selectedPaymentMethod === 'razorpay') {
      handleRazorpayPayment();
    } else if (selectedPaymentMethod === 'cod') {
      handleCODPayment();
    }
  };


  const renderPaymentMethod = (method) => (
    <TouchableOpacity
      key={method.id}
      style={[
        styles.paymentMethodCard,
        selectedPaymentMethod === method.id && styles.selectedPaymentMethod,
      ]}
      onPress={() => setSelectedPaymentMethod(method.id)}
    >
      <Ionicons
        name={method.icon}
        size={24}
        color={selectedPaymentMethod === method.id ? '#22c55e' : '#64748b'}
        style={{ marginRight: 12 }}
      />
      <Text style={[
        styles.methodName,
        selectedPaymentMethod === method.id && styles.selectedMethodText,
      ]}>
        {method.name}
      </Text>
      <View style={[
        styles.radioButton,
        selectedPaymentMethod === method.id && styles.selectedRadioButton,
      ]}>
        {selectedPaymentMethod === method.id && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );

  // Note: Razorpay SDK handles all payment UI (UPI, cards, wallets, etc.)
  // No custom payment form needed


  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#64748b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <Text style={styles.sectionTitle}>Order Summary</Text>

          {/* Display items from checkoutResponse */}
          {checkoutResponse?.items ? (
            checkoutResponse.items.map((item, index) => (
              <View key={index} style={styles.orderItem}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>₹{item.subtotal || (item.unitPrice * item.quantity)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.summaryLabel}>Loading items...</Text>
          )}

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal:</Text>
            <Text style={styles.summaryValue}>₹{getTotalPrice()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee:</Text>
            <Text style={styles.summaryValue}>₹{getDeliveryFee()}</Text>
          </View>
          {getPlatformFee() > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform Fee:</Text>
              <Text style={styles.summaryValue}>₹{getPlatformFee().toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>GST (5%):</Text>
            <Text style={styles.summaryValue}>₹{getGST().toFixed(2)}</Text>
          </View>

          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>₹{getGrandTotal().toFixed(2)}</Text>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.addressSection}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Card style={styles.addressCard}>
            <CardContent>
              <View style={styles.addressContent}>
                <Ionicons name="location-outline" size={20} color="#64748b" style={{ marginRight: 12 }} />
                <View style={styles.addressInfo}>
                  <Text style={styles.addressName}>{deliveryAddress.split(' - ')[0]}</Text>
                  <Text style={styles.addressDetail}>{deliveryAddress.split(' - ')[1]}</Text>
                </View>
                <TouchableOpacity style={styles.changeButton}>
                  <Text style={styles.changeText}>Change</Text>
                </TouchableOpacity>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          {paymentMethods.map(renderPaymentMethod)}

          {/* Razorpay info for online payments */}
          {selectedPaymentMethod === 'razorpay' && (
            <View style={styles.razorpayInfo}>
              <Ionicons name="shield-checkmark" size={16} color="#22c55e" />
              <Text style={styles.razorpayInfoText}>
                Secure payments via Razorpay (UPI, Cards, Net Banking, Wallets)
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Checkout Button */}
      <View style={styles.checkoutContainer}>
        <Button
          title={`Pay ₹${getGrandTotal().toFixed(2)}`}
          onPress={handlePayment}
          loading={loading}
          style={styles.checkoutButton}
        />
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
    justifyContent: 'space-between',
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
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  orderSummary: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: '#1e293b',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#64748b',
  },
  itemPrice: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1e293b',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: 'bold',
  },
  addressSection: {
    marginTop: 24,
  },
  addressCard: {
    marginBottom: 8,
  },
  addressContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressInfo: {
    flex: 1,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  addressDetail: {
    fontSize: 12,
    color: '#64748b',
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  changeText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentSection: {
    marginTop: 24,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedPaymentMethod: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  methodName: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  selectedMethodText: {
    color: '#22c55e',
    fontWeight: '600',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedRadioButton: {
    borderColor: '#22c55e',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  upiForm: {
    marginTop: 16,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1e293b',
    marginBottom: 12,
  },
  checkoutContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  checkoutButton: {
    backgroundColor: '#22c55e',
  },
  bottomPadding: {
    height: 20,
  },
  razorpayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  razorpayInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#166534',
  },
});

export default PaymentScreen;