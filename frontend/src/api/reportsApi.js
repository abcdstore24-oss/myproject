/**
 * Reports API
 * Frontend API calls for reports and results
 */

import axios from './axiosConfig';

/**
 * Get candidate result (for candidate)
 */
export const getCandidateResult = async (assignmentId) => {
  const response = await axios.get(`/reports/candidate/${assignmentId}`);
  return response.data;
};

/**
 * Get test report (for recruiter)
 */
export const getTestReport = async (testId) => {
  const response = await axios.get(`/reports/test/${testId}`);
  return response.data;
};

/**
 * Get detailed candidate report (for recruiter)
 */
export const getDetailedCandidateReport = async (assignmentId) => {
  const response = await axios.get(`/reports/candidate/${assignmentId}/detailed`);
  return response.data;
};

/**
 * Get test analytics (for recruiter)
 */
export const getTestAnalytics = async (testId) => {
  const response = await axios.get(`/reports/test/${testId}/analytics`);
  return response.data;
};
