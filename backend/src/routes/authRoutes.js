const express = require('express');
const router  = express.Router();

const AuthController = require('../controllers/authController');
const { authenticate, authenticateRefreshToken } = require('../middleware/authMiddleware');
const { validate }                               = require('../middleware/validationMiddleware');
const {
  registerValidation,
  registerOrgValidation,
  acceptInviteValidation,
  loginValidation,
  changePasswordValidation,
} = require('../validators/authValidator');

// Candidate self-registration
router.post('/register', registerValidation, validate, AuthController.register);

// Organization registration (creates org + org_owner in one step)
router.post('/register-org', registerOrgValidation, validate, AuthController.registerOrganization);

// Invite flow (public — no auth required)
router.get('/invite/verify', AuthController.verifyInvite);
router.post('/invite/accept', acceptInviteValidation, validate, AuthController.acceptInvite);

// Standard auth
router.post('/login',   loginValidation,   validate, AuthController.login);
router.get('/me',       authenticate,               AuthController.getCurrentUser);
router.post('/refresh', authenticateRefreshToken,   AuthController.refreshToken);
router.post('/logout',  authenticate,               AuthController.logout);
router.post('/change-password', authenticate, changePasswordValidation, validate, AuthController.changePassword);

module.exports = router;