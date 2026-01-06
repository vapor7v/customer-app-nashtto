import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
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
import searchService from '../services/searchService';

const VendorScreen = ({ navigation, route }) => {
  const { vendor } = route.params || {};
  const [vendorData, setVendorData] = useState(vendor || null);
  const [menu, setMenu] = useState([]);

  const [cartItems, setCartItems] = useState([]);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [pendingItem, setPendingItem] = useState(null);
  const [existingRestaurantName, setExistingRestaurantName] = useState('');

  // Branch picker state
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [showBranchPicker, setShowBranchPicker] = useState(false);

  useEffect(() => {
    if (vendor) {
      // Initialize selected branch from vendor data
      const branches = vendor.branches || [];
      if (branches.length > 0) {
        setSelectedBranch(branches[0]);
      }
      // Use branchId from first branch or original data
      const branchId = branches[0]?.branchId || vendor._original?.branchId || vendor.branchId || vendor.id;
      loadVendorMenu(branchId);
    }
  }, [vendor]);

  // Handle branch change
  const handleBranchChange = (branch) => {
    setSelectedBranch(branch);
    setShowBranchPicker(false);
    loadVendorMenu(branch.branchId);
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadCart();
      // Refresh menu to get updated isOpen status
      const branchId = selectedBranch?.branchId || vendor?.branches?.[0]?.branchId || vendor?._original?.branchId || vendor?.branchId || vendor?.id;
      if (branchId) {
        loadVendorMenu(branchId);
      }
    });
    return unsubscribe;
  }, [navigation, selectedBranch, vendor]);

  const loadCart = async () => {
    try {
      const response = await api.getCart();
      if (response.success) {
        // Create a new array reference to ensure React re-renders
        setCartItems([...response.cart.items]);
      }
    } catch (error) {
      console.error('Failed to load cart', error);
    }
  };

  const loadVendorMenu = async (branchId) => {
    try {
      console.log('[VendorScreen] Loading menu for branch:', branchId);

      // Try real backend API first
      const menuResponse = await searchService.getVendorMenu({
        branchId: typeof branchId === 'string' ? parseInt(branchId) : branchId,
        latitude: 12.9716,
        longitude: 77.5946,
      });

      console.log('[VendorScreen] Menu response:', menuResponse?.categories?.length, 'categories');
      console.log('[VendorScreen] Vendor isOpen status from API:', menuResponse?.vendor?.isOpen);

      // Update isOpen status from fresh API response
      if (menuResponse?.vendor) {
        const freshIsOpenStatus = menuResponse.vendor.isOpen;

        // Update selectedBranch with fresh status
        setSelectedBranch(prev => {
          if (prev && prev.branchId === branchId) {
            return { ...prev, isOpen: freshIsOpenStatus };
          }
          return prev;
        });

        // Update vendorData._original with fresh status
        setVendorData(prev => {
          if (prev) {
            return {
              ...prev,
              _original: {
                ...prev._original,
                isOpen: freshIsOpenStatus
              }
            };
          }
          return prev;
        });

        console.log('[VendorScreen] Updated isOpen status to:', freshIsOpenStatus);
      }

      // Flatten categories into menu items
      const menuItems = [];
      (menuResponse?.categories || []).forEach(category => {
        (category.items || []).forEach(item => {
          menuItems.push({
            id: item.menuItemId || item.id,
            name: item.name,
            price: item.price,
            category: category.categoryName || item.category,
            description: item.description,
            image: item.images?.primary || 'https://images.unsplash.com/photo-1648192312898-838f9b322f47?w=100',
            isAvailable: item.isAvailable !== false,
            branchId: branchId,
            menuItemId: item.menuItemId || item.id,
            _original: item,
          });
        });
      });

      if (menuItems.length > 0) {
        setMenu(menuItems);
      } else {
        // Fallback to mock API if backend returns empty
        console.log('[VendorScreen] No backend menu, using mock');
        const response = await api.getVendorMenu(branchId);
        if (response.success) {
          setMenu(response.menu);
        }
      }
    } catch (error) {
      console.error('[VendorScreen] Menu load error, using mock:', error.message);
      // Fallback to mock API
      try {
        const response = await api.getVendorMenu(branchId);
        if (response.success) {
          setMenu(response.menu);
        }
      } catch (mockError) {
        Alert.alert('Error', 'Failed to load menu');
      }
    }
  };

  const getQuantity = (itemId) => {
    if (!vendorData) return 0;
    const restaurantId = vendorData._original?.branchId || vendorData.id;
    const restaurantGroup = cartItems.find(group => group.restaurantId === restaurantId);
    if (!restaurantGroup) return 0;
    const item = restaurantGroup.items.find(i => i.id === itemId);
    return item ? item.quantity : 0;
  };

  // Get total items in cart for this vendor
  const getCartItemCount = () => {
    if (!vendorData) return 0;
    const restaurantId = vendorData._original?.branchId || vendorData.id;
    const restaurantGroup = cartItems.find(group => group.restaurantId === restaurantId);
    if (!restaurantGroup) return 0;
    return restaurantGroup.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  // Get total amount for this vendor
  const getCartTotal = () => {
    if (!vendorData) return 0;
    const restaurantId = vendorData._original?.branchId || vendorData.id;
    const restaurantGroup = cartItems.find(group => group.restaurantId === restaurantId);
    if (!restaurantGroup) return 0;
    return restaurantGroup.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  // Check if cart has items from a different restaurant
  const hasDifferentRestaurantItems = () => {
    if (cartItems.length === 0) return false;
    const currentRestaurantId = vendorData._original?.branchId || vendorData.id;
    return cartItems.some(group => group.restaurantId !== currentRestaurantId);
  };

  // Get the name of the restaurant currently in cart
  const getExistingCartRestaurantName = () => {
    if (cartItems.length === 0) return '';
    return cartItems[0]?.restaurantName || 'another restaurant';
  };

  // Helper to create optimistic cart update
  const optimisticUpdateCart = (item, newQuantity) => {
    const restaurantId = vendorData._original?.branchId || vendorData.id;
    const restaurantName = vendorData.name;

    setCartItems(prevItems => {
      const newItems = [...prevItems];
      let restaurantGroup = newItems.find(group => group.restaurantId === restaurantId);

      if (!restaurantGroup) {
        // Create new restaurant group
        restaurantGroup = {
          restaurantId,
          restaurantName,
          items: []
        };
        newItems.push(restaurantGroup);
      }

      const existingItemIndex = restaurantGroup.items.findIndex(i => i.id === item.id);

      if (newQuantity <= 0) {
        // Remove item
        if (existingItemIndex !== -1) {
          restaurantGroup.items.splice(existingItemIndex, 1);
        }
        // Remove empty restaurant group
        if (restaurantGroup.items.length === 0) {
          const groupIndex = newItems.findIndex(g => g.restaurantId === restaurantId);
          if (groupIndex !== -1) {
            newItems.splice(groupIndex, 1);
          }
        }
      } else if (existingItemIndex !== -1) {
        // Update existing item quantity
        restaurantGroup.items[existingItemIndex] = {
          ...restaurantGroup.items[existingItemIndex],
          quantity: newQuantity
        };
      } else {
        // Add new item
        restaurantGroup.items.push({
          id: item.id,
          name: item.name,
          price: item.price,
          menuItemId: item.menuItemId || item.id,
          branchId: item.branchId || restaurantId,
          quantity: newQuantity
        });
      }

      return newItems;
    });
  };

  // Actually add item to cart (called after confirmation or directly)
  const addItemToCart = async (item) => {
    // Optimistic update - show change immediately
    optimisticUpdateCart(item, 1);

    try {
      const response = await api.addToCart(
        {
          id: item.id,
          name: item.name,
          price: item.price,
          menuItemId: item.menuItemId || item.id,
          branchId: item.branchId || vendorData._original?.branchId || vendorData.id,
        },
        vendorData._original?.branchId || vendorData.id,
        vendorData.name
      );
      if (response.success) {
        // Sync with server response
        setCartItems([...response.cart.items]);
      }
    } catch (error) {
      // Revert optimistic update on error
      optimisticUpdateCart(item, 0);
      Alert.alert('Error', 'Failed to add item');
    }
  };

  // Handle replace cart confirmation
  const handleReplaceCart = async () => {
    setShowReplaceModal(false);
    try {
      // Clear existing cart first
      await api.clearCart();
      // Then add the pending item
      if (pendingItem) {
        await addItemToCart(pendingItem);
        setPendingItem(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to replace cart');
    }
  };

  const handleIncrement = async (item) => {
    // Check if branch is closed
    const isBranchClosed = selectedBranch?.isOpen === false ||
      vendorData?._original?.isOpen === false;
    if (isBranchClosed) {
      Alert.alert(
        'Branch Closed',
        'This branch is currently closed. Please select another branch or try again later.',
        [{ text: 'OK' }]
      );
      return;
    }

    const currentQty = getQuantity(item.id);
    if (currentQty === 0) {
      // Check if cart has items from a different restaurant
      if (hasDifferentRestaurantItems()) {
        // Show replace modal
        setExistingRestaurantName(getExistingCartRestaurantName());
        setPendingItem(item);
        setShowReplaceModal(true);
        return;
      }
      // Add item directly
      await addItemToCart(item);
    } else {
      // Optimistic update - show change immediately
      const newQty = currentQty + 1;
      optimisticUpdateCart(item, newQty);

      try {
        const response = await api.updateCartItem(vendorData.id, item.id, newQty);
        if (response.success) {
          // Sync with server response
          setCartItems([...response.cart.items]);
        }
      } catch (error) {
        // Revert optimistic update on error
        optimisticUpdateCart(item, currentQty);
        Alert.alert('Error', 'Failed to update quantity');
      }
    }
  };

  const handleDecrement = async (item) => {
    const currentQty = getQuantity(item.id);
    if (currentQty > 0) {
      // Optimistic update - show change immediately
      const newQty = currentQty - 1;
      optimisticUpdateCart(item, newQty);

      try {
        // If quantity becomes 0, updateCartItem handles removal or we can call removeFromCart
        const response = currentQty === 1
          ? await api.removeFromCart(vendorData.id, item.id)
          : await api.updateCartItem(vendorData.id, item.id, newQty);

        if (response.success) {
          // Sync with server response
          setCartItems([...response.cart.items]);
        }
      } catch (error) {
        // Revert optimistic update on error
        optimisticUpdateCart(item, currentQty);
        Alert.alert('Error', 'Failed to update quantity');
      }
    }
  };

  const renderMenuItem = (item) => {
    const quantity = getQuantity(item.id);

    return (
      <Card key={item.id} style={styles.menuItem}>
        <View style={styles.itemContent}>
          <Image
            source={{ uri: item.image }}
            style={styles.itemImage}
          />
          <CardContent style={styles.itemDetails}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemCategory}>{item.category}</Text>
            <Text style={styles.itemPrice}>₹{item.price}</Text>
          </CardContent>

          {quantity === 0 ? (
            <Button
              title="Add"
              onPress={() => handleIncrement(item)}
              size="small"
              style={styles.addButton}
            />
          ) : (
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => handleDecrement(item)}
              >
                <Text style={styles.qtyButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => handleIncrement(item)}
              >
                <Text style={styles.qtyButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Card>
    );
  };

  if (!vendorData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Vendor not found</Text>
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          />
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
          <Ionicons name="arrow-back" size={24} color="#64748b" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>{vendorData.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="star" size={14} color="#fbbf24" style={{ marginRight: 4 }} />
            <Text style={styles.headerSubtitle}>{vendorData.rating} • {vendorData.time}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.cartButton}
          onPress={() => navigation.navigate('Cart')}
        >
          <Ionicons name="cart-outline" size={24} color="#64748b" />
          {getCartItemCount() > 0 && (
            <View style={styles.headerCartBadge}>
              <Text style={styles.headerCartBadgeText}>{getCartItemCount()}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Vendor Info */}
        <View style={styles.vendorInfo}>
          <Image source={{ uri: vendorData.image }} style={styles.vendorImage} />
          <View style={styles.vendorDetails}>
            <Text style={styles.vendorName}>{vendorData.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name="star" size={14} color="#fbbf24" style={{ marginRight: 4 }} />
              <Text style={styles.vendorMeta}>{vendorData.rating} • {vendorData.time} • {vendorData.distance}</Text>
            </View>
            <Text style={styles.vendorOffers}>{vendorData.offers}</Text>
            <Text style={styles.vendorPrice}>{vendorData.price}</Text>
            <Text style={styles.vendorDescription}>{vendorData.description}</Text>
          </View>
        </View>

        {/* Branch Selector - shown only if vendor has multiple branches */}
        {vendorData.branches && vendorData.branches.length > 1 && (
          <View style={styles.branchSelector}>
            <Text style={styles.branchSelectorLabel}>Select Branch:</Text>
            <TouchableOpacity
              style={styles.branchDropdown}
              onPress={() => setShowBranchPicker(true)}
            >
              <Ionicons name="location" size={16} color="#22c55e" />
              <Text style={styles.branchDropdownText} numberOfLines={1}>
                {selectedBranch?.branchName || 'Select a branch'}
              </Text>
              <Text style={styles.branchDistance}>
                {selectedBranch?.distance ? `${selectedBranch.distance} ${selectedBranch.distanceUnit}` : ''}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
        )}

        {/* Closed Branch Banner */}
        {(selectedBranch?.isOpen === false || vendorData?._original?.isOpen === false) && (
          <View style={styles.closedBanner}>
            <Ionicons name="time-outline" size={20} color="#ef4444" />
            <View style={styles.closedBannerContent}>
              <Text style={styles.closedBannerTitle}>Branch Currently Closed</Text>
              <Text style={styles.closedBannerText}>
                {vendorData?.branches?.length > 1
                  ? 'Please select another branch to place an order'
                  : 'This restaurant is currently not accepting orders'}
              </Text>
            </View>
          </View>
        )}

        {/* Menu Categories */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Menu</Text>

          {menu.length === 0 ? (
            <View style={styles.emptyMenu}>
              <Text style={styles.emptyText}>No menu items available</Text>
            </View>
          ) : (
            menu.map(renderMenuItem)
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Floating Cart Bar */}
      {getCartItemCount() > 0 && (
        <TouchableOpacity
          style={styles.floatingCartBar}
          onPress={() => navigation.navigate('Cart')}
          activeOpacity={0.9}
        >
          <View style={styles.cartBarLeft}>
            <View style={styles.cartBarBadge}>
              <Text style={styles.cartBarBadgeText}>{getCartItemCount()}</Text>
            </View>
            <Text style={styles.cartBarItemText}>
              {getCartItemCount()} item{getCartItemCount() > 1 ? 's' : ''} added
            </Text>
          </View>
          <View style={styles.cartBarRight}>
            <Text style={styles.cartBarTotal}>₹{getCartTotal()}</Text>
            <Text style={styles.cartBarAction}>View Cart</Text>
            <Ionicons name="arrow-forward" size={16} color="#ffffff" />
          </View>
        </TouchableOpacity>
      )}

      {/* Replace Cart Modal */}
      <Modal
        visible={showReplaceModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReplaceModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.replaceModal}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowReplaceModal(false);
                setPendingItem(null);
              }}
            >
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>

            <Text style={styles.modalTitle}>Replace cart item?</Text>
            <Text style={styles.modalDescription}>
              Your cart contains dishes from {existingRestaurantName}. Do you want to discard the selection and add dishes from {vendorData?.name}?
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonNo}
                onPress={() => {
                  setShowReplaceModal(false);
                  setPendingItem(null);
                }}
              >
                <Text style={styles.modalButtonNoText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonReplace}
                onPress={handleReplaceCart}
              >
                <Text style={styles.modalButtonReplaceText}>Replace</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Branch Picker Modal */}
      <Modal
        visible={showBranchPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBranchPicker(false)}
      >
        <View style={styles.branchModalOverlay}>
          <View style={styles.branchModalContent}>
            <View style={styles.branchModalHeader}>
              <Text style={styles.branchModalTitle}>Select Branch</Text>
              <TouchableOpacity onPress={() => setShowBranchPicker(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.branchList}>
              {(vendorData?.branches || []).map((branch, index) => (
                <TouchableOpacity
                  key={branch.branchId || index}
                  style={[
                    styles.branchItem,
                    selectedBranch?.branchId === branch.branchId && styles.branchItemSelected,
                  ]}
                  onPress={() => handleBranchChange(branch)}
                >
                  <View style={styles.branchItemLeft}>
                    <Ionicons
                      name="location"
                      size={20}
                      color={selectedBranch?.branchId === branch.branchId ? '#22c55e' : '#64748b'}
                    />
                  </View>
                  <View style={styles.branchItemContent}>
                    <Text style={styles.branchItemName}>{branch.branchName || 'Unknown Branch'}</Text>
                    <View style={styles.branchItemMeta}>
                      {branch.distance != null && (
                        <Text style={styles.branchItemDistance}>
                          {branch.distance} {branch.distanceUnit || 'km'}
                        </Text>
                      )}
                      {branch.deliveryTime != null && branch.deliveryTime !== '' && (
                        <Text style={styles.branchItemTime}>{`• ${branch.deliveryTime}`}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.branchItemRight}>
                    {branch.isOpen !== false ? (
                      <View style={styles.openBadge}>
                        <Text style={styles.openBadgeText}>Open</Text>
                      </View>
                    ) : (
                      <View style={styles.closedBadge}>
                        <Text style={styles.closedBadgeText}>Closed</Text>
                      </View>
                    )}
                    {selectedBranch?.branchId === branch.branchId && (
                      <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 18,
    color: '#64748b',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#22c55e',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    zIndex: 1,
  },
  headerCartBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cartIcon: {
    fontSize: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  vendorInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    flexDirection: 'row',
  },
  vendorImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  vendorDetails: {
    flex: 1,
    marginLeft: 12,
  },
  vendorName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  vendorMeta: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  vendorOffers: {
    fontSize: 12,
    backgroundColor: '#dcfce7',
    color: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
    fontWeight: '600',
  },
  vendorPrice: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  vendorDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  menuSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  menuItem: {
    marginBottom: 12,
    padding: 16,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
    padding: 0,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 16,
  },
  emptyMenu: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
  },
  bottomPadding: {
    height: 100, // Increased to account for floating cart bar
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  qtyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  qtyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    minWidth: 20,
    textAlign: 'center',
  },
  // Floating Cart Bar Styles
  floatingCartBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#22c55e',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartBarBadge: {
    backgroundColor: '#ffffff',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBarBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  cartBarItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
  cartBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cartBarTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  cartBarAction: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    marginLeft: 4,
  },
  // Replace Cart Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  replaceModal: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
    paddingRight: 32,
  },
  modalDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 21,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonNo: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalButtonNoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
  },
  modalButtonReplace: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#22c55e',
    alignItems: 'center',
  },
  modalButtonReplaceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Branch Selector Styles
  branchSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  branchSelectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
  },
  branchDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  branchDropdownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#1e293b',
  },
  branchDistance: {
    fontSize: 12,
    color: '#64748b',
  },
  // Branch Modal Styles
  branchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  branchModalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 24,
  },
  branchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  branchModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  branchList: {
    paddingHorizontal: 16,
  },
  branchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginVertical: 4,
  },
  branchItemSelected: {
    backgroundColor: '#dcfce7',
  },
  branchItemLeft: {
    marginRight: 12,
  },
  branchItemContent: {
    flex: 1,
  },
  branchItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  branchItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  branchItemDistance: {
    fontSize: 12,
    color: '#64748b',
  },
  branchItemTime: {
    fontSize: 12,
    color: '#64748b',
    marginLeft: 4,
  },
  branchItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  openBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  openBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#22c55e',
  },
  closedBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  closedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ef4444',
  },
  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  closedBannerContent: {
    flex: 1,
    marginLeft: 12,
  },
  closedBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 2,
  },
  closedBannerText: {
    fontSize: 12,
    color: '#b91c1c',
  },
});

export default VendorScreen;