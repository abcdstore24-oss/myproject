/**
 * MonitoringController
 * Handles proctoring event logging and monitoring data retrieval
 */

const MonitoringLog = require('../models/MonitoringLog');
const TestCandidate = require('../models/TestCandidate');
const Test = require('../models/Test');
const { query } = require('../config/database');

class MonitoringController {
  /**
   * Log a proctoring event
   * @route POST /api/monitoring/log
   */
  static async logEvent(req, res) {
    try {
      const { testId, eventType, eventDescription, severity, latitude, longitude } = req.body;
      const candidateId = req.userId;

      // Get assignment
      const assignment = await TestCandidate.getAssignment(testId, candidateId);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Assignment not found',
        });
      }

      // Check if test is in progress
      if (!assignment.started_at) {
        return res.status(400).json({
          success: false,
          message: 'Test has not started yet',
        });
      }

      if (assignment.submitted_at) {
        return res.status(400).json({
          success: false,
          message: 'Test has already been submitted',
        });
      }

      // Save log
      const logId = await MonitoringLog.saveLog({
        assignment_id: assignment.assignment_id,
        event_type: eventType,
        event_description: eventDescription,
        severity: severity || 'medium',
        latitude,
        longitude,
        user_agent: req.headers['user-agent'],
        ip_address: req.ip, // ← fixed: removed deprecated req.connection.remoteAddress
      });

      // Update counters in test_candidates table
      if (eventType === 'tab_switch') {
        await TestCandidate.incrementTabSwitches(testId, candidateId);
      } else if (eventType === 'window_blur') {
        await TestCandidate.incrementWindowBlurs(testId, candidateId);
      }

      res.status(201).json({
        success: true,
        message: 'Event logged successfully',
        data: { logId },
      });
    } catch (error) {
      console.error('Log event error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to log event',
      });
    }
  }

  /**
   * Upload webcam snapshot
   * @route POST /api/monitoring/snapshot
   */
  static async uploadSnapshot(req, res) {
    try {
      const { testId } = req.body;
      const candidateId = req.userId;

      // Get assignment
      const assignment = await TestCandidate.getAssignment(testId, candidateId);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Assignment not found',
        });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No snapshot file provided',
        });
      }

      // Sanitize filename — ensure the resolved path stays within the uploads directory
      const uploadsDir = require('path').resolve(__dirname, '../../uploads/snapshots');
      const resolvedPath = require('path').resolve(uploadsDir, req.file.filename);
      if (!resolvedPath.startsWith(uploadsDir)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file path.',
        });
      }

      // Get file URL (relative path)
      const snapshotUrl = `/uploads/snapshots/${req.file.filename}`;

      // Save log with snapshot
      const logId = await MonitoringLog.saveLog({
        assignment_id: assignment.assignment_id,
        event_type: 'webcam_snapshot',
        event_description: 'Webcam snapshot captured',
        severity: 'low',
        snapshot_url: snapshotUrl,
        user_agent: req.headers['user-agent'],
        ip_address: req.ip, // ← fixed: removed deprecated req.connection.remoteAddress
      });

      res.status(201).json({
        success: true,
        message: 'Snapshot uploaded successfully',
        data: {
          logId,
          snapshotUrl,
        },
      });
    } catch (error) {
      console.error('Upload snapshot error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to upload snapshot',
      });
    }
  }

  /**
   * Get monitoring logs for an assignment
   * @route GET /api/monitoring/assignment/:assignmentId
   */
  static async getAssignmentLogs(req, res) {
    try {
      const { assignmentId } = req.params;
      const { limit = 100 } = req.query;

      // Verify user is recruiter or admin
      const assignment = await TestCandidate.getById(assignmentId);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Assignment not found',
        });
      }

      // Ownership check: recruiter can only access monitoring for their own tests
      if (req.userRole === 'recruiter') {
        const test = await Test.getById(assignment.test_id);
        if (!test || test.recruiter_id !== req.userId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You do not own this test.',
          });
        }
      }

      // Get logs
      const logs = await MonitoringLog.getLogsByAssignment(assignmentId, parseInt(limit));
      const summary = await MonitoringLog.getSummary(assignmentId);

      res.status(200).json({
        success: true,
        data: {
          logs,
          summary,
        },
      });
    } catch (error) {
      console.error('Get assignment logs error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get monitoring logs',
      });
    }
  }

  /**
   * Get monitoring data for entire test (all candidates)
   * @route GET /api/monitoring/test/:testId
   */
  static async getTestMonitoring(req, res) {
    try {
      const { testId } = req.params;

      // Ownership check: recruiters can only view their own tests
      if (req.userRole === 'recruiter') {
        const test = await Test.getById(testId);
        if (!test || test.recruiter_id !== req.userId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You do not own this test.',
          });
        }
      }

      // Get stats for all candidates
      const stats = await MonitoringLog.getTestStats(testId);
      const suspiciousLogs = await MonitoringLog.getSuspiciousLogs(testId);

      res.status(200).json({
        success: true,
        data: {
          candidates: stats,
          suspiciousLogs,
        },
      });
    } catch (error) {
      console.error('Get test monitoring error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get test monitoring data',
      });
    }
  }

  /**
   * Flag assignment as suspicious
   * @route POST /api/monitoring/flag/:assignmentId
   */
  static async flagSuspicious(req, res) {
    try {
      const { assignmentId } = req.params;
      const { notes } = req.body;

      // Update assignment
      const assignment = await TestCandidate.getById(assignmentId);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Assignment not found',
        });
      }
      if (req.userRole === 'recruiter') {
        const test = await Test.getById(assignment.test_id);
        if (!test || test.recruiter_id !== req.userId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You do not own this test.',
          });
        }
      }
      await TestCandidate.updateProctoringData(
        assignment.test_id,
        assignment.candidate_id,
        {
          is_suspicious: true,
        }
      );

      // Log the flag event
      await MonitoringLog.saveLog({
        assignment_id: assignmentId,
        event_type: 'suspicious_activity',
        event_description: notes || 'Flagged as suspicious by examiner',
        severity: 'critical',
      });

      res.status(200).json({
        success: true,
        message: 'Assignment flagged as suspicious',
      });
    } catch (error) {
      console.error('Flag suspicious error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to flag assignment',
      });
    }
  }

  /**
   * Get snapshots for assignment
   * @route GET /api/monitoring/snapshots/:assignmentId
   */
  static async getSnapshots(req, res) {
    try {
      const { assignmentId } = req.params;

      // ADD: ownership check identical to getAssignmentLogs
      const assignment = await TestCandidate.getById(assignmentId);
      if (!assignment) {
        return res.status(404).json({ success: false, message: 'Assignment not found' });
      }

      if (req.userRole === 'recruiter') {
        const test = await Test.getById(assignment.test_id);
        if (!test || test.recruiter_id !== req.userId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You do not own this test.',
          });
        }
      }
      const snapshots = await MonitoringLog.getSnapshots(assignmentId);

      res.status(200).json({
        success: true,
        data: { snapshots },
      });
    } catch (error) {
      console.error('Get snapshots error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get snapshots',
      });
    }
  }

  /**
   * Get live monitoring data (for active tests)
   * @route GET /api/monitoring/live/:testId
   */
  static async getLiveMonitoring(req, res) {
    try {
      const { testId } = req.params;

      // Get all active assignments (started but not submitted)
      const sql = `
        SELECT 
          tc.assignment_id,
          tc.candidate_id,
          u.full_name as candidate_name,
          tc.started_at,
          tc.total_tab_switches,
          tc.total_window_blurs,
          tc.is_suspicious,
          COUNT(ml.log_id) as total_events,
          MAX(ml.logged_at) as last_activity
        FROM test_candidates tc
        JOIN users u ON tc.candidate_id = u.user_id
        LEFT JOIN monitoring_logs ml ON tc.assignment_id = ml.assignment_id
        WHERE tc.test_id = ?
          AND tc.started_at IS NOT NULL
          AND tc.submitted_at IS NULL
        GROUP BY tc.assignment_id, tc.candidate_id, u.full_name, 
                 tc.started_at, tc.total_tab_switches, tc.total_window_blurs, tc.is_suspicious
        ORDER BY tc.started_at DESC
      `;

      // ← query now comes from top-level import, not inline require
      const activeCandidates = await query(sql, [testId]);

      res.status(200).json({
        success: true,
        data: { activeCandidates },
      });
    } catch (error) {
      console.error('Get live monitoring error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to get live monitoring data',
      });
    }
  }
}

module.exports = MonitoringController;