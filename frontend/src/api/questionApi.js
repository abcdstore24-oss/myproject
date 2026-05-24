/**
 * Question API Service
 * API calls for question management
 */

import axios from './axiosConfig';

/**
 * Get all questions for a test
 */
export const getTestQuestions = async (testId) => {
  const response = await axios.get(`/tests/${testId}/questions`);
  return response.data;
};

/**
 * Get question by ID
 */
export const getQuestionById = async (id) => {
  const response = await axios.get(`/questions/${id}`);
  return response.data;
};

/**
 * Create MCQ question
 */
export const createMCQQuestion = async (questionData) => {
  const response = await axios.post('/questions/mcq', questionData);
  return response.data;
};

/**
 * Create coding question
 */
export const createCodingQuestion = async (questionData) => {
  const response = await axios.post('/questions/coding', questionData);
  return response.data;
};

/**
 * Update question
 */
export const updateQuestion = async (id, questionData) => {
  const response = await axios.put(`/questions/${id}`, questionData);
  return response.data;
};

/**
 * Delete question
 */
export const deleteQuestion = async (id) => {
  const response = await axios.delete(`/questions/${id}`);
  return response.data;
};

export default {
  getTestQuestions,
  getQuestionById,
  createMCQQuestion,
  createCodingQuestion,
  updateQuestion,
  deleteQuestion,
};
