// Import Firebase app first to ensure initialization
import '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Alert, AppRegistry } from 'react-native';

// Context provider
import { OrderProvider } from './src/context/OrderContext';

// Screens
import AuthScreen from './src/screens/AuthScreen.jsx';
import CartScreen from './src/screens/CartScreen.jsx';
import HomeScreen from './src/screens/HomeScreen.jsx';
import NotificationsScreen from './src/screens/NotificationsScreen.jsx';
import OrderDetailsScreen from './src/screens/OrderDetailsScreen.jsx';
import OrdersScreen from './src/screens/OrdersScreen.jsx';
import PaymentScreen from './src/screens/PaymentScreen.js';
import ProfileScreen from './src/screens/ProfileScreen.js';
import ReviewsScreen from './src/screens/ReviewsScreen.jsx';
import SearchScreen from './src/screens/SearchScreen.js';
import SupportScreen from './src/screens/SupportScreen.jsx';
import TrackingScreen from './src/screens/TrackingScreen.js';
import VendorScreen from './src/screens/VendorScreen.jsx';
import WalletScreen from './src/screens/WalletScreen.jsx';

// Services
import { configureLocationUploader, startLocationUpload } from './src/services';
import apiClient from './src/services/apiClient';
import { setNavigationRef, setupNotificationHandler } from './src/services/notificationHandler';
import { notificationService } from './src/services/notificationService';

const Stack = createStackNavigator();

export default function App() {
  const navigationRef = useRef(null);

  // Initialize push notifications
  useEffect(() => {
    const initNotifications = async () => {
      try {
        // Request permission
        const permissionGranted = await notificationService.requestPermission();
        console.log('[App] Notification permission:', permissionGranted ? 'granted' : 'denied');

        if (permissionGranted) {
          // Initialize the notification service
          await notificationService.initialize({
            showForegroundNotifications: true,
          });

          // Setup notification handlers (routes to OrderContext)
          setupNotificationHandler();

          // Get and log the FCM token (for testing)
          const token = await notificationService.getToken();
          if (token) {
            console.log('[App] FCM Token available for push notifications');
          }
        }
      } catch (error) {
        console.error('[App] Notification initialization failed:', error);
      }
    };

    initNotifications();

    // Cleanup on unmount
    return () => {
      notificationService.cleanup();
    };
  }, []);

  // Listen to auth state changes and set customer ID
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (user) {
        console.log('[App] Auth state restored, Firebase user:', user.uid);
        // Use a consistent UUID format that the backend accepts
        // TODO: In production, this should be mapped via a user registration API
        const customerUUID = '123e4567-e89b-12d3-a456-426614174000';
        apiClient.setCustomerId(customerUUID);
        console.log('[App] Customer ID set:', customerUUID);

        // Send FCM token to server (when authenticated)
        const token = notificationService.getCurrentToken();
        if (token) {
          notificationService.sendTokenToServer(token, customerUUID);
        }
      } else {
        console.log('[App] No authenticated user');
        apiClient.setCustomerId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Configure location uploader
  configureLocationUploader({
    intervalMs: 30000,
    collection: 'locations',
    userId: auth().currentUser?.uid || 'guest'
  });
  startLocationUpload();

  // Handle foreground notification display
  useEffect(() => {
    const unsubscribe = notificationService.onNotificationReceived((payload) => {
      // Show in-app alert for foreground notifications
      Alert.alert(
        payload.title,
        payload.body,
        [
          {
            text: 'View',
            onPress: () => {
              // Navigate based on notification type
              if (payload.data.orderId && navigationRef.current) {
                navigationRef.current.navigate('Tracking', { orderId: payload.data.orderId });
              }
            },
          },
          { text: 'Dismiss', style: 'cancel' },
        ]
      );
    });

    return unsubscribe;
  }, []);

  return (
    <OrderProvider>
      <NavigationContainer
        ref={(ref) => {
          navigationRef.current = ref;
          // Set navigation ref for deep linking from notifications
          if (ref) {
            setNavigationRef(ref);
          }
        }}
      >
        <StatusBar style="auto" />
        <Stack.Navigator
          initialRouteName="Auth"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen name="Search" component={SearchScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Payment" component={PaymentScreen} />
          <Stack.Screen name="Tracking" component={TrackingScreen} />
          <Stack.Screen name="Vendor" component={VendorScreen} />
          <Stack.Screen name="Reviews" component={ReviewsScreen} />
          <Stack.Screen name="Support" component={SupportScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Orders" component={OrdersScreen} />
          <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
          <Stack.Screen name="Wallet" component={WalletScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </OrderProvider>
  );
}

// Register the app component for React Native
AppRegistry.registerComponent('main', () => App);
