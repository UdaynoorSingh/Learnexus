import axios from 'axios';
import { showRateLimitToast } from './toast';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const errorMsg = JSON.stringify(error.response?.data || '').toLowerCase();

    
    if (
      status === 429 ||
      (status === 500 && (
        errorMsg.includes('rate') ||
        errorMsg.includes('quota') ||
        errorMsg.includes('resource_exhausted') ||
        errorMsg.includes('retry in')
      ))
    ) {
      showRateLimitToast();
      
      const rateLimitError = new Error('RATE_LIMIT');
      rateLimitError.isRateLimit = true;
      rateLimitError.response = error.response;
      return Promise.reject(rateLimitError);
    }

    
    if (status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
