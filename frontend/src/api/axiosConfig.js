/**
 * Axios Configuration
 *
 * FIX B-07:
 * 1. Token refresh now uses a dedicated raw axios instance (refreshClient) instead
 *    of the global `axios` default. Using `axiosInstance` itself for the refresh
 *    call would cause an infinite 401 loop because the interceptor would intercept
 *    the refresh request too.
 *
 * 2. Added an `isRefreshing` flag + a `failedQueue` array to handle the race
 *    condition where multiple requests fire simultaneously and all get a 401.
 *    Only ONE refresh call is made; all other waiting requests are resolved (or
 *    rejected) once the refresh completes.
 *
 * 3. refreshClient uses the same baseURL as axiosInstance so the refresh
 *    endpoint path is consistent and does not depend on VITE_API_URL being
 *    duplicated manually in the interceptor (which was the original bug —
 *    `axios.post(${VITE_API_URL}/auth/refresh)` would double-add /api if the
 *    env var already ends with /api).
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Main instance used by all API modules ──────────────────────────────────
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Dedicated client for the refresh call only ─────────────────────────────
// Intentionally a plain axios instance with NO interceptors attached,
// so a failed refresh does NOT trigger another refresh recursively.
const refreshClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Parallel-refresh guard ─────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue  = []; // { resolve, reject }[]

function processQueue(error, token = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else       resolve(token);
  });
  failedQueue = [];
}

// ── Request interceptor — attach access token ──────────────────────────────
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — handle 401, refresh, retry ─────────────────────
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh on 401 and only once per request
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // If a refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axiosInstance(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing           = true;

    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      // No refresh token — force logout immediately
      clearAuthAndRedirect();
      return Promise.reject(error);
    }

    try {
      // FIX B-07: use refreshClient (no interceptors) not raw axios or axiosInstance
      const response = await refreshClient.post(
        '/auth/refresh',
        {},
        { headers: { Authorization: `Bearer ${refreshToken}` } }
      );

      const { accessToken } = response.data.data;

      localStorage.setItem('accessToken', accessToken);
      axiosInstance.defaults.headers.common.Authorization = `Bearer ${accessToken}`;

      // Resolve all queued requests with the new token
      processQueue(null, accessToken);

      // Retry the original request
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return axiosInstance(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearAuthAndRedirect();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

function clearAuthAndRedirect() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export default axiosInstance;