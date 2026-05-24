/**
 * Validation Middleware
 * Handles validation errors from express-validator
 */

const { validationResult } = require('express-validator');

/**
 * Validate request based on validation rules
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.path,
      message: error.msg,
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors,
    });
  }
  
  next();
};

module.exports = { validate };
