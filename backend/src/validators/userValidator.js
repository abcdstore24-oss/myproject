/**
 * User Validators
 * Request validation schemas for user management
 */

const { body, param } = require('express-validator');

/**
 * Create user validation rules
 */
const createUserValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  
  body('full_name')
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be between 2 and 255 characters')
    .trim(),
  
  body('role')
    .isIn(['admin', 'org_owner', 'recruiter', 'candidate'])
    .withMessage('Role must be admin, org_owner, recruiter, or candidate'),
  
  body('phone')
    .optional({ checkFalsy: true })
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 digits'),
  
  body('organization')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Organization name must not exceed 255 characters')
    .trim(),
];

/**
 * Update user validation rules
 */
const updateUserValidation = [
  param('id')
    .isInt()
    .withMessage('User ID must be a number'),
  
  body('full_name')
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage('Full name must be between 2 and 255 characters')
    .trim(),
  
  body('phone')
    .optional({ checkFalsy: true })
    .isLength({ min: 10, max: 15 })
    .withMessage('Phone number must be between 10 and 15 digits'),
  
  body('organization')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Organization name must not exceed 255 characters')
    .trim(),
  
  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be true or false'),
];

/**
 * User ID validation
 */
const userIdValidation = [
  param('id')
    .isInt()
    .withMessage('User ID must be a number'),
];

module.exports = {
  createUserValidation,
  updateUserValidation,
  userIdValidation,
};