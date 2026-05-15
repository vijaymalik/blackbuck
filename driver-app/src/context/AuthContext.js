import React, { createContext, useState, useEffect, useContext } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import api from '../api';

const AuthContext = createContext();

// Helper to handle storage across Web and Mobile
const storage = {
  getItem: async (key) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key, value) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  deleteItem: async (key) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  }
};

export const AuthProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);

  const login = async (identity, password) => {
    try {
      console.log('API Call: /driver/login');
      const response = await api.post('/driver/login', { identity, password });
      const { token, user } = response.data.data;
      
      await storage.setItem('userToken', token);
      setUserToken(token);
      setUserData(user);
      return { success: true };
    } catch (error) {
      console.error('Login API Error:', error.response?.data || error.message);
      
      // Extract validation errors if they exist
      let errorMessage = 'Login failed';
      const data = error.response?.data;
      
      if (data?.errors) {
        // Get the first error message from the first field that failed
        const firstField = Object.keys(data.errors)[0];
        errorMessage = data.errors[firstField][0];
      } else if (data?.message) {
        errorMessage = data.message;
      } else if (error.message === 'Network Error') {
        errorMessage = 'Server unreachable. Check your connection.';
      }

      return { success: false, message: errorMessage };
    }
  };

  const register = async (data) => {
    try {
      console.log('API Call: /driver/register');
      const response = await api.post('/driver/register', data);
      const { token, user } = response.data.data;
      
      await storage.setItem('userToken', token);
      setUserToken(token);
      setUserData(user);
      return { success: true };
    } catch (error) {
      console.error('Register API Error:', error.response?.data || error.message);
      
      let errorMessage = 'Registration failed';
      const data = error.response?.data;

      if (data?.errors) {
        const firstField = Object.keys(data.errors)[0];
        errorMessage = data.errors[firstField][0];
      } else if (data?.message) {
        errorMessage = data.message;
      }

      return { success: false, message: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await api.post('/driver/logout');
    } catch (e) {
      console.log('Logout error on server', e);
    }
    await storage.deleteItem('userToken');
    setUserToken(null);
    setUserData(null);
  };

  const checkLoginStatus = async () => {
    try {
      const token = await storage.getItem('userToken');
      if (token) {
        const response = await Promise.race([
          api.get('/driver/me'),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
        ]);
        setUserData(response.data.data.driver);
        setUserToken(token);
      }
    } catch (e) {
      console.log('Check login error or timeout', e);
      if (e.response?.status === 401) {
        await storage.deleteItem('userToken');
        setUserToken(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkLoginStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ login, logout, register, isLoading, userToken, userData, setUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
