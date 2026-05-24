/**
 * User API Service
 * API calls for user management (Admin only)
 */

import axios from './axiosConfig';

/**
 * Get all users
 */
export const getAllUsers = async () => {
  const response = await axios.get('/users');
  return response.data;
};

/**
 * Get users by role
 */
export const getUsersByRole = async (role) => {
  const response = await axios.get(`/users/role/${role}`);
  return response.data;
};

/**
 * Get user by ID
 */
export const getUserById = async (id) => {
  const response = await axios.get(`/users/${id}`);
  return response.data;
};

/**
 * Create new user
 */
export const createUser = async (userData) => {
  const response = await axios.post('/users', userData);
  return response.data;
};

/**
 * Update user
 */
export const updateUser = async (id, userData) => {
  const response = await axios.put(`/users/${id}`, userData);
  return response.data;
};

/**
 * Delete user
 */
export const deleteUser = async (id) => {
  const response = await axios.delete(`/users/${id}`);
  return response.data;
};

/**
 * Toggle user status
 */
export const toggleUserStatus = async (id) => {
  const response = await axios.patch(`/users/${id}/toggle-status`);
  return response.data;
};

/**
 * Get user statistics
 */
export const getUserStats = async () => {
  const response = await axios.get('/users/stats');
  return response.data;
};

export default {
  getAllUsers,
  getUsersByRole,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getUserStats,
};
