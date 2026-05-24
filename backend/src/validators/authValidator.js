/**
 * Auth Validators
 *
 * FIX B-10: emailValidation was defined and exported but imported by zero
 * route files — pure dead code. It is now wired into the POST /api/org/invite
 * route in orgRoutes.js (the most natural home: inviting a recruiter by email).
 * The export is kept because it is now actively used.
 *
 * No logic changes to any other validator.
 */

const { body } = require('express-validator');

// ── Shared helpers ────────────────────────────────────────────────────────────
const passwordRules = (field) => [
  body(field)
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body(field)
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter'),
  body(field)
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter'),
  body(field)
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
  body(field)
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage('Password must contain at least one special character'),
];

const phoneRule = body('phone')
  .optional({ checkFalsy: true })
  .isLength({ min: 10, max: 15 })
  .withMessage('Phone must be 10–15 digits')
  .matches(/^[0-9+\-\s()]+$/)
  .withMessage('Phone can only contain numbers, +, -, spaces, and ()');

// ── Candidate self-registration ───────────────────────────────────────────────
const registerValidation = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail().trim(),
  body('full_name').notEmpty().withMessage('Full name is required').trim(),
  ...passwordRules('password'),
  phoneRule,
];

// ── Organization registration ─────────────────────────────────────────────────
const registerOrgValidation = [
  body('org_name').notEmpty().withMessage('Organization name is required').trim(),
  body('org_type')
    .isIn(['company', 'college', 'school', 'other'])
    .withMessage('Organization type must be company, college, school, or other'),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail().trim(),
  body('full_name').notEmpty().withMessage('Your full name is required').trim(),
  ...passwordRules('password'),
  phoneRule,
];

// ── Invite accept ─────────────────────────────────────────────────────────────
const acceptInviteValidation = [
  body('token').notEmpty().withMessage('Invitation token is required'),
  body('full_name').notEmpty().withMessage('Full name is required').trim(),
  ...passwordRules('password'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  }),
  phoneRule,
];

// ── Login ─────────────────────────────────────────────────────────────────────
const loginValidation = [
  body('email').isEmail().withMessage('Valid email required').normalizeEmail().trim(),
  body('password').notEmpty().withMessage('Password is required'),
];

// ── Change password ───────────────────────────────────────────────────────────
const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  ...passwordRules('newPassword'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) throw new Error('Passwords do not match');
    return true;
  }),
];

// ── Email-only validation ─────────────────────────────────────────────────────
// FIX B-10: Now actively used in POST /api/org/invite (see orgRoutes.js).
// Validates that the `email` body field is a properly formatted email address.
const emailValidation = [
  body('email')
    .isEmail()
    .withMessage('Valid email required')
    .normalizeEmail()
    .trim(),
];

module.exports = {
  registerValidation,
  registerOrgValidation,
  acceptInviteValidation,
  loginValidation,
  changePasswordValidation,
  emailValidation, // ← now used by orgRoutes.js /invite
};