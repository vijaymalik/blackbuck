import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Switch, 
  ActivityIndicator, Alert, Platform, Animated, ScrollView 
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, SIZES } from '../../theme/theme';
import { MapPin, Power, Truck, User as UserIcon, Settings, Navigation, Bell, Clock } from 'lucide-react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import api from '../../api';

const HomeScreen = ({ navigation }) => {
  const { userData, setUserData, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(!!userData?.is_online);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [pulseAnim] = useState(new Animated.Value(1));

  // Sync state if userData changes
  useEffect(() => {
    setIsOnline(!!userData?.is_online);
  }, [userData?.is_online]);

  // Pulse animation for "Online" status
  useEffect(() => {
    if (isOnline) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnline]);

  // AUTO-FETCH LOCATION ON LOAD
  useEffect(() => {
    const getInitialLocation = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setLocation(currentLocation.coords);
          console.log('Initial location fetched automatically');
        }
      } catch (e) {
        console.log('Failed to fetch initial location', e);
      }
    };
    getInitialLocation();
  }, []);

  const toggleStatus = async () => {
    setLoading(true);
    try {
      const nextStatus = !isOnline;
      
      // Request location if going online (if not already fetched)
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access to go online.');
        setLoading(false);
        return;
      }
      
      let coords = location;
      
      // If we don't have a location yet, get one quickly
      if (!coords) {
        let currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        coords = currentLocation.coords;
        setLocation(coords);
      }
      
      
      // Update backend with status and location
      const response = await api.post('/driver/toggle-status', { 
        is_online: nextStatus,
        latitude: coords.latitude,
        longitude: coords.longitude
      });
      
      setIsOnline(response.data.data.is_online);
      setUserData({ ...userData, is_online: response.data.data.is_online });
      
    } catch (error) {
      console.error('Status Toggle Error:', error);
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleMapPress = async (e) => {
    // Only allow manual location changes for testing/debug
    const newCoords = e.nativeEvent.coordinate;
    setLocation(newCoords);
    
    if (isOnline) {
      try {
        await api.post('/driver/toggle-status', { 
          is_online: true,
          latitude: newCoords.latitude,
          longitude: newCoords.longitude
        });
      } catch (err) {
        console.log('Failed to update manual location', err);
      }
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{userData?.name}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Bell size={22} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
            <UserIcon size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Status Card */}
      <View style={[styles.statusCard, isOnline ? styles.cardOnline : styles.cardOffline]}>
        <View style={styles.statusInfo}>
          <View style={styles.badge}>
            <Clock size={12} color={isOnline ? '#fff' : COLORS.textMuted} />
            <Text style={[styles.badgeText, { color: isOnline ? '#fff' : COLORS.textMuted }]}>
              {isOnline ? 'Shift Active' : 'Shift Inactive'}
            </Text>
          </View>
          <Text style={styles.statusValue}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
          <Text style={styles.statusDetail}>
            {isOnline ? 'Dispatchers can see you now' : 'Switch ON to start receiving trips'}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[styles.powerBtn, isOnline ? styles.powerBtnOn : styles.powerBtnOff]} 
          onPress={toggleStatus}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Power size={36} color={COLORS.white} />
            </Animated.View>
          )}
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#f0f9ff' }]}>
            <Truck size={20} color="#0369a1" />
          </View>
          <Text style={styles.statMain}>{userData?.driver_profile?.truck_number || '---'}</Text>
          <Text style={styles.statSub}>Vehicle Number</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#f0fdf4' }]}>
            <Navigation size={20} color="#15803d" />
          </View>
          <Text style={styles.statMain}>{userData?.driver_profile?.truck_capacity || '0'} Tons</Text>
          <Text style={styles.statSub}>Capacity</Text>
        </View>
      </View>

      {/* Area Info */}
      <View style={styles.infoCard}>
        <MapPin size={20} color={COLORS.primary} />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.infoTitle}>Preferred Area</Text>
          <Text style={styles.infoValue}>{userData?.driver_profile?.preferred_area || 'Not Set'}</Text>
        </View>
      </View>

      {/* Live Map */}
      <View style={styles.mapContainer}>
        <Text style={styles.sectionTitle}>Live Location</Text>
        <View style={styles.mapWrapper}>
          {location ? (
            <MapView
              style={styles.map}
              onLongPress={handleMapPress}
              onPress={Platform.OS === 'web' ? handleMapPress : undefined}
              initialRegion={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              region={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title="Your Location"
              />
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={{ marginTop: 8, color: COLORS.textMuted }}>Locating...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity style={styles.actionItem}>
          <View style={[styles.actionIcon, { backgroundColor: '#fff7ed' }]}>
            <Clock size={24} color="#9a3412" />
          </View>
          <Text style={styles.actionLabel}>History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Profile')}>
          <View style={[styles.actionIcon, { backgroundColor: '#f5f3ff' }]}>
            <Settings size={24} color="#5b21b6" />
          </View>
          <Text style={styles.actionLabel}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={logout}>
          <View style={[styles.actionIcon, { backgroundColor: '#fff1f2' }]}>
            <Power size={24} color="#9f1239" />
          </View>
          <Text style={styles.actionLabel}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Live Indicator */}
      {isOnline && (
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>GPS Tracking Active</Text>
        </View>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greeting: { color: COLORS.textMuted, fontSize: 16 },
  name: { color: COLORS.text, fontSize: 24, fontWeight: '800' },
  iconBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  profileBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border },
  
  statusCard: { 
    borderRadius: SIZES.radius * 2, padding: SPACING.xl, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.xl, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20
  },
  cardOffline: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  cardOnline: { backgroundColor: '#0f172a' }, // Very dark navy
  
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  
  statusInfo: { flex: 1 },
  statusValue: { color: COLORS.white, fontSize: 36, fontWeight: '900', marginVertical: 4 },
  statusDetail: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 18 },
  
  powerBtn: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  powerBtnOff: { backgroundColor: COLORS.danger },
  powerBtnOn: { backgroundColor: COLORS.success },
  
  statsGrid: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  statCard: { flex: 1, backgroundColor: COLORS.surface, padding: SPACING.lg, borderRadius: SIZES.radius, borderWeight: 1, borderColor: COLORS.border },
  statIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statMain: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  statSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },

  infoCard: { 
    backgroundColor: COLORS.surface, padding: SPACING.lg, borderRadius: SIZES.radius, 
    flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xl,
    borderWidth: 1, borderColor: COLORS.border
  },
  infoTitle: { color: COLORS.textMuted, fontSize: 13 },
  infoValue: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: SPACING.md },
  actionsGrid: { flexDirection: 'row', gap: SPACING.md },
  actionItem: { flex: 1, backgroundColor: COLORS.surface, padding: SPACING.md, borderRadius: SIZES.radius, alignItems: 'center' },
  actionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  
  liveIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success, marginRight: 8 },
  liveText: { color: COLORS.success, fontSize: 13, fontWeight: '700' },
  
  mapContainer: { marginBottom: SPACING.xl },
  mapWrapper: { height: 200, borderRadius: SIZES.radius, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  map: { width: '100%', height: '100%' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' }
});

export default HomeScreen;
