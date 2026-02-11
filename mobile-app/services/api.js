import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://income-tax-tracker.onrender.com/api';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
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
  }

  // Auth endpoints
  async login(email, password) {
    const response = await this.api.post('/auth/login', { email, password });
    if (response.data.token) {
      await AsyncStorage.setItem('userToken', response.data.token);
      await AsyncStorage.setItem('userData', JSON.stringify(response.data.user));
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

  async getCurrentUser() {
    const userData = await AsyncStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
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

  // Image text extraction
  async extractTextFromImage(imageData, mediaType) {
    const response = await this.api.post('/extract-text', {
      imageData,
      mediaType
    });
    return response.data;
  }
}

export default new ApiService();
