import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://income-tax-tracker.onrender.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API
export const authAPI = {
  register: (email, password, name) =>
    api.post('/auth/register', { email, password, name }),

  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  getProfile: () =>
    api.get('/auth/me'),

  updateBankName: (bankAlertName) =>
    api.put('/auth/bank-name', { bankAlertName }),
};

// Transaction API
export const transactionAPI = {
  getAll: () =>
    api.get('/transactions'),

  create: (transaction) =>
    api.post('/transactions', transaction),

  delete: (id) =>
    api.delete(`/transactions/${id}`),
};

export default api;
