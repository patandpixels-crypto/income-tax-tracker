import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      console.log('[AuthContext] Checking authentication...');
      // Check if token exists
      const isAuth = await api.isAuthenticated();

      if (isAuth) {
        // Validate token by attempting to fetch user data
        try {
          const userData = await api.getCurrentUser({ validateToken: true });
          console.log('[AuthContext] Token validation successful:', !!userData);
          setUser(userData);
          setIsAuthenticated(!!userData);
        } catch (error) {
          // If validation fails, clear auth state
          console.log('[AuthContext] Token validation failed:', error.response?.status || error.message);

          // Only clear auth if it's an actual auth error (401/403)
          if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            console.log('[AuthContext] Auth token invalid, clearing auth');
            await api.logout();
            setUser(null);
            setIsAuthenticated(false);
          } else {
            // Network error or server error
            // Check if we have cached user data - if yes, keep authenticated
            console.log('[AuthContext] Network/server error during validation, checking cache');
            try {
              const cachedData = await AsyncStorage.getItem('userData');
              if (cachedData) {
                console.log('[AuthContext] Found cached user data, keeping user authenticated');
                setUser(JSON.parse(cachedData));
                setIsAuthenticated(true);
              } else {
                console.log('[AuthContext] No cached data, clearing auth');
                await api.logout();
                setUser(null);
                setIsAuthenticated(false);
              }
            } catch (cacheError) {
              console.error('[AuthContext] Failed to check cache:', cacheError);
              await api.logout();
              setUser(null);
              setIsAuthenticated(false);
            }
          }
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('[AuthContext] Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    console.log('[AuthContext] Logging in...');
    const result = await api.login(email, password);

    // Verify authentication state
    const isAuth = await api.isAuthenticated();
    if (!isAuth) {
      throw new Error('Authentication verification failed - token not saved properly');
    }

    setUser(result.user);
    setIsAuthenticated(true);
    console.log('[AuthContext] Login successful');
    return result;
  };

  const register = async (name, email, password) => {
    console.log('[AuthContext] Registering...');
    const result = await api.register(name, email, password);
    setUser(result.user);
    setIsAuthenticated(true);
    console.log('[AuthContext] Registration successful');
    return result;
  };

  const logout = async () => {
    console.log('[AuthContext] Logging out...');
    await api.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        register,
        logout,
        updateUser,
        checkAuthentication,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
