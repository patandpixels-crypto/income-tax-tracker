import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
// import * as Google from 'expo-auth-session/providers/google';
// import * as WebBrowser from 'expo-web-browser';
// import Constants from 'expo-constants';
import api from '../services/api';
import { colors, spacing, typography, borderRadius } from '../theme';

// WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Temporarily disabled Google Sign-In for Expo Go compatibility
  // const [request, response, promptAsync] = Google.useAuthRequest({
  //   androidClientId: Constants.expoConfig?.extra?.googleSignIn?.androidClientId,
  //   iosClientId: Constants.expoConfig?.extra?.googleSignIn?.iosClientId,
  //   webClientId: Constants.expoConfig?.extra?.googleSignIn?.webClientId,
  // });

  // useEffect(() => {
  //   if (response?.type === 'success') {
  //     const { authentication } = response;
  //     handleGoogleSignIn(authentication.accessToken);
  //   }
  // }, [response]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await api.login(email, password);
      console.log('Login successful:', !!result);

      // Small delay to ensure state is properly saved
      await new Promise(resolve => setTimeout(resolve, 100));

      navigation.replace('Dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert(
        'Login Failed',
        error?.response?.data?.message || error.message || 'Invalid email or password'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Please contact support to reset your password.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Email Support',
          onPress: () => {
            Linking.openURL('mailto:support@incometaxtracker.com?subject=Password Reset Request');
          },
        },
      ]
    );
  };

  // Temporarily disabled for Expo Go compatibility
  // const handleGoogleSignIn = async (accessToken) => {
  //   try {
  //     setLoading(true);
  //     // Send access token to your backend
  //     const response = await api.googleAuth(accessToken);
  //     if (response.success) {
  //       navigation.replace('Dashboard');
  //     }
  //   } catch (error) {
  //     Alert.alert('Google Sign-In Failed', error.message || 'Could not sign in with Google');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundSecondary]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>🔐 Secure Gateway</Text>
              <Text style={styles.subtitle}>Sign in to Income Tax Tracker</Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your.email@example.com"
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.buttonText}>Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.link}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: spacing.xxl,
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    fontSize: 32,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  button: {
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  buttonGradient: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  link: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
  },
});
