import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import DashboardScreen from './screens/DashboardScreen';
import api from './services/api';
import { colors } from './theme';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      // Check if token exists
      const isAuth = await api.isAuthenticated();

      if (isAuth) {
        // Validate token by attempting to fetch user data
        try {
          const userData = await api.getCurrentUser({ validateToken: true });
          console.log('Token validation successful:', !!userData);
          // If we successfully got user data, user is authenticated
          setIsAuthenticated(!!userData);
        } catch (error) {
          // If validation fails, clear auth state
          console.log('Token validation failed:', error.response?.status || error.message);

          // Only clear auth if it's an actual auth error (401/403)
          // For network errors, keep them logged in and let Dashboard handle it
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.log('Auth token invalid, clearing auth');
            await api.logout();
            setIsAuthenticated(false);
          } else {
            // Network error or server error
            // Check if we have cached user data - if yes, keep authenticated
            // If no cached data, clear auth to prevent blank screens
            console.log('Network/server error during validation, checking cache');
            try {
              const cachedData = await AsyncStorage.getItem('userData');
              if (cachedData) {
                console.log('Found cached user data, keeping user authenticated');
                setIsAuthenticated(true);
              } else {
                console.log('No cached data, clearing auth to prevent blank screen');
                await api.logout();
                setIsAuthenticated(false);
              }
            } catch (cacheError) {
              console.error('Failed to check cache:', cacheError);
              await api.logout();
              setIsAuthenticated(false);
            }
          }
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={isAuthenticated ? "Dashboard" : "Welcome"}
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.cardBackground,
              borderBottomWidth: 1,
              borderBottomColor: colors.cardBorder,
            },
            headerTintColor: colors.textPrimary,
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: 'Sign In' }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: 'Create Account' }}
          />
          <Stack.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{
              title: 'Income Tax Tracker',
              headerLeft: () => null
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
