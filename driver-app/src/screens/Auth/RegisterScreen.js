import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, 
  Platform, Dimensions 
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, SIZES } from '../../theme/theme';
import { User, Mail, Phone, Lock, Truck, ChevronLeft, ChevronRight, MapPin } from 'lucide-react-native';

const { height } = Dimensions.get('window');

const RegisterScreen = ({ navigation }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    truck_type: '',
    truck_number: '',
    truck_capacity: '',
    preferred_area: '',
  });

  const handleRegister = async () => {
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.phone || !formData.password) {
        Alert.alert('Error', 'Please fill all fields');
        return;
      }
      setStep(2);
      return;
    }

    if (!formData.truck_type || !formData.truck_number || !formData.truck_capacity || !formData.preferred_area) {
      Alert.alert('Error', 'Please fill all vehicle details');
      return;
    }

    setLoading(true);
    const result = await register(formData);
    setLoading(false);

    if (!result.success) {
      Alert.alert('Registration Failed', result.message);
    }
  };

  const renderInput = (label, icon, value, key, keyboardType = 'default', secure = false) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputContainer}>
        {icon}
        <TextInput
          style={styles.input}
          placeholder={`Enter ${label.toLowerCase()}`}
          placeholderTextColor={COLORS.textMuted}
          value={value}
          onChangeText={(text) => setFormData({ ...formData, [key]: text })}
          keyboardType={keyboardType}
          secureTextEntry={secure}
          autoCapitalize="none"
        />
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => step === 1 ? navigation.goBack() : setStep(1)} style={styles.backBtn}>
            <ChevronLeft size={28} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: step === 1 ? '50%' : '100%' }]} />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Step {step} of 2</Text>
        </View>

        <View style={styles.form}>
          {step === 1 ? (
            <>
              {renderInput('Full Name', <User size={20} color={COLORS.primary} />, formData.name, 'name')}
              {renderInput('Email Address', <Mail size={20} color={COLORS.primary} />, formData.email, 'email', 'email-address')}
              {renderInput('Phone Number', <Phone size={20} color={COLORS.primary} />, formData.phone, 'phone', 'phone-pad')}
              {renderInput('Password', <Lock size={20} color={COLORS.primary} />, formData.password, 'password', 'default', true)}
            </>
          ) : (
            <>
              {renderInput('Truck Type', <Truck size={20} color={COLORS.primary} />, formData.truck_type, 'truck_type')}
              {renderInput('Truck Number', <Truck size={20} color={COLORS.primary} />, formData.truck_number, 'truck_number')}
              {renderInput('Capacity (Tons)', <Truck size={20} color={COLORS.primary} />, formData.truck_capacity, 'truck_capacity', 'numeric')}
              {renderInput('Preferred Area', <MapPin size={20} color={COLORS.primary} />, formData.preferred_area, 'preferred_area')}
            </>
          )}

          <TouchableOpacity style={styles.nextButton} onPress={handleRegister} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.nextButtonText}>{step === 1 ? 'Next Step' : 'Complete Registration'}</Text>
                <ChevronRight size={20} color={COLORS.white} />
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
  scrollContent: { flexGrow: 1, paddingHorizontal: SPACING.lg, paddingBottom: 40, paddingTop: 60 },
  header: { marginBottom: SPACING.xl },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginLeft: -10, marginBottom: 10 },
  progressContainer: { height: 4, backgroundColor: COLORS.surface, borderRadius: 2, marginBottom: 20 },
  progressBar: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.textMuted },
  form: { marginTop: 20 },
  inputGroup: { marginBottom: SPACING.lg },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  inputContainer: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, 
    borderRadius: SIZES.radius, paddingHorizontal: SPACING.md, height: 56, 
    borderWidth: 1, borderColor: COLORS.border 
  },
  input: { flex: 1, color: COLORS.text, fontSize: 16, marginLeft: 12 },
  nextButton: { 
    backgroundColor: COLORS.primary, height: 56, borderRadius: SIZES.radius, 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 20,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  nextButtonText: { color: COLORS.white, fontSize: 18, fontWeight: '700', marginRight: 8 }
});

export default RegisterScreen;
