import axios from 'axios';
import { LOGIN_PATH } from './config';

const TOKEN_KEY = 'token';

export const auth = {
  get token() {
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  if (auth.token) config.headers.Authorization = `Bearer ${auth.token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Expired/invalid session: drop the token and send the admin back to login
    if (err.response?.status === 401 && auth.token) {
      auth.clear();
      if (window.location.pathname !== LOGIN_PATH) window.location.assign(LOGIN_PATH);
    }
    return Promise.reject(err);
  }
);

// 502/503/504 come from the dev proxy when the backend isn't running
const unreachable = (err) => !err.response || err.code === 'ECONNABORTED' || [502, 503, 504].includes(err.response.status);

export const errorMessage = (err) =>
  unreachable(err) ? 'Could not reach the server. Please try again.' : err.response.data?.error || 'Something went wrong';

export default api;
