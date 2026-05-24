/**
 * MonitoringAPI
 * API calls for proctoring and monitoring
 */

import axios from './axiosConfig';

/**
 * Log a proctoring event
 */
export const logEvent = async (eventData) => {
  const response = await axios.post('/monitoring/log', eventData);
  return response.data;
};

/**
 * Upload webcam snapshot
 */
export const uploadSnapshot = async (imageBlob, testId) => {
  const formData = new FormData();
  formData.append('snapshot', imageBlob, `snapshot-${Date.now()}.jpg`);
  formData.append('testId', testId);

  const response = await axios.post('/monitoring/snapshot', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

/**
 * Get monitoring logs for assignment
 */
export const getAssignmentLogs = async (assignmentId, limit = 100) => {
  const response = await axios.get(`/monitoring/assignment/${assignmentId}`, {
    params: { limit },
  });
  return response.data;
};

/**
 * Get monitoring data for entire test
 */
export const getTestMonitoring = async (testId) => {
  const response = await axios.get(`/monitoring/test/${testId}`);
  return response.data;
};

/**
 * Get live monitoring data (active candidates)
 */
export const getLiveMonitoring = async (testId) => {
  const response = await axios.get(`/monitoring/live/${testId}`);
  return response.data;
};

/**
 * Flag assignment as suspicious
 */
export const flagSuspicious = async (assignmentId, notes) => {
  const response = await axios.post(`/monitoring/flag/${assignmentId}`, {
    notes,
  });
  return response.data;
};

/**
 * Get snapshots for assignment
 */
export const getSnapshots = async (assignmentId) => {
  const response = await axios.get(`/monitoring/snapshots/${assignmentId}`);
  return response.data;
};

export default {
  logEvent,
  uploadSnapshot,
  getAssignmentLogs,
  getTestMonitoring,
  getLiveMonitoring,
  flagSuspicious,
  getSnapshots,
};
