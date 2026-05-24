/**
 * Organization API
 *
 * FIX B-12: Was using the .then(r => r.data) chained pattern, while every
 * other API module (authApi, testApi, questionApi, examApi, etc.) uses
 * async/await and returns response.data. The data shape returned to callers
 * is identical — this is purely a consistency/maintainability fix so that
 * all API files read the same way and can be refactored together.
 *
 * No behavioural change. OrgDashboard.jsx callers are unaffected because
 * the returned value ({ success, data: { org } }) is the same either way.
 */

import axiosInstance from './axiosConfig';

/**
 * Get current org's details
 */
export const getMyOrg = async () => {
  const response = await axiosInstance.get('/org/me');
  return response.data;
};

/**
 * Get all recruiters in the org
 */
export const getTeam = async () => {
  const response = await axiosInstance.get('/org/team');
  return response.data;
};

/**
 * Invite a recruiter by email
 */
export const inviteRecruiter = async (email) => {
  const response = await axiosInstance.post('/org/invite', { email });
  return response.data;
};

/**
 * Remove a recruiter from the org
 */
export const removeRecruiter = async (userId) => {
  const response = await axiosInstance.delete(`/org/team/${userId}`);
  return response.data;
};