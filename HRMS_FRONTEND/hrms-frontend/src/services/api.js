import axios from 'axios';
import { API_BASE_URL, TOKEN_KEY, REFRESH_TOKEN_KEY } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request except login and token refresh
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  const excluded = ['/auth/login/', '/token/refresh/'];
  if (token && !excluded.some((p) => config.url.includes(p))) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Debug helper: log outgoing requests
api.interceptors.request.use((config) => {
  console.log('[API]', config.method?.toUpperCase(), config.url);
  return config;
});

// On 401, attempt silent token refresh; on failure redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
        const { data } = await axios.post(`${API_BASE_URL}/api/token/refresh/`, { refresh });
        localStorage.setItem(TOKEN_KEY, data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
