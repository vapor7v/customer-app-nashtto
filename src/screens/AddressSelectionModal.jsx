import { Ionicons } from '@expo/vector-icons';
import Geolocation from '@react-native-community/geolocation';
import MapplsGL from 'mappls-map-react-native';

// Initialize Mappls SDK (using same keys as MapmyIndiaMap)
const MAPPLS_SDK_KEY = '66e286d0c783c2c94de367177b485cf4';
const MAPPLS_CLIENT_ID = '96dHZVzsAuslxma_gvF5MjrjqzZdTVYtBPY5NwbyDweiaYYYlvzRO31AwKkAZl1V3agx17iJWkVjuOgHzfYysQ==';
const MAPPLS_CLIENT_SECRET = 'lrFxI-iSEg9AUcF-tQMymJYOR8yoSLHj82XgsD0jAjaSZyzDbS5_VaatKmEXhOvZnyn9mGKlZsvA7QUBQG0ZPIuAE2More2m';

MapplsGL.setMapSDKKey(MAPPLS_SDK_KEY);
MapplsGL.setRestAPIKey(MAPPLS_SDK_KEY);
MapplsGL.setAtlasClientId(MAPPLS_CLIENT_ID);
MapplsGL.setAtlasClientSecret(MAPPLS_CLIENT_SECRET);

import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  PermissionsAndroid,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

