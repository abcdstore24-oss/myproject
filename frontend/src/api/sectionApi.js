/**
 * sectionApi.js
 * Axios calls for section management (recruiter side)
 *
 * FIX B-01: All functions now return response.data (the parsed backend JSON),
 * matching the pattern used by every other API module (testApi, questionApi, etc.).
 * Previously, the raw AxiosResponse was returned, causing sRes.data.sections
 * to be undefined in TestQuestions.jsx because the shape was one level too deep.
 */

import axiosInstance from './axiosConfig';

/** Get all sections for a test */
export const getSections = async (testId) => {
  const response = await axiosInstance.get(`/tests/${testId}/sections`);
  return response.data;
};

/** Create a section */
export const createSection = async (testId, data) => {
  const response = await axiosInstance.post(`/tests/${testId}/sections`, data);
  return response.data;
};

/** Update a section */
export const updateSection = async (sectionId, data) => {
  const response = await axiosInstance.put(`/sections/${sectionId}`, data);
  return response.data;
};

/** Delete a section */
export const deleteSection = async (sectionId) => {
  const response = await axiosInstance.delete(`/sections/${sectionId}`);
  return response.data;
};