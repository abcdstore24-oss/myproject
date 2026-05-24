/**
 * Exam Routes - UPDATED
 * Added answer submission and test submission routes
 */

const express = require('express');
const router = express.Router();

const ExamController = require('../controllers/examController');
const { authenticate } = require('../middleware/authMiddleware');
const { candidateOnly } = require('../middleware/roleMiddleware');

// All exam routes require authentication and candidate role
router.use(authenticate, candidateOnly);

/**
 * @route   POST /api/exam/verify-requirements
 * @desc    Verify all pre-exam requirements
 * @access  Candidate only
 */
router.post('/verify-requirements', ExamController.verifyRequirements);

/**
 * @route   POST /api/exam/verify-webcam
 * @desc    Update webcam verification status
 * @access  Candidate only
 */
router.post('/verify-webcam', ExamController.verifyWebcam);

/**
 * @route   POST /api/exam/verify-location
 * @desc    Verify candidate location
 * @access  Candidate only
 */
router.post('/verify-location', ExamController.verifyLocation);

/**
 * @route   POST /api/exam/verify-second-camera
 * @desc    Update second camera verification status
 * @access  Candidate only
 */
router.post('/verify-second-camera', ExamController.verifySecondCamera);

/**
 * @route   POST /api/exam/start
 * @desc    Start test (record start time and get questions)
 * @access  Candidate only
 */
router.post('/start', ExamController.startTest);

/**
 * @route   GET /api/exam/:testId/session
 * @desc    Get exam session data (for resume)
 * @access  Candidate only
 */
router.get('/:testId/session', ExamController.getExamSession);

/**
 * ✅ NEW
 * @route   POST /api/exam/save-answer
 * @desc    Save/update answer (auto-save)
 * @access  Candidate only
 */
router.post('/save-answer', ExamController.saveAnswer);

/**
 * ✅ NEW
 * @route   POST /api/exam/submit
 * @desc    Submit test and evaluate answers
 * @access  Candidate only
 */
router.post('/submit', ExamController.submitTest);

/**
 * @route   GET /api/exam/mobile-camera-token/:testId
 * @desc    Generate QR token for mobile second camera
 * @access  Candidate only
 */
router.get('/mobile-camera-token/:testId', ExamController.generateMobileCameraToken);

module.exports = router;
