/**
 * executionRoutes.js
 * Code execution routes — candidate only
 */

const express = require('express');
const router = express.Router();
const { runCode, gradeCode } = require('../controllers/executionController');
const { authenticate } = require('../middleware/authMiddleware');
const { candidateOnly } = require('../middleware/roleMiddleware');

// All execution routes require authentication + candidate role
router.use(authenticate, candidateOnly);

/**
 * @route  POST /api/execution/run
 * @desc   Run code against visible test cases ("Run Code" button)
 * @access Candidate only
 */
router.post('/run', runCode);

/**
 * @route  POST /api/execution/grade
 * @desc   Run code against ALL test cases and update marks
 * @access Candidate only
 */
router.post('/grade', gradeCode);

module.exports = router;
