/**
 * Section Routes
 *
 * FIX B-11 (CORRECTED): Reverted to the original working mount structure.
 * The previous B-11 output changed the nested router path from
 * '/:testId/sections' to just '/sections', which broke the route because
 * app.js mounts the nested router at '/api/tests' (not '/api/tests/:testId').
 *
 * The ONLY real issue in the original was confusing documentation — not
 * broken functionality. Fixed by:
 *   1. Keeping the original route pattern: nested.get('/:testId/sections', ...)
 *   2. Keeping app.js mount at: app.use('/api/tests', sectionRoutes.nested)
 *   3. Adding clear comments explaining how mergeParams works here.
 *
 * How the routing actually works:
 *   app.use('/api/tests', nested)    → base prefix = /api/tests
 *   nested.get('/:testId/sections')  → :testId is the nested router's own param
 *   mergeParams: true                → makes :testId accessible via req.params.testId
 *   Final URL: GET /api/tests/:testId/sections  ✓
 *
 * Also fixes CRLF line endings (B-19) — original file had \r\n.
 */

const express = require('express');
const { authenticate }     = require('../middleware/authMiddleware');
const { adminOrRecruiter } = require('../middleware/roleMiddleware');
const SectionController    = require('../controllers/sectionController');

// ── Nested router — mounted at /api/tests in app.js ──────────────────────
// mergeParams:true is set for forward-compatibility but :testId comes from
// this router's own /:testId segment, not from a parent param.
// Final paths: GET/POST /api/tests/:testId/sections
const nested = express.Router({ mergeParams: true });
nested.use(authenticate, adminOrRecruiter);

/**
 * @route   GET /api/tests/:testId/sections
 * @desc    Get all sections for a test
 * @access  Admin, Recruiter (own tests)
 */
nested.get('/:testId/sections', SectionController.getSections);

/**
 * @route   POST /api/tests/:testId/sections
 * @desc    Create a section inside a test
 * @access  Admin, Recruiter (own tests)
 */
nested.post('/:testId/sections', SectionController.createSection);

// ── Standalone router — mounted at /api/sections in app.js ───────────────
// sectionId alone is sufficient to locate the section for update/delete.
// Final paths: PUT/DELETE /api/sections/:sectionId
const standalone = express.Router();
standalone.use(authenticate, adminOrRecruiter);

/**
 * @route   PUT /api/sections/:sectionId
 * @desc    Update a section
 * @access  Admin, Recruiter (own tests)
 */
standalone.put('/:sectionId', SectionController.updateSection);

/**
 * @route   DELETE /api/sections/:sectionId
 * @desc    Delete a section
 * @access  Admin, Recruiter (own tests)
 */
standalone.delete('/:sectionId', SectionController.deleteSection);

module.exports = { nested, standalone };