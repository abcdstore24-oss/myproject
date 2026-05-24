/**
 * Test API Service
 * API calls for test management
 */

import axios from './axiosConfig';

/**
 * Get all tests
 */
export const getAllTests = async () => {
  const response = await axios.get('/tests');
  return response.data;
};

/**
 * Get test by ID
 */
export const getTestById = async (id) => {
  const response = await axios.get(`/tests/${id}`);
  return response.data;
};

/**
 * Create new test
 */
export const createTest = async (testData) => {
  const response = await axios.post('/tests', testData);
  return response.data;
};

/**
 * Update test
 */
export const updateTest = async (id, testData) => {
  const response = await axios.put(`/tests/${id}`, testData);
  return response.data;
};

/**
 * Delete test
 */
export const deleteTest = async (id) => {
  const response = await axios.delete(`/tests/${id}`);
  return response.data;
};

/**
 * Publish test
 */
export const publishTest = async (id) => {
  const response = await axios.patch(`/tests/${id}/publish`);
  return response.data;
};

/**
 * Get test statistics
 */
export const getTestStats = async () => {
  const response = await axios.get('/tests/stats');
  return response.data;
};

/**
 * Get questions for a test
 */
export const getTestQuestions = async (testId) => {
  const response = await axios.get(`/tests/${testId}/questions`);
  return response.data;
};

export default {
  getAllTests,
  getTestById,
  createTest,
  updateTest,
  deleteTest,
  publishTest,
  getTestStats,
  getTestQuestions,
};