const AddressSelectionModal = ({ visible, onClose, onSelectAddress, selectedAddress }) => {
  const [addresses, setAddresses] = useState([]);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [newAddress, setNewAddress] = useState({
    name: '',
    address: '',
    latitude: null,
    longitude: null,
  });

  useEffect(() => {
    if (visible) {
      loadAddresses();
      setIsAddingAddress(false);
    }
  }, [visible]);

  const loadAddresses = async () => {
    try {
      const response = await api.getAddresses();
      if (response.success) {
        setAddresses(response.addresses);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load addresses');
    }
  };

  const handleSelectAddress = (address) => {
    onSelectAddress(address);
    onClose();
  };

  const reverseGeocode = async (latitude, longitude) => {
    try {
      // Use Mappls SDK for reverse geocoding
      const response = await MapplsGL.RestApi.reverseGeocode({ latitude, longitude });

      if (response && response.results && response.results.length > 0) {
        const result = response.results[0];
        return result.formatted_address ||
          `${result.locality || ''}, ${result.city || ''}, ${result.state || ''}`.trim();
      }
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    } catch (error) {
      console.error('[AddressModal] Mappls reverse geocode error:', error);
      // Fallback to coordinates
      return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    }
  };

  const getLocation = async (highAccuracy = true) => {
    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        position => resolve(position),
        error => reject(error),
        {
          enableHighAccuracy: highAccuracy,
          timeout: 15000,
          maximumAge: 10000
        }
      );
    });
  };

  const getCurrentLocation = async () => {
    setLoadingLocation(true);

    try {
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );

      if (!hasPermission) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: "Location Permission Required",
            message: "Nashtto needs access to your location to auto-detect your delivery address.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setLoadingLocation(false);
          Alert.alert('Permission Denied', 'Location permission is required.');
          return;
        }
      }

      let position;
      try {
        // Try High Accuracy (GPS) first
        console.log('[AddressModal] Trying High Accuracy Location...');
        position = await getLocation(true);
      } catch (err) {
        console.warn('[AddressModal] High accuracy failed/timed out, trying low accuracy...', err);
        // If timed out (code 3) or unavailable (code 2), try Low Accuracy (Network/WiFi)
        if (err.code === 3 || err.code === 2) {
          position = await getLocation(false);
        } else {
          throw err;
        }
      }

      const { latitude, longitude } = position.coords;
      console.log('[AddressModal] Got location:', latitude, longitude);

      const formattedAddress = await reverseGeocode(latitude, longitude);

      setNewAddress({
        ...newAddress,
        latitude,
        longitude,
        address: formattedAddress,
      });
      setLoadingLocation(false);

    } catch (error) {
      console.error('[AddressModal] Location error:', error);
      setLoadingLocation(false);

      let errorMessage = 'Could not get your location.';
      if (error.code === 1) errorMessage = 'Location permission denied. Please enable it in Settings.';
      else if (error.code === 2) errorMessage = 'GPS is turned off or signal is weak. Please enable Location services.';
      else if (error.code === 3) errorMessage = 'Location request timed out. Please check if your GPS is enabled and you have a clear view of the sky.';

      Alert.alert('Location Error', errorMessage);
    }
  };

  const handleAddAddress = async () => {
    if (!newAddress.name.trim()) {
      Alert.alert('Error', 'Please enter an address name (e.g., Home, Work)');
      return;
    }

    if (!newAddress.latitude || !newAddress.longitude) {
      Alert.alert('Error', 'Please get your current location first');
      return;
    }

    try {
      // For now, add to local state
      const newAddr = {
        id: Date.now().toString(),
        name: newAddress.name.trim(),
        address: newAddress.address,
        latitude: newAddress.latitude,
        longitude: newAddress.longitude,
      };

      setAddresses([...addresses, newAddr]);

      // Reset form
      setNewAddress({
        name: '',
        address: '',
        latitude: null,
        longitude: null,
      });
      setIsAddingAddress(false);

      Alert.alert('Success', 'Address added successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add address');
    }
  };

  const renderAddress = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.addressItem,
        selectedAddress?.id === item.id && styles.selectedAddressItem
      ]}
      onPress={() => handleSelectAddress(item)}
    >
      <View style={styles.addressIcon}>
        <Ionicons
          name={item.name === 'Home' ? 'home-outline' : item.name === 'Work' ? 'business-outline' : 'location-outline'}
          size={20}
          color="#22c55e"
        />
      </View>
      <View style={styles.addressDetails}>
        <Text style={styles.addressName}>{item.name}</Text>
        <Text style={styles.addressText}>{item.address}</Text>
      </View>
      {selectedAddress?.id === item.id && (
        <Ionicons name="checkmark" size={20} color="#22c55e" />
      )}
    </TouchableOpacity>
  );

  const renderAddAddressForm = () => (
    <View style={styles.addAddressForm}>
      <Text style={styles.formTitle}>Add New Address</Text>

      {/* Address Name Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Address Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Home, Work, Office"
          value={newAddress.name}
          onChangeText={(text) => setNewAddress({ ...newAddress, name: text })}
        />
      </View>

      {/* Get Location Button */}
      <TouchableOpacity
        style={styles.locationButton}
        onPress={getCurrentLocation}
        disabled={loadingLocation}
      >
        {loadingLocation ? (
          <ActivityIndicator color="#22c55e" size="small" />
        ) : (
          <>
            <Ionicons name="location" size={20} color="#22c55e" style={{ marginRight: 8 }} />
            <Text style={styles.locationButtonText}>
              {newAddress.latitude ? 'Update Location' : 'Get Current Location'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {/* Show address if location is available */}
      {newAddress.latitude && newAddress.longitude && (
        <View style={styles.locationInfo}>
          <Ionicons name="checkmark-circle" size={16} color="#22c55e" style={{ marginRight: 6 }} />
          <Text style={styles.locationText} numberOfLines={2}>
            {newAddress.address}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.formActions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            setIsAddingAddress(false);
            setNewAddress({
              name: '',
              address: '',
              latitude: null,
              longitude: null,
            });
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleAddAddress}
        >
          <Text style={styles.saveButtonText}>Save Address</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.bottomSheet}>
          {/* Handle Bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isAddingAddress ? 'Add New Address' : 'Select Delivery Address'}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {isAddingAddress ? (
            renderAddAddressForm()
          ) : (
            <>
              <FlatList
                data={addresses}
                renderItem={renderAddress}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.addressesList}
                style={styles.addressList}
              />

              <SafeAreaView edges={['bottom']}>
                <TouchableOpacity
                  style={styles.addAddressButton}
                  onPress={() => setIsAddingAddress(true)}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.addAddressText}>Add New Address</Text>
                </TouchableOpacity>
              </SafeAreaView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomSheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  addressList: {
    maxHeight: 300,
  },
  addressesList: {
    padding: 16,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  selectedAddressItem: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  addressIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  addressDetails: {
    flex: 1,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  addAddressButton: {
    flexDirection: 'row',
    backgroundColor: '#22c55e',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addAddressText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  addAddressForm: {
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1e293b',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  locationButtonText: {
    color: '#22c55e',
    fontSize: 15,
    fontWeight: '600',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 13,
    color: '#15803d',
    flex: 1,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AddressSelectionModal;