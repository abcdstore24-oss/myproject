/**
 * Auth API Service
 * API calls for authentication
 */

import axios from './axiosConfig';

/**
 * Register a new user
 */
export const register = async (userData) => {
  const response = await axios.post('/auth/register', userData);
  return response.data;
};

/**
 * Login user
 */
export const login = async (credentials) => {
  const response = await axios.post('/auth/login', credentials);
  return response.data;
};

/**
 * Get current user
 */
export const getCurrentUser = async () => {
  const response = await axios.get('/auth/me');
  return response.data;
};

/**
 * Refresh access token
 */
export const refreshToken = async () => {
  const response = await axios.post('/auth/refresh');
  return response.data;
};

/**
 * Logout user
 */
export const logout = async () => {
  const response = await axios.post('/auth/logout');
  return response.data;
};

/**
 * Change password
 */
export const changePassword = async (passwords) => {
  const response = await axios.post('/auth/change-password', passwords);
  return response.data;
};


export const verifyInviteToken = async (token) => {
  const response = await axios.get(`/auth/invite/verify?token=${token}`);
  return response.data;
};

export const acceptInviteApi = async (payload) => {
  const response = await axios.post('/auth/invite/accept', payload);
  return response.data;
};

export const registerOrg = async (payload) => {
  const response = await axios.post('/auth/register-org', payload);
  return response.data;
};

export default {
  register,
  login,
  getCurrentUser,
  refreshToken,
  logout,
  changePassword,
};
