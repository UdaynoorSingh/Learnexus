import axios from 'axios';
import { showRateLimitToast } from './toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
});


api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    const h = config.headers;
    if (h && typeof h.delete === 'function') {
      h.delete('Content-Type');
    } else if (h) {
      delete h['Content-Type'];
    }
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
      const reqUrl = error.config?.url || '';
      const onPublicAuth =
        window.location.pathname === '/login' ||
        window.location.pathname === '/admin' ||
        reqUrl.includes('admin-login');
      if (!onPublicAuth) {
        localStorage.removeItem('token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
