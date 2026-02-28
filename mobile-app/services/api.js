import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://income-tax-tracker.onrender.com/api';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 15000, // 15 second timeout to prevent hanging requests
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Handle authentication errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        // If token is invalid/expired (401 or 403), logout user
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userData');
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(email, password) {
    console.log('[API] Attempting login for:', email);
    const response = await this.api.post('/auth/login', { email, password });

    if (response.data.token && response.data.user) {
      console.log('[API] Login successful, saving token and user data...');

      // Save token and user data
      await AsyncStorage.setItem('userToken', response.data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));

      // Verify data was saved correctly
      const savedToken = await AsyncStorage.getItem('userToken');
      const savedUser = await AsyncStorage.getItem('userData');

      if (!savedToken || !savedUser) {
        throw new Error('Failed to save authentication data to storage');
      }

      console.log('[API] Authentication data saved and verified successfully');
    } else {
      throw new Error('Invalid response from server - missing token or user data');
    }

    return response.data;
  }

  async register(name, email, password) {
    const response = await this.api.post('/auth/register', { name, email, password });
    if (response.data.token) {
      await AsyncStorage.setItem('userToken', response.data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
    }
    return response.data;
  }

  async googleAuth(accessToken) {
    const response = await this.api.post('/auth/google', { accessToken });
    if (response.data.token) {
      await AsyncStorage.setItem('userToken', response.data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
    }
    return response.data;
  }

  async logout() {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userData');
  }

  async getCurrentUser(options = { validateToken: false }) {
    try {
      console.log('[API] Fetching current user from server...');
      // Fetch fresh user data from the server to validate token
      const response = await this.api.get('/auth/me');
      const user = response.data;

      console.log('[API] User data fetched successfully:', user?.email || 'unknown');

      // Update cached user data
      await AsyncStorage.setItem('userData', JSON.stringify(user));

      return user;
    } catch (error) {
      console.error('[API] Failed to fetch user data:', error.message);
      console.error('[API] Error details:', {
        status: error.response?.status,
        message: error.response?.data?.message,
        isTimeout: error.code === 'ECONNABORTED',
        isNetworkError: !error.response
      });

      // If we're validating the token, don't fall back to cache - throw the error
      if (options.validateToken) {
        throw error;
      }

      // If server request fails, try reading from cache as fallback
      // This handles offline scenarios
      console.log('[API] Falling back to cached user data...');
      try {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          console.log('[API] Found cached user data');
          const parsedUser = JSON.parse(userData);
          return parsedUser;
        } else {
          console.log('[API] No cached user data found');
          return null;
        }
      } catch (cacheError) {
        console.error('[API] Failed to parse cached user data:', cacheError);
        await AsyncStorage.removeItem('userData');
        return null;
      }
    }
  }

  async updateBankAlertName(name) {
    const response = await this.api.put('/auth/bank-name', { bankAlertName: name });
    if (response.data.user) {
      await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
    }
    return response.data;
  }

  async isAuthenticated() {
    const token = await AsyncStorage.getItem('userToken');
    return !!token;
  }

  // Transaction endpoints
  async getTransactions() {
    const response = await this.api.get('/transactions');
    return response.data;
  }

  async createTransaction(transactionData) {
    const response = await this.api.post('/transactions', transactionData);
    return response.data;
  }

  async updateTransaction(id, transactionData) {
    const response = await this.api.put(`/transactions/${id}`, transactionData);
    return response.data;
  }

  async deleteTransaction(id) {
    const response = await this.api.delete(`/transactions/${id}`);
    return response.data;
  }

  async classifyTransaction(id, taxCategory, incomeType) {
    const response = await this.api.put(`/transactions/${id}/classify`, { taxCategory, incomeType });
    return response.data;
  }

  // Image text extraction
  async extractTextFromImage(imageData, mediaType) {
    const response = await this.api.post('/extract-text', {
      imageData,
      mediaType
    });
    return response.data;
  }

  // PDF text extraction
  async extractTextFromPDF(pdfData) {
    const response = await this.api.post('/extract-pdf', {
      pdfData
    });
    return response.data;
  }
}

export default new ApiService();
