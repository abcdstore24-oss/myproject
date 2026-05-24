/**
 * Candidate Routes
 * Routes for candidate-test assignment and management
 */

const express = require('express');
const router = express.Router();

const CandidateController = require('../controllers/candidateController');
const { authenticate } = require('../middleware/authMiddleware');
const { adminOrRecruiter, candidateOnly } = require('../middleware/roleMiddleware');

// =====================================================
// RECRUITER/ADMIN ROUTES - Candidate Assignment
// =====================================================

/**
 * @route   POST /api/tests/:testId/candidates
 * @desc    Assign candidates to a test
 * @access  Admin, Recruiter (test owner)
 */
router.post(
  '/tests/:testId/candidates',
  authenticate,
  adminOrRecruiter,
  CandidateController.assignCandidates
);

/**
 * @route   GET /api/tests/:testId/candidates
 * @desc    Get all candidates assigned to a test
 * @access  Admin, Recruiter (test owner)
 */
router.get(
  '/tests/:testId/candidates',
  authenticate,
  adminOrRecruiter,
  CandidateController.getTestCandidates
);

/**
 * @route   DELETE /api/tests/:testId/candidates/:candidateId
 * @desc    Remove candidate from test
 * @access  Admin, Recruiter (test owner)
 */
router.delete(
  '/tests/:testId/candidates/:candidateId',
  authenticate,
  adminOrRecruiter,
  CandidateController.removeCandidate
);

/**
 * @route   GET /api/candidates/available
 * @desc    Get all available candidates (for assignment dropdown)
 * @access  Admin, Recruiter
 */
router.get(
  '/candidates/available',
  authenticate,
  adminOrRecruiter,
  CandidateController.getAvailableCandidates
);

// =====================================================
// CANDIDATE ROUTES - My Tests & Enrollment
// =====================================================

/**
 * @route   GET /api/candidates/my-tests
 * @desc    Get all tests assigned to current candidate
 * @access  Candidate only
 */
router.get(
  '/candidates/my-tests',
  authenticate,
  candidateOnly,
  CandidateController.getMyCandidateTests
);

/**
 * @route   GET /api/candidates/tests/:testId/enrollment
 * @desc    Get enrollment details for a specific test
 * @access  Candidate only (assigned to test)
 */
router.get(
  '/candidates/tests/:testId/enrollment',
  authenticate,
  candidateOnly,
  CandidateController.getEnrollmentDetails
);

/**
 * @route   PATCH /api/candidates/tests/:testId/invitation
 * @desc    Accept or decline test invitation
 * @access  Candidate only (assigned to test)
 */
router.patch(
  '/candidates/tests/:testId/invitation',
  authenticate,
  candidateOnly,
  CandidateController.updateInvitationStatus
);

module.exports = router;
