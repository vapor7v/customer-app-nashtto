import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../services/api';

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const response = await api.getUserProfile();
      if (response.success) {
        setUser(response.user);
        setNotifications(response.user.preferences.notifications);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const updateNotificationPreference = async (value) => {
    setNotifications(value);
    try {
      const response = await api.updateUserProfile({
        preferences: { ...user.preferences, notifications: value }
      });
      if (response.success) {
        setUser(response.user);
      }
    } catch (error) {
      setNotifications(!value);
      Alert.alert('Error', 'Failed to update notification preferences');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => navigation.reset({
            index: 0,
            routes: [{ name: 'Auth' }],
          }),
        },
      ]
    );
  };

  const menuItems = [
    {
      id: 'orders',
      title: 'My Orders',
      subtitle: 'View order history',
      icon: 'receipt-outline',
      color: '#3b82f6',
      onPress: () => navigation.navigate('Orders'),
    },
    {
      id: 'addresses',
      title: 'Saved Addresses',
      subtitle: 'Manage delivery locations',
      icon: 'location-outline',
      color: '#ef4444',
      onPress: () => Alert.alert('Coming Soon', 'Addresses feature is coming soon!'),
    },
    {
      id: 'wallet',
      title: 'Wallet & Payments',
      subtitle: 'Payment methods & balance',
      icon: 'wallet-outline',
      color: '#22c55e',
      onPress: () => navigation.navigate('Wallet'),
    },
    {
      id: 'favorites',
      title: 'Favorite Restaurants',
      subtitle: 'Your saved places',
      icon: 'heart-outline',
      color: '#ec4899',
      onPress: () => Alert.alert('Coming Soon', 'Favorites feature is coming soon!'),
    },
  ];

  const supportItems = [
    {
      id: 'support',
      title: 'Help & Support',
      icon: 'headset-outline',
      onPress: () => navigation.navigate('Support'),
    },
    {
      id: 'about',
      title: 'About Nashtto',
      icon: 'information-circle-outline',
      onPress: () => Alert.alert('Nashtto v1.0', 'Pure vegetarian food delivery\n\nMade with ❤️ in India'),
    },
    {
      id: 'privacy',
      title: 'Privacy Policy',
      icon: 'shield-checkmark-outline',
      onPress: () => Alert.alert('Privacy Policy', 'Coming soon'),
    },
    {
      id: 'terms',
      title: 'Terms of Service',
      icon: 'document-text-outline',
      onPress: () => Alert.alert('Terms of Service', 'Coming soon'),
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={['#22c55e', '#1db954']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Profile Avatar & Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <TouchableOpacity style={styles.editAvatarBtn}>
              <Ionicons name="camera" size={14} color="#ffffff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user?.name || 'Loading...'}</Text>
          <Text style={styles.userPhone}>{user?.phone || '+91 XXXXXXXXXX'}</Text>
          <TouchableOpacity style={styles.editProfileBtn}>
            <Ionicons name="create-outline" size={16} color="#ffffff" />
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stats Cards */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <View style={[styles.statIconBg, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="bag-check" size={20} color="#f59e0b" />
            </View>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconBg, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="wallet" size={20} color="#22c55e" />
            </View>
            <Text style={styles.statNumber}>₹2,450</Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIconBg, { backgroundColor: '#fce7f3' }]}>
              <Ionicons name="heart" size={20} color="#ec4899" />
            </View>
            <Text style={styles.statNumber}>8</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.menuGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.menuCard}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.menuIconBg, { backgroundColor: item.color + '15' }]}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.preferencesCard}>
            <View style={styles.preferenceItem}>
              <View style={styles.preferenceLeft}>
                <View style={[styles.preferenceIcon, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="notifications" size={18} color="#f59e0b" />
                </View>
                <Text style={styles.preferenceTitle}>Push Notifications</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={updateNotificationPreference}
                trackColor={{ false: '#e2e8f0', true: '#bbf7d0' }}
                thumbColor={notifications ? '#22c55e' : '#94a3b8'}
              />
            </View>
            <View style={styles.preferenceDivider} />
            <TouchableOpacity style={styles.preferenceItem}>
              <View style={styles.preferenceLeft}>
                <View style={[styles.preferenceIcon, { backgroundColor: '#e0e7ff' }]}>
                  <Ionicons name="language" size={18} color="#6366f1" />
                </View>
                <Text style={styles.preferenceTitle}>Language</Text>
              </View>
              <View style={styles.preferenceRight}>
                <Text style={styles.preferenceValue}>English</Text>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </View>
            </TouchableOpacity>
            <View style={styles.preferenceDivider} />
            <TouchableOpacity style={styles.preferenceItem}>
              <View style={styles.preferenceLeft}>
                <View style={[styles.preferenceIcon, { backgroundColor: '#dcfce7' }]}>
                  <Ionicons name="cash" size={18} color="#22c55e" />
                </View>
                <Text style={styles.preferenceTitle}>Currency</Text>
              </View>
              <View style={styles.preferenceRight}>
                <Text style={styles.preferenceValue}>INR (₹)</Text>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Support & Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Info</Text>
          <View style={styles.supportCard}>
            {supportItems.map((item, index) => (
              <React.Fragment key={item.id}>
                <TouchableOpacity
                  style={styles.supportItem}
                  onPress={item.onPress}
                >
                  <View style={styles.supportLeft}>
                    <Ionicons name={item.icon} size={20} color="#64748b" />
                    <Text style={styles.supportTitle}>{item.title}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                </TouchableOpacity>
                {index < supportItems.length - 1 && <View style={styles.supportDivider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>Nashtto v1.0.0</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  editProfileText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 8,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    marginLeft: 4,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  menuIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  preferencesCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  preferenceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preferenceIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferenceTitle: {
    fontSize: 15,
    color: '#1e293b',
  },
  preferenceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  preferenceValue: {
    fontSize: 14,
    color: '#64748b',
  },
  preferenceDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 64,
  },
  supportCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  supportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  supportTitle: {
    fontSize: 15,
    color: '#1e293b',
  },
  supportDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginLeft: 50,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ef4444',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 16,
  },
});

export default ProfileScreen;