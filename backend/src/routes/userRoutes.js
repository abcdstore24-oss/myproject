/**
 * User Routes
 * Defines routes for user management endpoints (Admin only)
 */

const express = require('express');
const router = express.Router();

const UserController = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const { adminOnly } = require('../middleware/roleMiddleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  createUserValidation,
  updateUserValidation,
  userIdValidation,
} = require('../validators/userValidator');

// All user routes require authentication and admin role
router.use(authenticate, adminOnly);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Admin
 */
router.get('/stats', UserController.getUserStats);

/**
 * @route   GET /api/users
 * @desc    Get all users
 * @access  Admin
 */
router.get('/', UserController.getAllUsers);

/**
 * @route   GET /api/users/role/:role
 * @desc    Get users by role
 * @access  Admin
 */
router.get('/role/:role', UserController.getUsersByRole);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Admin
 */
router.get(
  '/:id',
  userIdValidation,
  validate,
  UserController.getUserById
);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Admin
 */
router.post(
  '/',
  createUserValidation,
  validate,
  UserController.createUser
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Admin
 */
router.put(
  '/:id',
  updateUserValidation,
  validate,
  UserController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Admin
 */
router.delete(
  '/:id',
  userIdValidation,
  validate,
  UserController.deleteUser
);

/**
 * @route   PATCH /api/users/:id/toggle-status
 * @desc    Toggle user active status
 * @access  Admin
 */
router.patch(
  '/:id/toggle-status',
  userIdValidation,
  validate,
  UserController.toggleUserStatus
);

module.exports = router;
