import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_BASE_URL = 'http://192.168.0.145:8002/api/v1'; // Bridged Windows IP for Mobile Testing

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Helper to handle storage across Web and Mobile
const getAuthToken = async () => {
  if (Platform.OS === 'web') {
    return localStorage.getItem('userToken');
  }
  return await SecureStore.getItemAsync('userToken');
};

// Add a request interceptor to add the auth token
api.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
