/**
 * MonitoringRoutes
 * Routes for proctoring and monitoring
 */

const express = require('express');
const router = express.Router();
const MonitoringController = require('../controllers/monitoringController');
const { authenticate } = require('../middleware/authMiddleware');  // ← FIXED
const { candidateOnly, adminOrRecruiter } = require('../middleware/roleMiddleware');  // ← FIXED
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads/snapshots');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for snapshot uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `snapshot-${uniqueSuffix}.jpg`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  }
});

/**
 * @route   POST /api/monitoring/log
 * @desc    Log a proctoring event
 * @access  Private (Candidate)
 */
router.post(
  '/log',
  authenticate,  // ← FIXED
  candidateOnly,
  MonitoringController.logEvent
);

/**
 * @route   POST /api/monitoring/snapshot
 * @desc    Upload webcam snapshot
 * @access  Private (Candidate)
 */
router.post(
  '/snapshot',
  authenticate,  // ← FIXED
  candidateOnly,
  upload.single('snapshot'),
  MonitoringController.uploadSnapshot
);

/**
 * @route   GET /api/monitoring/assignment/:assignmentId
 * @desc    Get monitoring logs for an assignment
 * @access  Private (Recruiter, Admin)
 */
router.get(
  '/assignment/:assignmentId',
  authenticate,  // ← FIXED
  adminOrRecruiter,
  MonitoringController.getAssignmentLogs
);

/**
 * @route   GET /api/monitoring/test/:testId
 * @desc    Get monitoring data for entire test
 * @access  Private (Recruiter, Admin)
 */
router.get(
  '/test/:testId',
  authenticate,  // ← FIXED
  adminOrRecruiter,
  MonitoringController.getTestMonitoring
);

/**
 * @route   GET /api/monitoring/live/:testId
 * @desc    Get live monitoring data (active candidates)
 * @access  Private (Recruiter, Admin)
 */
router.get(
  '/live/:testId',
  authenticate,  // ← FIXED
  adminOrRecruiter,
  MonitoringController.getLiveMonitoring
);

/**
 * @route   POST /api/monitoring/flag/:assignmentId
 * @desc    Flag assignment as suspicious
 * @access  Private (Recruiter, Admin)
 */
router.post(
  '/flag/:assignmentId',
  authenticate,  // ← FIXED
  adminOrRecruiter,
  MonitoringController.flagSuspicious
);

/**
 * @route   GET /api/monitoring/snapshots/:assignmentId
 * @desc    Get all snapshots for assignment
 * @access  Private (Recruiter, Admin)
 */
router.get(
  '/snapshots/:assignmentId',
  authenticate,  // ← FIXED
  adminOrRecruiter,
  MonitoringController.getSnapshots
);

module.exports = router;