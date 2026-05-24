/**
 * Question Validators
 *
 * FIX B-09: correct_option previously only accepted lowercase 'a'-'d'.
 * The DB stores CHAR(1) with no case constraint, and Answer.evaluateMCQAnswer()
 * does a case-insensitive comparison — so uppercase 'A'-'D' is valid at the
 * DB layer. However the validator was rejecting uppercase inputs with a 400,
 * which breaks any question-import tool or external form that sends 'A'..'D'.
 *
 * Fix: Accept both cases in isIn(), then normalise to lowercase via
 * customSanitizer so the stored value is always consistent ('a','b','c','d').
 *
 * NOTE: question_type is NOT validated in the body — the route URL already
 * encodes the type (/api/questions/mcq vs /api/questions/coding). Adding a
 * body validator for it would break any form that doesn't send question_type.
 */

const { body, param } = require('express-validator');

/**
 * Create MCQ question validation
 */
const createMCQValidation = [
  body('question_text')
    .notEmpty()
    .withMessage('Question text is required')
    .isLength({ min: 10 })
    .withMessage('Question text must be at least 10 characters')
    .trim(),

  body('option_a')
    .notEmpty()
    .withMessage('Option A is required')
    .isLength({ max: 500 })
    .withMessage('Option A must not exceed 500 characters')
    .trim(),

  body('option_b')
    .notEmpty()
    .withMessage('Option B is required')
    .isLength({ max: 500 })
    .withMessage('Option B must not exceed 500 characters')
    .trim(),

  body('option_c')
    .notEmpty()
    .withMessage('Option C is required')
    .isLength({ max: 500 })
    .withMessage('Option C must not exceed 500 characters')
    .trim(),

  body('option_d')
    .notEmpty()
    .withMessage('Option D is required')
    .isLength({ max: 500 })
    .withMessage('Option D must not exceed 500 characters')
    .trim(),

  // FIX B-09: accept a-d AND A-D, then normalise to lowercase for storage
  body('correct_option')
    .isIn(['a', 'b', 'c', 'd', 'A', 'B', 'C', 'D'])
    .withMessage('Correct option must be a, b, c, or d')
    .customSanitizer((value) => value.toLowerCase()),

  body('marks')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Marks must be between 1 and 100'),

  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
];

/**
 * Create coding question validation
 */
const createCodingValidation = [
  body('question_text')
    .notEmpty()
    .withMessage('Question text is required')
    .isLength({ min: 10 })
    .withMessage('Question text must be at least 10 characters')
    .trim(),

  body('supported_languages')
    .isArray({ min: 1 })
    .withMessage('At least one supported language is required'),

  body('supported_languages.*')
    .isIn(['javascript', 'python', 'java', 'cpp', 'c'])
    .withMessage('Invalid language. Must be javascript, python, java, cpp, or c'),

  body('initial_codes')
    .optional()
    .isObject()
    .withMessage('initial_codes must be an object'),

  body('test_cases')
    .isArray({ min: 1 })
    .withMessage('At least one test case is required'),

  body('test_cases.*.input')
    .notEmpty()
    .withMessage('Test case input is required'),

  body('test_cases.*.expected_output')
    .notEmpty()
    .withMessage('Test case expected output is required'),

  body('marks')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Marks must be between 1 and 100'),

  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
];

/**
 * Update question validation
 */
const updateQuestionValidation = [
  param('id')
    .isInt()
    .withMessage('Question ID must be a number'),

  body('question_text')
    .optional()
    .isLength({ min: 10 })
    .withMessage('Question text must be at least 10 characters')
    .trim(),

  // FIX B-09: same normalisation applied on update too
  body('correct_option')
    .optional()
    .isIn(['a', 'b', 'c', 'd', 'A', 'B', 'C', 'D'])
    .withMessage('Correct option must be a, b, c, or d')
    .customSanitizer((value) => value.toLowerCase()),

  body('supported_languages')
    .optional()
    .isArray({ min: 1 })
    .withMessage('supported_languages must be a non-empty array'),

  body('supported_languages.*')
    .optional()
    .isIn(['javascript', 'python', 'java', 'cpp', 'c'])
    .withMessage('Invalid language'),

  body('initial_codes')
    .optional()
    .isObject()
    .withMessage('initial_codes must be an object'),

  body('marks')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Marks must be between 1 and 100'),

  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Difficulty must be easy, medium, or hard'),
];

/**
 * Question ID validation
 */
const questionIdValidation = [
  param('id')
    .isInt()
    .withMessage('Question ID must be a number'),
];

module.exports = {
  createMCQValidation,
  createCodingValidation,
  updateQuestionValidation,
  questionIdValidation,
};