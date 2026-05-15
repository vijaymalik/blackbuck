import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, SIZES } from '../../theme/theme';
import { User, Mail, Phone, Truck, ChevronLeft, Save, MapPin } from 'lucide-react-native';
import api from '../../api';

const ProfileScreen = ({ navigation }) => {
  const { userData, setUserData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: userData?.name || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    truck_type: userData?.driver_profile?.truck_type || '',
    truck_number: userData?.driver_profile?.truck_number || '',
    truck_capacity: userData?.driver_profile?.truck_capacity?.toString() || '',
    preferred_area: userData?.driver_profile?.preferred_area || '',
  });

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const response = await api.put('/driver/profile', formData);
      if (response.data.success) {
        setUserData(response.data.data.driver); // Update global state
        Alert.alert('Success', 'Profile updated successfully');
      }
    } catch (error) {
      console.error('Update Profile Error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label, icon, value, key, keyboardType = 'default') => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        {icon}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={(text) => setFormData({ ...formData, [key]: text })}
          placeholder={`Enter ${label}`}
          placeholderTextColor={COLORS.textMuted}
          keyboardType={keyboardType}
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 28 }} /> 
      </View>

      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userData?.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.driverId}>Driver ID: #{userData?.id}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          {renderInput('Full Name', <User size={20} color={COLORS.primary} />, formData.name, 'name')}
          {renderInput('Email Address', <Mail size={20} color={COLORS.primary} />, formData.email, 'email', 'email-address')}
          {renderInput('Phone Number', <Phone size={20} color={COLORS.primary} />, formData.phone, 'phone', 'phone-pad')}

          <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Vehicle Information</Text>
          {renderInput('Truck Type', <Truck size={20} color={COLORS.primary} />, formData.truck_type, 'truck_type')}
          {renderInput('Plate Number', <Truck size={20} color={COLORS.primary} />, formData.truck_number, 'truck_number')}
          {renderInput('Capacity (Tons)', <Truck size={20} color={COLORS.primary} />, formData.truck_capacity, 'truck_capacity', 'numeric')}
          {renderInput('Preferred Area', <MapPin size={20} color={COLORS.primary} />, formData.preferred_area, 'preferred_area')}

          <TouchableOpacity 
            style={[styles.saveBtn, loading && styles.saveBtnDisabled]} 
            onPress={handleUpdate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Save size={20} color={COLORS.white} style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    paddingTop: 60, paddingHorizontal: SPACING.lg, paddingBottom: 20,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border
  },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  
  scrollContent: { 
    flexGrow: 1,
    paddingBottom: 40,
    minHeight: Platform.OS === 'web' ? '100vh' : 'auto'
  },
  avatarSection: { alignItems: 'center', paddingVertical: SPACING.xl, backgroundColor: COLORS.surface },
  avatar: { 
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, 
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8
  },
  avatarText: { color: COLORS.white, fontSize: 32, fontWeight: '800' },
  driverId: { color: COLORS.textMuted, fontSize: 14 },

  form: { padding: SPACING.lg },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700', marginBottom: SPACING.md },
  inputGroup: { marginBottom: SPACING.md },
  label: { color: COLORS.textMuted, fontSize: 14, marginBottom: 8, fontWeight: '500' },
  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, 
    borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, height: 56
  },
  input: { flex: 1, color: COLORS.text, fontSize: 16, marginLeft: 12 },
  
  saveBtn: { 
    backgroundColor: COLORS.primary, height: 56, borderRadius: SIZES.radius, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.xl,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: COLORS.white, fontSize: 17, fontWeight: '700' }
});

export default ProfileScreen;
