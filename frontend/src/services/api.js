import axios from 'axios';
import { showRateLimitToast } from './toast';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle error responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const errorMsg = JSON.stringify(error.response?.data || '').toLowerCase();

    // Catch rate limit errors (429 or 500s containing rate-limit keywords)
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
      // Still reject so component loading states reset, but with a clean error
      const rateLimitError = new Error('RATE_LIMIT');
      rateLimitError.isRateLimit = true;
      rateLimitError.response = error.response;
      return Promise.reject(rateLimitError);
    }

    // Handle 401 unauthorized
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
