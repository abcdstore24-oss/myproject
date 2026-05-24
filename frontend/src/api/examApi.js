/**
 * Exam API Service - UPDATED
 * Added answer submission and test submission
 */

import axios from './axiosConfig';

/**
 * Verify pre-exam requirements
 */
export const verifyRequirements = async (testId) => {
  const response = await axios.post('/exam/verify-requirements', { testId });
  return response.data;
};

/**
 * Verify webcam
 */
export const verifyWebcam = async (testId, webcamVerified) => {
  const response = await axios.post('/exam/verify-webcam', {
    testId,
    webcamVerified,
  });
  return response.data;
};

/**
 * Verify location
 */
export const verifyLocation = async (testId, latitude, longitude) => {
  const response = await axios.post('/exam/verify-location', {
    testId,
    latitude,
    longitude,
  });
  return response.data;
};

/**
 * Verify second camera
 */
export const verifySecondCamera = async (testId, secondCameraVerified) => {
  const response = await axios.post('/exam/verify-second-camera', {
    testId,
    secondCameraVerified,
  });
  return response.data;
};

/**
 * Start test
 */
export const startTest = async (testId) => {
  const response = await axios.post('/exam/start', { testId });
  return response.data;
};

/**
 * Get exam session (for resume)
 */
export const getExamSession = async (testId) => {
  const response = await axios.get(`/exam/${testId}/session`);
  return response.data;
};

/**
 * ✅ NEW: Save answer (auto-save)
 */
export const saveAnswer = async (testId, questionId, answerData) => {
  const response = await axios.post('/exam/save-answer', {
    testId,
    questionId,
    ...answerData,
  });
  return response.data;
};

/**
 * ✅ NEW: Submit test
 */
export const submitTest = async (testId) => {
  const response = await axios.post('/exam/submit', { testId }, { timeout: 60000 });
  return response.data;
};
/**
 * Run code against visible test cases ("Run Code" button)
 */
export const runCode = async (questionId, code, language, testId) => {
  const response = await axios.post('/execution/run', {
    questionId,
    code,
    language,
    testId,
  }, { timeout: 30000 });
  return response.data;
};

/**
 * Grade coding answer against all test cases (called on submit)
 */
export const gradeCode = async (questionId, code, language, testId) => {
  const response = await axios.post('/execution/grade', {
    questionId,
    code,
    language,
    testId,
  }, { timeout: 30000 });
  return response.data;
};

/**
 * Get mobile camera QR token for second camera setup
 */
export const getMobileCameraToken = async (testId) => {
  const response = await axios.get(`/exam/mobile-camera-token/${testId}`);
  return response.data;
};

export default {
  verifyRequirements,
  verifyWebcam,
  verifyLocation,
  verifySecondCamera,
  startTest,
  getExamSession,
  saveAnswer,
  submitTest,
  runCode,
  gradeCode,
  getMobileCameraToken,
};
