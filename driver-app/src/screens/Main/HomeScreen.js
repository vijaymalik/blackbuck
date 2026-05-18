import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Switch, 
  ActivityIndicator, Alert, Platform, Animated, ScrollView, Modal 
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, SIZES } from '../../theme/theme';
import { MapPin, Power, Truck, User as UserIcon, Settings, Navigation, Bell, Clock } from 'lucide-react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import api from '../../api';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'background-location-task';

// Define background location task globally so it survives app kill
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const coords = locations[0]?.coords;
    if (coords) {
      console.log('Background location received:', coords.latitude, coords.longitude);
      try {
        // Send background telemetry to server
        await api.post('/driver/location', {
          latitude: coords.latitude,
          longitude: coords.longitude,
          speed: coords.speed || 0,
          heading: coords.heading || 0,
          accuracy: coords.accuracy || 0
        });
        console.log('Background telemetry synced successfully!');
      } catch (err) {
        console.log('Background telemetry sync failed:', err.message);
      }
    }
  }
});

const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return '0.0';
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  return d.toFixed(1); // Return 1 decimal place
};

const HomeScreen = ({ navigation }) => {
  const { userData, setUserData, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(!!userData?.is_online);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [pulseAnim] = useState(new Animated.Value(1));
  const [activeEnquiries, setActiveEnquiries] = useState([]);
  
  // Notification states
  const notifiedEnquiryIdsRef = useRef([]);
  const [inAppNotification, setInAppNotification] = useState(null);
  const [slideAnim] = useState(new Animated.Value(-200));
  const [acceptedNotification, setAcceptedNotification] = useState(null);
  const [acceptedSlideAnim] = useState(new Animated.Value(-200));

  // Bidding & Assignment states
  const notifiedBookedIdsRef = useRef([]);
  const isInitialBookedLoadRef = useRef(true);
  const [submittedBidIds, setSubmittedBidIds] = useState([]);
  const [bookedLoadsModalVisible, setBookedLoadsModalVisible] = useState(false);
  const [bookedLoads, setBookedLoads] = useState([]);

  // Request native system notification permissions, fetch token, and register to backend
  useEffect(() => {
    async function requestPermissionsAndRegisterToken() {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.log('Notification permissions not granted');
          return;
        }

        // Fetch the Expo push token
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const token = tokenData.data;
        console.log('Registered Expo Push Token:', token);

        // Upload token and device type to the backend
        await api.post('/driver/save-fcm-token', {
          fcm_token: token,
          device_type: Platform.OS
        });
        console.log('Successfully saved push token and device type to server');
      } catch (err) {
        console.log('Push notification registration failed:', err);
      }
    }

    requestPermissionsAndRegisterToken();

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldVibrate: true,
      }),
    });

    // Populate initial booked loads quietly
    fetchBookedLoads(true);
  }, [userData]);

  const triggerNativeNotification = async (enq) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📦 New Load Enquiry Alert! 📢',
          body: `From: ${enq.pickup_location.split(',')[0]} ➔ To: ${enq.dropoff_location.split(',')[0]}\nLandmark: ${enq.pickup_instruction || 'N/A'}\nTap to open Blackbuck and bid!`,
          sound: true,
          data: { enquiryId: enq.id },
        },
        trigger: null,
      });
    } catch (err) {
      console.log('Failed to trigger native notification', err);
    }
  };

  const triggerAcceptedNotification = async (load) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎉 Congratulations! Bid Accepted! 🏆',
          body: `Admin assigned: ${load.pickup_location.split(',')[0]} ➔ ${load.dropoff_location.split(',')[0]}.\nTap to open Booked Loads and start transit!`,
          sound: true,
          data: { enquiryId: load.id },
        },
        trigger: null,
      });
    } catch (err) {
      console.log('Failed to trigger accepted notification', err);
    }
  };

  const triggerAcceptedInAppNotification = (load) => {
    // 1. Play premium congratulations sound on Web
    if (Platform.OS === 'web') {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2018/2018-200.wav'); // Gorgeous high-pitched congratulations chime!
      audio.play().catch(e => console.log('Audio play failed', e));
    }

    setAcceptedNotification(load);
    
    // Slide down to top safe area
    Animated.timing(acceptedSlideAnim, {
      toValue: 20,
      duration: 500,
      useNativeDriver: true
    }).start();

    // Auto-retract banner after 8 seconds
    setTimeout(() => {
      Animated.timing(acceptedSlideAnim, {
        toValue: -250,
        duration: 500,
        useNativeDriver: true
      }).start(() => {
        setAcceptedNotification(null);
      });
    }, 8000);
  };

  const triggerInAppNotification = (enq) => {
    setInAppNotification(enq);
    
    // Slide down to top safe area
    Animated.timing(slideAnim, {
      toValue: 20,
      duration: 500,
      useNativeDriver: true
    }).start();

    // Auto-retract banner after 6 seconds
    setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -250,
        duration: 500,
        useNativeDriver: true
      }).start(() => {
        setInAppNotification(null);
      });
    }, 6000);
  };

  const updateEnquiriesAndNotify = (newEnquiries) => {
    if (!newEnquiries || newEnquiries.length === 0) {
      setActiveEnquiries([]);
      return;
    }

    // Sync local bid submission state with database state:
    // If database shows a bid is no longer pending, allow the driver to bid fresh!
    setSubmittedBidIds(prevIds => {
      const updatedIds = prevIds.filter(id => {
        const enq = newEnquiries.find(e => e.id === id);
        if (enq && !enq.has_pending_bid) {
          return false;
        }
        return true;
      });
      return updatedIds;
    });

    // Filter out previously notified load items using the Ref
    const newItems = newEnquiries.filter(e => !notifiedEnquiryIdsRef.current.includes(e.id));
    
    if (newItems.length > 0) {
      const latestEnq = newItems[0];
      
      // Trigger dynamic alerts
      triggerInAppNotification(latestEnq);
      triggerNativeNotification(latestEnq);
      
      // Add to record list in the Ref to block repeats instantly
      notifiedEnquiryIdsRef.current = [...notifiedEnquiryIdsRef.current, ...newItems.map(e => e.id)];
    }

    setActiveEnquiries(newEnquiries);
  };

  const fetchBookedLoads = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const response = await api.get('/driver/enquiries/accepted');
      const data = response.data?.data || response.data || [];
      
      // Notify driver of any newly accepted loads in real-time
      const newAcceptedLoads = data.filter(load => !notifiedBookedIdsRef.current.includes(load.id));
      if (newAcceptedLoads.length > 0) {
        // Only trigger Alert.alert if this is not the first app loading/initialization
        if (!isInitialBookedLoadRef.current) {
          newAcceptedLoads.forEach(load => {
            // 1. Native background notification
            triggerAcceptedNotification(load);
            
            // 2. Premium custom in-app sliding congratulations banner with sound
            triggerAcceptedInAppNotification(load);
          });
        }
        notifiedBookedIdsRef.current = [...notifiedBookedIdsRef.current, ...newAcceptedLoads.map(e => e.id)];
      }
      isInitialBookedLoadRef.current = false;

      // Clean up references if any load is cancelled/reopened by the admin
      const activeBookedIds = data.map(load => load.id);
      notifiedBookedIdsRef.current.forEach(id => {
        if (!activeBookedIds.includes(id)) {
          notifiedEnquiryIdsRef.current = notifiedEnquiryIdsRef.current.filter(eid => eid !== id);
        }
      });
      notifiedBookedIdsRef.current = notifiedBookedIdsRef.current.filter(id => activeBookedIds.includes(id));
      
      setBookedLoads(data);
    } catch (err) {
      console.log('Failed to fetch booked loads', err);
      if (!quiet) Alert.alert('Error', 'Failed to retrieve booked loads.');
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  const handleUpdateLoadStatus = async (enquiryId, newStatus) => {
    try {
      setLoading(true);
      const res = await api.post(`/driver/enquiries/${enquiryId}/responses/status`, {
        status: newStatus
      });
      if (res.data && res.data.success) {
        Alert.alert(
          'Success', 
          newStatus === 'dispatched' 
            ? '📦 Load Dispatched! Drive safely and navigate to the dropoff location.'
            : '🏁 Load Delivered! Great job on successfully completing the consignment.'
        );
        fetchBookedLoads(true);
      }
    } catch (err) {
      console.log('Failed to update response status', err);
      Alert.alert('Error', 'Failed to update load status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptLoad = async (enq) => {
    try {
      setLoading(true);
      await api.post(`/driver/enquiries/${enq.id}/respond`);
      setSubmittedBidIds([...submittedBidIds, enq.id]);
      Alert.alert(
        'Bid Submitted Successfully! 🎉',
        `Your bid has been successfully submitted to the admin for review.\n\nLandmark: ${enq.pickup_instruction || 'N/A'}`
      );
    } catch (err) {
      console.log('Bid response failed', err);
      Alert.alert('Error', 'Failed to submit bid response.');
    } finally {
      setLoading(false);
    }
  };

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

  // LIVE TELEMETRY UPDATE LOOP WHEN ONLINE (Polls real GPS coords, speed, heading every 10s)
  useEffect(() => {
    let intervalId;

    const startBackgroundTracking = async () => {
      try {
        const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
        if (fgStatus === 'granted') {
          // Request background location permission (essential for background tracking)
          const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
          if (bgStatus === 'granted') {
            const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
            if (!hasStarted) {
              await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
                accuracy: Location.Accuracy.High,
                timeInterval: 10000,
                distanceInterval: 10,
                foregroundService: {
                  notificationTitle: "Blackbuck Location Service Active",
                  notificationBody: "Updating your location in the background for active loads.",
                  notificationColor: "#10b981",
                },
                pausesUpdatesAutomatically: false,
              });
              console.log('Background location tracking started!');
            }
          } else {
            console.log('Background location permission denied');
          }
        }
      } catch (err) {
        console.log('Error starting background tracking:', err);
      }
    };

    const stopBackgroundTracking = async () => {
      try {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
          console.log('Background location tracking stopped!');
        }
      } catch (err) {
        console.log('Error stopping background tracking:', err);
      }
    };

    if (isOnline) {
      startBackgroundTracking();

      intervalId = setInterval(async () => {
        try {
          let { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            let currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            const coords = currentLocation.coords;
            setLocation(coords);
            
            // Broadcast live telemetry (speed in m/s, heading, accuracy) to backend
            const response = await api.post('/driver/toggle-status', {
              is_online: true,
              latitude: coords.latitude,
              longitude: coords.longitude,
              speed: coords.speed || 0,
              heading: coords.heading || 0,
              accuracy: coords.accuracy || 0
            });
            if (response.data.success && response.data.data.enquiries) {
              updateEnquiriesAndNotify(response.data.data.enquiries);
            }
            // Sync booked loads quietly in real-time to detect bid acceptance notifications
            fetchBookedLoads(true);
            console.log('Telemetry updated dynamically:', coords.speed, coords.heading);
          }
        } catch (error) {
          console.log('Dynamic telemetry update failed', error);
        }
      }, 10000); // 10 seconds interval
    } else {
      stopBackgroundTracking();
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOnline]);

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
        longitude: coords.longitude,
        speed: coords.speed || 0,
        heading: coords.heading || 0,
        accuracy: coords.accuracy || 0
      });
      
      setIsOnline(response.data.data.is_online);
      setUserData({ ...userData, is_online: response.data.data.is_online });
      if (response.data.success && response.data.data.enquiries) {
        updateEnquiriesAndNotify(response.data.data.enquiries);
      } else {
        updateEnquiriesAndNotify([]);
      }
      
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
        // Simulate a realistic driving speed of 12.5 m/s (approx 45 km/h) and heading 90 degrees
        const response = await api.post('/driver/toggle-status', { 
          is_online: true,
          latitude: newCoords.latitude,
          longitude: newCoords.longitude,
          speed: 12.5,
          heading: 90,
          accuracy: 5
        });
        if (response.data.success && response.data.data.enquiries) {
          updateEnquiriesAndNotify(response.data.data.enquiries);
        }
      } catch (err) {
        console.log('Failed to update manual location', err);
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Floating In-App sliding notification banner */}
      {inAppNotification && (
        <Animated.View style={[
          styles.inAppNotificationContainer,
          { transform: [{ translateY: slideAnim }] }
        ]}>
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => Alert.alert('Load Details', `From: ${inAppNotification.pickup_location}\nTo: ${inAppNotification.dropoff_location}\nLandmark: ${inAppNotification.pickup_instruction || 'N/A'}`)}
            style={styles.inAppNotificationInner}
          >
            <View style={styles.notificationBellCircle}>
              <Bell size={24} color="#fff" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.notificationTitle}>📦 NEW LOAD ENQUIRY BROADCAST!</Text>
              <Text style={styles.notificationSubtitle} numberOfLines={1}>
                {inAppNotification.pickup_location.split(',')[0]} ➔ {inAppNotification.dropoff_location.split(',')[0]}
              </Text>
              {inAppNotification.pickup_instruction ? (
                <Text style={styles.notificationLandmark} numberOfLines={1}>
                  📍 Landmark: {inAppNotification.pickup_instruction}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Bid Accepted Congratulatory sliding notification banner */}
      {acceptedNotification && (
        <Animated.View style={[
          styles.inAppNotificationContainer,
          { transform: [{ translateY: acceptedSlideAnim }] }
        ]}>
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={() => {
              setBookedLoadsModalVisible(true);
              setAcceptedNotification(null);
            }}
            style={[
              styles.inAppNotificationInner,
              { borderColor: '#10b981', shadowColor: '#10b981', backgroundColor: '#0f172a' }
            ]}
          >
            <View style={[styles.notificationBellCircle, { backgroundColor: '#10b981' }]}>
              <Text style={{ fontSize: 24 }}>🎉</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.notificationTitle, { color: '#10b981' }]}>🏆 CONGRATULATIONS! BID ACCEPTED!</Text>
              <Text style={styles.notificationSubtitle} numberOfLines={1}>
                {acceptedNotification.pickup_location.split(',')[0]} ➔ {acceptedNotification.dropoff_location.split(',')[0]}
              </Text>
              <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                Tap to open Booked Loads & start transit!
              </Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

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
          <Text style={styles.infoValue}>{userData?.driver_profile?.preferred_operating_area || 'Not Set'}</Text>
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

      {/* Dynamic Load Enquiries Section */}
      {isOnline && activeEnquiries.length > 0 && (
        <View style={{ marginBottom: SPACING.xl }}>
          <Text style={styles.sectionTitle}>📢 Nearby Load Enquiries ({activeEnquiries.length})</Text>
          {activeEnquiries.map((enq) => (
            <View 
              key={enq.id} 
              style={{
                backgroundColor: 'rgba(30, 41, 59, 0.45)',
                borderRadius: SIZES.radius + 4,
                padding: SPACING.lg,
                borderWidth: 1.5,
                borderColor: 'rgba(59, 130, 246, 0.25)',
                marginBottom: SPACING.md,
                shadowColor: '#3b82f6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 6,
                elevation: 3
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>Active Broadcast</Text>
                </View>
                <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 11, fontWeight: '700' }}>
                  📍 {parseFloat(enq.distance_km).toFixed(1)} km away
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6 }}>
                <MapPin size={18} color="#f43f5e" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' }}>Pickup From</Text>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{enq.pickup_location}</Text>
                  {enq.pickup_instruction ? (
                    <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '700', marginTop: 3, fontStyle: 'italic' }}>
                      🔑 Landmark: {enq.pickup_instruction}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={{ width: 1.5, height: 12, backgroundColor: 'rgba(255, 255, 255, 0.2)', marginLeft: 8, marginVertical: 2 }} />

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6 }}>
                <Navigation size={18} color="#10b981" />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' }}>Dropoff To</Text>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{enq.dropoff_location}</Text>
                  {enq.dropoff_latitude && enq.dropoff_longitude ? (
                    <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '700', marginTop: 3 }}>
                      🛣️ Route Distance: {getHaversineDistance(parseFloat(enq.pickup_latitude), parseFloat(enq.pickup_longitude), parseFloat(enq.dropoff_latitude), parseFloat(enq.dropoff_longitude))} km
                    </Text>
                  ) : null}
                </View>
              </View>

              {submittedBidIds.includes(enq.id) || enq.has_pending_bid ? (
                <View 
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    padding: 12,
                    borderRadius: 10,
                    alignItems: 'center',
                    marginTop: 12,
                    borderWidth: 1.5,
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                  }}
                >
                  <Text style={{ color: '#60a5fa', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 }}>
                    ⏳ Awaiting Admin Decision...
                  </Text>
                </View>
              ) : (
                <TouchableOpacity 
                  onPress={() => handleAcceptLoad(enq)}
                  style={{
                    backgroundColor: COLORS.primary,
                    padding: 12,
                    borderRadius: 10,
                    alignItems: 'center',
                    marginTop: 12,
                    shadowColor: COLORS.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>Accept Load / Bid</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <TouchableOpacity 
          style={styles.actionItem} 
          onPress={() => {
            fetchBookedLoads();
            setBookedLoadsModalVisible(true);
          }}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#e0e7ff', borderColor: 'rgba(99, 102, 241, 0.2)' }]}>
            <Truck size={24} color="#4f46e5" />
          </View>
          <Text style={styles.actionLabel}>Booked Loads</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Profile')}>
          <View style={[styles.actionIcon, { backgroundColor: '#f5f3ff', borderColor: 'rgba(139, 92, 246, 0.2)' }]}>
            <Settings size={24} color="#7c3aed" />
          </View>
          <Text style={styles.actionLabel}>Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={logout}>
          <View style={[styles.actionIcon, { backgroundColor: '#fff1f2', borderColor: 'rgba(244, 63, 94, 0.2)' }]}>
            <Power size={24} color="#e11d48" />
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

      {/* Booked Loads Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={bookedLoadsModalVisible}
        onRequestClose={() => setBookedLoadsModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.85)', justifyContent: 'flex-end' }}>
          <View 
            style={{ 
              backgroundColor: '#1e293b', 
              borderTopLeftRadius: 24, 
              borderTopRightRadius: 24, 
              padding: SPACING.xl, 
              maxHeight: '85%',
              borderWidth: 1.5,
              borderColor: 'rgba(255, 255, 255, 0.08)',
              borderBottomWidth: 0,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg }}>
              <View>
                <Text style={{ color: COLORS.white, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 }}>
                  📦 Your Booked Loads
                </Text>
                <Text style={{ color: COLORS.textMuted, fontSize: 13, marginTop: 2, fontWeight: '600' }}>
                  Officially assigned by the admin
                </Text>
              </View>
              <TouchableOpacity 
                onPress={() => setBookedLoadsModalVisible(false)}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.08)',
                }}
              >
                <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 16, fontWeight: 'bold' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {loading ? (
                <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.xl }} />
              ) : bookedLoads.length === 0 ? (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 40 }}>
                  <Truck size={48} color="rgba(255, 255, 255, 0.15)" />
                  <Text style={{ color: COLORS.textMuted, fontSize: 15, fontWeight: '700', marginTop: 12 }}>
                    No assigned loads found
                  </Text>
                  <Text style={{ color: 'rgba(255, 255, 255, 0.35)', fontSize: 12, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
                    When the admin approves one of your bids, it will appear here in real-time!
                  </Text>
                </View>
              ) : (
                bookedLoads.map((enq) => {
                  const bidResponse = enq.responses?.[0];
                  const bidStatus = bidResponse?.status || 'accepted';

                  let statusText = '✓ BOOKING CONFIRMED';
                  let statusColor = COLORS.success;
                  let borderColor = 'rgba(16, 185, 129, 0.35)';

                  if (bidStatus === 'dispatched') {
                    statusText = '🚚 IN TRANSIT / DISPATCHED';
                    statusColor = '#eab308'; // Amber
                    borderColor = 'rgba(234, 179, 8, 0.45)';
                  } else if (bidStatus === 'completed') {
                    statusText = '🏁 COMPLETED & DELIVERED';
                    statusColor = '#10b981'; // Emerald
                    borderColor = 'rgba(16, 185, 129, 0.6)';
                  }

                  return (
                    <View 
                      key={enq.id}
                      style={{
                        backgroundColor: 'rgba(30, 41, 59, 0.6)',
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1.5,
                        borderColor: borderColor,
                        marginBottom: 12,
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <View style={{ backgroundColor: `${statusColor}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: statusColor }}>
                          <Text style={{ color: statusColor, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 }}>
                            {statusText}
                          </Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 }}>
                        <MapPin size={16} color="#f43f5e" />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>Pickup Address</Text>
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{enq.pickup_location}</Text>
                          {enq.pickup_instruction ? (
                            <Text style={{ color: '#3b82f6', fontSize: 11, fontWeight: '700', marginTop: 2, fontStyle: 'italic' }}>
                              🔑 Landmark: {enq.pickup_instruction}
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View style={{ width: 1.5, height: 10, backgroundColor: 'rgba(255, 255, 255, 0.15)', marginLeft: 7, marginVertical: 1 }} />

                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 }}>
                        <Navigation size={16} color="#10b981" />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 9, fontWeight: '700', textTransform: 'uppercase' }}>Dropoff Address</Text>
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{enq.dropoff_location}</Text>
                          {enq.dropoff_latitude && enq.dropoff_longitude ? (
                            <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                              🛣️ Route Distance: {getHaversineDistance(parseFloat(enq.pickup_latitude), parseFloat(enq.pickup_longitude), parseFloat(enq.dropoff_latitude), parseFloat(enq.dropoff_longitude))} km
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      {/* Action buttons inside Booked Loads Drawer */}
                      {bidStatus === 'accepted' ? (
                        <TouchableOpacity
                          onPress={() => handleUpdateLoadStatus(enq.id, 'dispatched')}
                          style={{
                            backgroundColor: '#eab308',
                            padding: 12,
                            borderRadius: 10,
                            alignItems: 'center',
                            marginTop: 12,
                          }}
                        >
                          <Text style={{ color: '#0f172a', fontSize: 13, fontWeight: '800' }}>
                            📦 Pick Up Load / Start Transit
                          </Text>
                        </TouchableOpacity>
                      ) : bidStatus === 'dispatched' ? (
                        <TouchableOpacity
                          onPress={() => handleUpdateLoadStatus(enq.id, 'completed')}
                          style={{
                            backgroundColor: '#10b981',
                            padding: 12,
                            borderRadius: 10,
                            alignItems: 'center',
                            marginTop: 12,
                          }}
                        >
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
                            🏁 Confirm Safe Delivery / Complete
                          </Text>
                        </TouchableOpacity>
                      ) : (
                        <View
                          style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            padding: 12,
                            borderRadius: 10,
                            alignItems: 'center',
                            marginTop: 12,
                            borderWidth: 1,
                            borderColor: 'rgba(16, 185, 129, 0.3)',
                          }}
                        >
                          <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '800' }}>
                            ✓ Consignment Safely Delivered 🏁
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </ScrollView>
            
            <TouchableOpacity 
              onPress={() => setBookedLoadsModalVisible(false)}
              style={{
                backgroundColor: COLORS.primary,
                padding: 14,
                borderRadius: 12,
                alignItems: 'center',
                marginTop: SPACING.md,
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6
              }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>Close View</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: SPACING.lg, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  greeting: { color: COLORS.textMuted, fontSize: 14, fontWeight: '500' },
  name: { color: COLORS.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  iconBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(30, 41, 59, 0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  profileBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(30, 41, 59, 0.4)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6 },
  
  statusCard: { 
    borderRadius: SIZES.radius * 2, padding: SPACING.xl, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.xl, elevation: 12, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20
  },
  cardOffline: { 
    backgroundColor: 'rgba(30, 41, 59, 0.35)', 
    borderLeftWidth: 5, borderLeftColor: COLORS.danger, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)',
    shadowColor: COLORS.danger, shadowOpacity: 0.1, shadowRadius: 10
  },
  cardOnline: { 
    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
    borderLeftWidth: 5, borderLeftColor: COLORS.success,
    borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.15)',
    shadowColor: COLORS.success, shadowOpacity: 0.3, shadowRadius: 20
  },
  
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  
  statusInfo: { flex: 1 },
  statusValue: { color: COLORS.white, fontSize: 38, fontWeight: '950', marginVertical: 4, letterSpacing: -0.5 },
  statusDetail: { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 18 },
  
  powerBtn: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', elevation: 8 },
  powerBtnOff: { 
    backgroundColor: COLORS.danger, 
    borderWidth: 3, borderColor: '#fca5a5',
    shadowColor: COLORS.danger, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 15 
  },
  powerBtnOn: { 
    backgroundColor: COLORS.success, 
    borderWidth: 3, borderColor: '#6ee7b7',
    shadowColor: COLORS.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 15
  },
  
  statsGrid: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  statCard: { 
    flex: 1, backgroundColor: 'rgba(30, 41, 59, 0.3)', padding: SPACING.lg, borderRadius: SIZES.radius + 4, 
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 8
  },
  statIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)' },
  statMain: { color: COLORS.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  statSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 4, fontWeight: '500' },

  infoCard: { 
    backgroundColor: 'rgba(30, 41, 59, 0.3)', padding: SPACING.lg, borderRadius: SIZES.radius + 4, 
    flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xl,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)',
    borderLeftWidth: 4, borderLeftColor: COLORS.primary,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 8
  },
  infoTitle: { color: COLORS.textMuted, fontSize: 13, fontWeight: '500' },
  infoValue: { color: COLORS.text, fontSize: 17, fontWeight: '800', marginTop: 2 },
  
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', marginBottom: SPACING.md, letterSpacing: -0.5 },
  actionsGrid: { flexDirection: 'row', gap: SPACING.md },
  actionItem: { 
    flex: 1, backgroundColor: 'rgba(30, 41, 59, 0.3)', padding: SPACING.md, borderRadius: SIZES.radius + 4, 
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' 
  },
  actionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  actionLabel: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  
  liveIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.success, marginRight: 8, shadowColor: COLORS.success, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 6 },
  liveText: { color: COLORS.success, fontSize: 13, fontWeight: '800', letterSpacing: 0.5 },
  
  mapContainer: { marginBottom: SPACING.xl },
  mapWrapper: { 
    height: 220, borderRadius: SIZES.radius + 6, overflow: 'hidden', 
    borderWidth: 1.5, borderColor: 'rgba(59, 130, 246, 0.25)', backgroundColor: 'rgba(15, 23, 42, 0.8)',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 8
  },
  map: { width: '100%', height: '100%' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  inAppNotificationContainer: {
    position: 'absolute',
    top: 0,
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 9999,
    elevation: 24,
  },
  inAppNotificationInner: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  notificationBellCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  notificationTitle: {
    color: '#3b82f6',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  notificationSubtitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  notificationLandmark: {
    color: '#93c5fd',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    fontStyle: 'italic',
  }
});

export default HomeScreen;
