/**
 * Test Routes
 *
 * FIX B-08: Removed only the duplicate candidate assignment routes
 * (POST/GET /api/tests/:testId/candidates) which are already owned by
 * candidateRoutes.js mounted at /api.
 *
 * GET /:testId/questions is KEPT HERE — it is the sole handler for
 * /api/tests/:testId/questions used by TestQuestions.jsx.
 * questionRoutes.js only has /api/questions/:id, /mcq, /coding — it does
 * NOT have a /:testId/questions route.
 */

const express = require('express');
const router = express.Router();

const TestController      = require('../controllers/testController');
const QuestionController  = require('../controllers/questionController');
const { authenticate }    = require('../middleware/authMiddleware');
const { adminOrRecruiter } = require('../middleware/roleMiddleware');
const { validate }        = require('../middleware/validationMiddleware');
const {
  createTestValidation,
  updateTestValidation,
  testIdValidation,
} = require('../validators/testValidator');

// All test routes require authentication and admin/recruiter role
router.use(authenticate, adminOrRecruiter);

/**
 * @route   GET /api/tests/stats
 * @desc    Get test statistics
 * @access  Admin, Recruiter
 */
router.get('/stats', TestController.getTestStats);

/**
 * @route   GET /api/tests
 * @desc    Get all tests (admin: all, recruiter: own tests)
 * @access  Admin, Recruiter
 */
router.get('/', TestController.getAllTests);

/**
 * @route   GET /api/tests/:id
 * @desc    Get test by ID
 * @access  Admin, Recruiter (own tests)
 */
router.get('/:id', testIdValidation, validate, TestController.getTestById);

/**
 * @route   POST /api/tests
 * @desc    Create new test
 * @access  Admin, Recruiter
 */
router.post('/', createTestValidation, validate, TestController.createTest);

/**
 * @route   PUT /api/tests/:id
 * @desc    Update test
 * @access  Admin, Recruiter (own tests)
 */
router.put('/:id', updateTestValidation, validate, TestController.updateTest);

/**
 * @route   DELETE /api/tests/:id
 * @desc    Delete test
 * @access  Admin, Recruiter (own tests)
 */
router.delete('/:id', testIdValidation, validate, TestController.deleteTest);

/**
 * @route   PATCH /api/tests/:id/publish
 * @desc    Publish test (change status to scheduled)
 * @access  Admin, Recruiter (own tests)
 */
router.patch('/:id/publish', testIdValidation, validate, TestController.publishTest);

/**
 * @route   GET /api/tests/:testId/questions
 * @desc    Get all questions for a test (used by TestQuestions.jsx)
 * @access  Admin, Recruiter (own tests)
 *
 * NOTE: This route MUST stay here. questionRoutes.js does NOT handle this
 * path — it only handles /api/questions/:id, /mcq, and /coding.
 */
router.get('/:testId/questions', QuestionController.getQuestions);

// NOTE: /:testId/candidates routes are intentionally NOT here.
// They are owned by candidateRoutes.js mounted at /api.

module.exports = router;