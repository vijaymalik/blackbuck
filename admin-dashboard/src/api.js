import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Accept': 'application/json',
  },
  // Custom transform to strip PHP notices/HTML from responses
  transformResponse: [function (data) {
    if (typeof data === 'string') {
      try {
        // Find the first '{' and treat everything after as JSON
        const jsonStart = data.indexOf('{');
        if (jsonStart !== -1) {
          return JSON.parse(data.substring(jsonStart));
        }
      } catch (e) {
        return data;
      }
    }
    return data;
  }]
});

// Interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
