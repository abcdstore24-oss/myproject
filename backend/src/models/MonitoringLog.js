/**
 * MonitoringLog Model
 * Handles all proctoring event logging
 */

const { query } = require('../config/database');

class MonitoringLog {
  /**
   * Save a monitoring event
   */
  static async saveLog(logData) {
    const {
      assignment_id,
      event_type,
      event_description,
      severity = 'medium',
      snapshot_url,
      latitude,
      longitude,
      user_agent,
      ip_address,
    } = logData;

    const sql = `
      INSERT INTO monitoring_logs (
        assignment_id,
        event_type,
        event_description,
        severity,
        snapshot_url,
        latitude,
        longitude,
        user_agent,
        ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      assignment_id,
      event_type,
      event_description || null,
      severity,
      snapshot_url || null,
      latitude || null,
      longitude || null,
      user_agent || null,
      ip_address || null,
    ]);

    return result.insertId;
  }

  /**
   * Get all logs for an assignment
   */
  static async getLogsByAssignment(assignmentId, limit = 100) {
    const sql = `
      SELECT 
        log_id,
        assignment_id,
        event_type,
        event_description,
        severity,
        snapshot_url,
        latitude,
        longitude,
        logged_at
      FROM monitoring_logs
      WHERE assignment_id = ?
      ORDER BY logged_at DESC
      LIMIT ?
    `;

    return await query(sql, [assignmentId, limit]);
  }

  /**
   * Get recent logs (last N minutes)
   */
  static async getRecentLogs(assignmentId, minutes = 5) {
    const sql = `
      SELECT 
        log_id,
        assignment_id,
        event_type,
        event_description,
        severity,
        snapshot_url,
        logged_at
      FROM monitoring_logs
      WHERE assignment_id = ?
        AND logged_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
      ORDER BY logged_at DESC
    `;

    return await query(sql, [assignmentId, minutes]);
  }

  /**
   * Get logs by event type
   */
  static async getLogsByEventType(assignmentId, eventType) {
    const sql = `
      SELECT 
        log_id,
        event_type,
        event_description,
        severity,
        snapshot_url,
        logged_at
      FROM monitoring_logs
      WHERE assignment_id = ? AND event_type = ?
      ORDER BY logged_at DESC
    `;

    return await query(sql, [assignmentId, eventType]);
  }

  /**
   * Get event count by type
   */
  static async getEventCount(assignmentId, eventType) {
    const sql = `
      SELECT COUNT(*) as count
      FROM monitoring_logs
      WHERE assignment_id = ? AND event_type = ?
    `;

    const result = await query(sql, [assignmentId, eventType]);
    return result[0].count;
  }

  /**
   * Get suspicious logs (high/critical severity)
   */
  static async getSuspiciousLogs(testId) {
    const sql = `
      SELECT 
        ml.log_id,
        ml.assignment_id,
        ml.event_type,
        ml.event_description,
        ml.severity,
        ml.snapshot_url,
        ml.logged_at,
        tc.candidate_id,
        u.full_name as candidate_name
      FROM monitoring_logs ml
      JOIN test_candidates tc ON ml.assignment_id = tc.assignment_id
      JOIN users u ON tc.candidate_id = u.user_id
      WHERE tc.test_id = ?
        AND ml.severity IN ('high', 'critical')
      ORDER BY ml.logged_at DESC
    `;

    return await query(sql, [testId]);
  }

  /**
   * Get monitoring summary for assignment
   */
  static async getSummary(assignmentId) {
    const sql = `
      SELECT 
        event_type,
        COUNT(*) as count,
        MAX(logged_at) as last_occurrence
      FROM monitoring_logs
      WHERE assignment_id = ?
      GROUP BY event_type
    `;

    return await query(sql, [assignmentId]);
  }

  /**
   * Get all snapshots for assignment
   */
  static async getSnapshots(assignmentId) {
    const sql = `
      SELECT 
        log_id,
        snapshot_url,
        logged_at
      FROM monitoring_logs
      WHERE assignment_id = ?
        AND event_type = 'webcam_snapshot'
        AND snapshot_url IS NOT NULL
      ORDER BY logged_at DESC
    `;

    return await query(sql, [assignmentId]);
  }

  /**
   * Get monitoring stats for test (all candidates)
   */
  static async getTestStats(testId) {
    const sql = `
      SELECT 
        tc.assignment_id,
        tc.candidate_id,
        u.full_name as candidate_name,
        COUNT(ml.log_id) as total_events,
        SUM(CASE WHEN ml.event_type = 'tab_switch' THEN 1 ELSE 0 END) as tab_switches,
        SUM(CASE WHEN ml.event_type = 'window_blur' THEN 1 ELSE 0 END) as window_blurs,
        SUM(CASE WHEN ml.event_type = 'copy_attempt' THEN 1 ELSE 0 END) as copy_attempts,
        SUM(CASE WHEN ml.event_type = 'paste_attempt' THEN 1 ELSE 0 END) as paste_attempts,
        SUM(CASE WHEN ml.severity IN ('high', 'critical') THEN 1 ELSE 0 END) as critical_events,
        MAX(ml.logged_at) as last_activity
      FROM test_candidates tc
      JOIN users u ON tc.candidate_id = u.user_id
      LEFT JOIN monitoring_logs ml ON tc.assignment_id = ml.assignment_id
      WHERE tc.test_id = ?
        AND tc.started_at IS NOT NULL
      GROUP BY tc.assignment_id, tc.candidate_id, u.full_name
      ORDER BY critical_events DESC, total_events DESC
    `;

    return await query(sql, [testId]);
  }

  /**
   * Delete logs by assignment (cleanup)
   */
  static async deleteByAssignment(assignmentId) {
    const sql = 'DELETE FROM monitoring_logs WHERE assignment_id = ?';
    const result = await query(sql, [assignmentId]);
    return result.affectedRows;
  }

  /**
   * Get location history for assignment
   */
  static async getLocationHistory(assignmentId) {
    const sql = `
      SELECT 
        log_id,
        latitude,
        longitude,
        logged_at
      FROM monitoring_logs
      WHERE assignment_id = ?
        AND event_type = 'location_check'
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
      ORDER BY logged_at ASC
    `;

    return await query(sql, [assignmentId]);
  }
}

module.exports = MonitoringLog;
