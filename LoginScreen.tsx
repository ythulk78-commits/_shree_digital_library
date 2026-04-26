import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/i18n';
import type { UserRole } from '../lib/types';

const { width } = Dimensions.get('window');

export default function LoginScreen({ navigation }: any) {
  const { colors } = useTheme();
  const { login, signup } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isSignup, setIsSignup] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [batch, setBatch] = useState('morning');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!selectedRole || !identifier || !password) {
      setError(t('enterMobile') + ' & ' + t('enterPassword'));
      return;
    }
    
    setLoading(true);
    setError('');
    
    const success = await login(identifier, password, selectedRole);
    
    if (success) {
      // Navigation will be handled by App.tsx based on auth state
    } else {
      setError('Invalid credentials. Try admin@library.com / admin123 or 9876543210 / pass123');
    }
    
    setLoading(false);
  };

  const handleSignup = async () => {
    if (!name || !mobile || !password) {
      setError('Please fill all fields');
      return;
    }
    
    setLoading(true);
    setError('');
    
    const success = await signup(name, mobile, password, batch);
    
    if (!success) {
      setError('Mobile number already registered');
    }
    
    setLoading(false);
  };

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.primary,
      paddingTop: 80,
      paddingBottom: 40,
      paddingHorizontal: 24,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: '#FFFFFF',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: 'rgba(255,255,255,0.8)',
    },
    content: {
      flex: 1,
      padding: 24,
      paddingTop: 32,
    },
    roleSelector: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 24,
    },
    roleButton: {
      flex: 1,
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
    },
    roleButtonSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '15',
    },
    roleIcon: {
      fontSize: 28,
      marginBottom: 8,
    },
    roleText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    inputContainer: {
      marginBottom: 16,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.cardBg,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.text,
    },
    inputFocused: {
      borderColor: colors.primary,
    },
    batchSelector: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    batchOption: {
      flex: 1,
      padding: 12,
      borderRadius: 10,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBg,
    },
    batchOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '20',
    },
    batchText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    batchTextSelected: {
    color: colors.primary,
    fontWeight: '600',
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    },
    buttonText: {
      color: '#FFFFFF',
      fontSize: 17,
      fontWeight: '700',
    },
    toggleContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 20,
      gap: 8,
    },
    toggleText: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    toggleLink: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    errorBox: {
      backgroundColor: colors.error + '15',
      borderLeftWidth: 4,
      borderLeftColor: colors.error,
      padding: 12,
      borderRadius: 8,
      marginBottom: 16,
    },
    errorText: {
      color: colors.error,
      fontSize: 13,
    },
    demoBox: {
      backgroundColor: colors.accent + '15',
      borderRadius: 12,
      padding: 16,
      marginTop: 24,
    },
    demoTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.secondary,
      marginBottom: 8,
    },
    demoItem: {
      fontSize: 12,
      color: colors.textSecondary,
      marginBottom: 4,
    },
  });

  return (
    <SafeAreaView style={dynamicStyles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={dynamicStyles.header}>
            <Text style={dynamicStyles.title}>📚 {t('appName')}</Text>
            <Text style={dynamicStyles.subtitle}>{t('selectRole')}</Text>
          </View>

          {/* Content */}
          <View style={dynamicStyles.content}>
            {/* Role Selector */}
            {!isSignup && (
              <View style={dynamicStyles.roleSelector}>
                <TouchableOpacity
                  style={[
                    dynamicStyles.roleButton,
                    selectedRole === 'admin' && dynamicStyles.roleButtonSelected,
                  ]}
                  onPress={() => setSelectedRole('admin')}
                >
                  <Ionicons name="shield-checkmark" size={28} color={selectedRole === 'admin' ? colors.primary : colors.textSecondary} />
                  <Text style={dynamicStyles.roleText}>{t('adminPanel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    dynamicStyles.roleButton,
                    selectedRole === 'student' && dynamicStyles.roleButtonSelected,
                  ]}
                  onPress={() => setSelectedRole('student')}
                >
                  <Ionicons name="school" size={28} color={selectedRole === 'student' ? colors.primary : colors.textSecondary} />
                  <Text style={dynamicStyles.roleText}>{t('studentPortal')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Error */}
            {error ? (
              <View style={dynamicStyles.errorBox}>
                <Text style={dynamicStyles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Signup Fields */}
            {isSignup ? (
              <>
                <View style={dynamicStyles.inputContainer}>
                  <Text style={dynamicStyles.inputLabel}>{t('name')} *</Text>
                  <TextInput
                    style={dynamicStyles.input}
                    placeholder={t('enterName')}
                    placeholderTextColor={colors.textSecondary}
                    value={name}
                    onChangeText={setName}
                  />
                </View>
                <View style={dynamicStyles.inputContainer}>
                  <Text style={dynamicStyles.inputLabel}>{t('mobile')} *</Text>
                  <TextInput
                    style={dynamicStyles.input}
                    placeholder="9876543210"
                    placeholderTextColor={colors.textSecondary}
                    value={mobile}
                    onChangeText={setMobile}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>
                <View style={dynamicStyles.inputContainer}>
                  <Text style={dynamicStyles.inputLabel}>{t('password')} *</Text>
                  <TextInput
                    style={dynamicStyles.input}
                    placeholder={t('enterPassword')}
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
                <View style={dynamicStyles.inputContainer}>
                  <Text style={dynamicStyles.inputLabel}>{t('batch')} *</Text>
                  <View style={dynamicStyles.batchSelector}>
                    {[{ key: 'morning', label: t('morning') }, { key: 'evening', label: t('evening') }, { key: 'full_day', label: t('fullDay') }].map((b) => (
                      <TouchableOpacity
                        key={b.key}
                        style={[dynamicStyles.batchOption, batch === b.key && dynamicStyles.batchOptionSelected]}
                        onPress={() => setBatch(b.key)}
                      >
                        <Text style={[dynamicStyles.batchText, batch === b.key && dynamicStyles.batchTextSelected]}>{b.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Login Fields */}
                <View style={dynamicStyles.inputContainer}>
                  <Text style={dynamicStyles.inputLabel}>
                    {selectedRole === 'admin' ? t('email') : t('mobile')} *
                  </Text>
                  <TextInput
                    style={dynamicStyles.input}
                    placeholder={selectedRole === 'admin' ? 'admin@library.com' : '9876543210'}
                    placeholderTextColor={colors.textSecondary}
                    value={identifier}
                    onChangeText={setIdentifier}
                    keyboardType={selectedRole === 'student' ? 'phone-pad' : 'default'}
                    autoCapitalize={selectedRole === 'admin' ? 'none' : 'sentences'}
                  />
                </View>
                <View style={dynamicStyles.inputContainer}>
                  <Text style={dynamicStyles.inputLabel}>{t('password')} *</Text>
                  <TextInput
                    style={dynamicStyles.input}
                    placeholder={t('enterPassword')}
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={dynamicStyles.button}
              onPress={isSignup ? handleSignup : handleLogin}
              disabled={loading}
            >
              <Text style={dynamicStyles.buttonText}>
                {loading ? t('loading') : isSignup ? t('signup') : t('login')}
              </Text>
            </TouchableOpacity>

            {/* Toggle Login/Signup */}
            {selectedRole === 'student' && (
              <View style={dynamicStyles.toggleContainer}>
                <Text style={dynamicStyles.toggleText}>
                  {isSignup ? 'Already have an account?' : "Don't have an account?"}
                </Text>
                <TouchableOpacity onPress={() => { setIsSignup(!isSignup); setError(''); }}>
                  <Text style={dynamicStyles.toggleLink}>{isSignup ? t('login') : t('signup')}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Demo Credentials */}
            <View style={dynamicStyles.demoBox}>
              <Text style={dynamicStyles.demoTitle}>🔑 Demo Credentials</Text>
              <Text style={dynamicStyles.demoItem}>Admin: admin@library.com / admin123</Text>
              <Text style={dynamicStyles.demoItem}>Student: 9876543210 / pass123</Text>
              <Text style={dynamicStyles.demoItem}>Student: 9876543211 / pass123</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
