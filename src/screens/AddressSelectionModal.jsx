import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../services/api';

const AddressSelectionModal = ({ visible, onClose, onSelectAddress, selectedAddress }) => {
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    if (visible) {
      loadAddresses();
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
            <Text style={styles.headerTitle}>Select Delivery Address</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={addresses}
            renderItem={renderAddress}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.addressesList}
            style={styles.addressList}
          />

          <SafeAreaView edges={['bottom']}>
            <TouchableOpacity style={styles.addAddressButton} onPress={() => Alert.alert('Add Address', 'Add new address feature coming soon!')}>
              <Ionicons name="add-circle-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.addAddressText}>Add New Address</Text>
            </TouchableOpacity>
          </SafeAreaView>
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
});

export default AddressSelectionModal;