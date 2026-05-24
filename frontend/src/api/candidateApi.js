/**
 * Candidate API Service
 * API calls for candidate-test assignment and management
 */

import axios from './axiosConfig';

/**
 * Get all available candidates (for assignment)
 */
export const getAvailableCandidates = async () => {
  const response = await axios.get('/candidates/available');
  return response.data;
};

/**
 * Assign candidates to a test
 */
export const assignCandidatesToTest = async (testId, candidateIds) => {
  const response = await axios.post(`/tests/${testId}/candidates`, {
    candidate_ids: candidateIds,
  });
  return response.data;
};

/**
 * Get candidates assigned to a test
 */
export const getTestCandidates = async (testId) => {
  const response = await axios.get(`/tests/${testId}/candidates`);
  return response.data;
};

/**
 * Remove candidate from test
 */
export const removeCandidateFromTest = async (testId, candidateId) => {
  const response = await axios.delete(`/tests/${testId}/candidates/${candidateId}`);
  return response.data;
};

/**
 * Get my tests (candidate view)
 */
export const getMyCandidateTests = async () => {
  const response = await axios.get('/candidates/my-tests');
  return response.data;
};

/**
 * Get enrollment details for a test
 */
export const getEnrollmentDetails = async (testId) => {
  const response = await axios.get(`/candidates/tests/${testId}/enrollment`);
  return response.data;
};

/**
 * Update invitation status (accept/decline)
 */
export const updateInvitationStatus = async (testId, status) => {
  const response = await axios.patch(`/candidates/tests/${testId}/invitation`, {
    status,
  });
  return response.data;
};

export default {
  getAvailableCandidates,
  assignCandidatesToTest,
  getTestCandidates,
  removeCandidateFromTest,
  getMyCandidateTests,
  getEnrollmentDetails,
  updateInvitationStatus,
};
