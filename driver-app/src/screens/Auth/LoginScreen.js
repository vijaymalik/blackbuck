import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  Image, ActivityIndicator, Alert, KeyboardAvoidingView, 
  ScrollView, Platform, Dimensions 
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, SIZES } from '../../theme/theme';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react-native';

const { height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!identity || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    console.log('Attempting login with:', identity);
    const result = await login(identity, password);
    setLoading(false);

    if (!result.success) {
      console.log('Login Error Details:', result.message);
      Alert.alert('Login Failed', result.message);
    } else {
      console.log('Login Successful!');
    }
  };

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
          <View style={styles.logoContainer}>
            <User size={40} color={COLORS.white} />
          </View>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue tracking</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email or Phone</Text>
            <View style={styles.inputContainer}>
              <Mail size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Enter email or phone"
                placeholderTextColor={COLORS.textMuted}
                value={identity}
                onChangeText={setIdentity}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Lock size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff size={20} color={COLORS.textMuted} /> : <Eye size={20} color={COLORS.textMuted} />}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={[
              styles.loginButton, 
              (!identity || !password || loading) && styles.loginButtonDisabled
            ]} 
            onPress={handleLogin}
            disabled={!identity || !password || loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.link}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: height * 0.1,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 8,
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMuted,
    fontWeight: '500'
  },
  form: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderRadius: SIZES.radius + 4,
    paddingHorizontal: SPACING.md,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    marginLeft: 12,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    height: 56,
    borderRadius: SIZES.radius + 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  loginButtonDisabled: {
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },
  link: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },
});

export default LoginScreen;
