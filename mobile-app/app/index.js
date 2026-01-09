import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Welcome() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      router.replace('/dashboard');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Income Tax Tracker</Text>
        <Text style={styles.subtitle}>Track your income & calculate taxes automatically</Text>

        <View style={styles.features}>
          <Text style={styles.featureText}>✓ Automatic bank SMS detection</Text>
          <Text style={styles.featureText}>✓ Real-time tax calculations</Text>
          <Text style={styles.featureText}>✓ Transaction management</Text>
          <Text style={styles.featureText}>✓ Nigerian tax brackets</Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={() => router.push('/login')}
        >
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.secondaryButtonText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#8b5cf6',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 40,
    textAlign: 'center',
  },
  features: {
    marginBottom: 40,
  },
  featureText: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
  },
  button: {
    width: '100%',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#8b5cf6',
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '600',
  },
});
