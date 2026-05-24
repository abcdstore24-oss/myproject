/**
 * Test Validators
 * Request validation schemas for test management
 */

const { body, param } = require('express-validator');

/**
 * Create test validation rules
 */
const createTestValidation = [
  body('title')
    .notEmpty()
    .withMessage('Test title is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters')
    .trim(),
  
  body('duration_minutes')
    .isInt({ min: 1, max: 600 })
    .withMessage('Duration must be between 1 and 600 minutes'),
  
  body('start_time')
    .isISO8601()
    .withMessage('Start time must be a valid date'),
  
  body('end_time')
    .isISO8601()
    .withMessage('End time must be a valid date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.start_time)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  
  body('enable_webcam')
    .optional()
    .isBoolean()
    .withMessage('enable_webcam must be true or false'),
  
  body('enable_second_camera')
    .optional()
    .isBoolean()
    .withMessage('enable_second_camera must be true or false'),
  
  body('enable_location_tracking')
    .optional()
    .isBoolean()
    .withMessage('enable_location_tracking must be true or false'),
  
  body('max_tab_switches')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('max_tab_switches must be between 0 and 100'),
];

/**
 * Update test validation rules
 */
const updateTestValidation = [
  param('id')
    .isInt()
    .withMessage('Test ID must be a number'),
  
  body('title')
    .optional()
    .isLength({ min: 3, max: 255 })
    .withMessage('Title must be between 3 and 255 characters')
    .trim(),
  
  body('duration_minutes')
    .optional()
    .isInt({ min: 1, max: 600 })
    .withMessage('Duration must be between 1 and 600 minutes'),
  
  body('start_time')
    .optional()
    .isISO8601()
    .withMessage('Start time must be a valid date'),
  
  body('end_time')
    .optional()
    .isISO8601()
    .withMessage('End time must be a valid date'),
];

/**
 * Test ID validation
 */
const testIdValidation = [
  param('id')
    .isInt()
    .withMessage('Test ID must be a number'),
];

module.exports = {
  createTestValidation,
  updateTestValidation,
  testIdValidation,
};
