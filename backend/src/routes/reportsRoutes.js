/**
 * Reports Routes
 */

const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authenticate } = require('../middleware/authMiddleware');
const { candidateOnly, recruiterOnly, adminOrRecruiter } = require('../middleware/roleMiddleware');

// Candidate routes
router.get(
  '/candidate/:assignmentId',
  authenticate,
  candidateOnly,
  reportsController.getCandidateResult
);

// Recruiter routes
router.get(
  '/test/:testId',
  authenticate,
  recruiterOnly,
  reportsController.getTestReport
);

router.get(
  '/candidate/:assignmentId/detailed',
  authenticate,
  adminOrRecruiter,
  reportsController.getDetailedCandidateReport
);

router.get(
  '/test/:testId/analytics',
  authenticate,
  recruiterOnly,
  reportsController.getTestAnalytics
);

module.exports = router;
