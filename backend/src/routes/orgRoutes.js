/**
 * Organization Routes
 *
 * FIX B-10: POST /api/org/invite now uses emailValidation from authValidator.js.
 * Previously the invite route had NO input validation — an org_owner could POST
 * a malformed email string and it would only fail later at the DB/SMTP layer
 * with a cryptic error. The validator catches it immediately with a clean 400.
 */

const express = require('express');
const router  = express.Router();

const OrgController = require('../controllers/orgController');
const { authenticate }  = require('../middleware/authMiddleware');
const { orgOwnerOnly }  = require('../middleware/roleMiddleware');
const { validate }      = require('../middleware/validationMiddleware');
const { emailValidation } = require('../validators/authValidator'); // FIX B-10

// All org routes require auth + org_owner role
router.use(authenticate, orgOwnerOnly);

/**
 * @route   GET /api/org/me
 * @desc    Get current org's details
 * @access  Org Owner
 */
router.get('/me', OrgController.getMyOrg);

/**
 * @route   GET /api/org/team
 * @desc    Get all recruiters in the org
 * @access  Org Owner
 */
router.get('/team', OrgController.getTeam);

/**
 * @route   POST /api/org/invite
 * @desc    Invite a recruiter by email
 * @access  Org Owner
 * FIX B-10: emailValidation added — validates + normalises the email field
 *           before it reaches the controller.
 */
router.post(
  '/invite',
  emailValidation,
  validate,
  OrgController.inviteRecruiter
);

/**
 * @route   DELETE /api/org/team/:userId
 * @desc    Remove a recruiter from the org
 * @access  Org Owner
 */
router.delete('/team/:userId', OrgController.removeRecruiter);

module.exports = router;