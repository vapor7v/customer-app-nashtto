import auth from '@react-native-firebase/auth';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppRegistry } from 'react-native';

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
import apiClient from './src/services/apiClient';

const Stack = createStackNavigator();

export default function App() {
  // Listen to auth state changes and set customer ID
  // TODO: Backend should support Firebase UIDs directly, or we need a user registration API
  // For now, use a consistent development UUID when authenticated
  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      if (user) {
        console.log('[App] Auth state restored, Firebase user:', user.uid);
        // Use a consistent UUID format that the backend accepts
        // In production, this should be mapped via a user registration API
        const customerUUID = '123e4567-e89b-12d3-a456-426614174000';
        apiClient.setCustomerId(customerUUID);
        console.log('[App] Customer ID set:', customerUUID);
      } else {
        console.log('[App] No authenticated user');
        apiClient.setCustomerId(null);
      }
    });
    return () => unsubscribe();
  }, []);
  return (
    <NavigationContainer>
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
  );
}

// Register the app component for React Native
AppRegistry.registerComponent('main', () => App);