/**
 * Question Routes
 * Defines routes for question management endpoints
 */

const express = require('express');
const router = express.Router();

const QuestionController = require('../controllers/questionController');
const { authenticate } = require('../middleware/authMiddleware');
const { adminOrRecruiter } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  createMCQValidation,
  createCodingValidation,
  updateQuestionValidation,
  questionIdValidation,
} = require('../validators/questionValidator');

// All question routes require authentication and admin/recruiter role
router.use(authenticate, adminOrRecruiter);

/**
 * @route   GET /api/questions/:id
 * @desc    Get question by ID
 * @access  Admin, Recruiter (own test questions)
 */
router.get(
  '/:id',
  questionIdValidation,
  validate,
  QuestionController.getQuestion
);

/**
 * @route   POST /api/questions/mcq
 * @desc    Create MCQ question
 * @access  Admin, Recruiter
 */
router.post(
  '/mcq',
  createMCQValidation,
  validate,
  QuestionController.createMCQQuestion
);

/**
 * @route   POST /api/questions/coding
 * @desc    Create coding question
 * @access  Admin, Recruiter
 */
router.post(
  '/coding',
  createCodingValidation,
  validate,
  QuestionController.createCodingQuestion
);

/**
 * @route   PUT /api/questions/:id
 * @desc    Update question
 * @access  Admin, Recruiter (own test questions)
 */
router.put(
  '/:id',
  updateQuestionValidation,
  validate,
  QuestionController.updateQuestion
);

/**
 * @route   DELETE /api/questions/:id
 * @desc    Delete question
 * @access  Admin, Recruiter (own test questions)
 */
router.delete(
  '/:id',
  questionIdValidation,
  validate,
  QuestionController.deleteQuestion
);

module.exports = router;
