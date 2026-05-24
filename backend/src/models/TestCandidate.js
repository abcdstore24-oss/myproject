/**
 * TestCandidate Model
 */

const { query } = require('../config/database');

class TestCandidate {
  /**
   * Assign multiple candidates to a test
   */
  static async assignCandidates(testId, candidateIds) {
    let assigned = 0;
    let skipped = 0;

    for (const candidateId of candidateIds) {
      try {
        const existing = await this.getAssignment(testId, candidateId);
        
        if (existing) {
          skipped++;
          continue;
        }

        const sql = `
          INSERT INTO test_candidates (test_id, candidate_id, invitation_status)
          VALUES (?, ?, 'pending')
        `;
        await query(sql, [testId, candidateId]);
        assigned++;
      } catch (error) {
        console.error(`Error assigning candidate ${candidateId}:`, error.message);
        skipped++;
      }
    }

    return { assigned, skipped };
  }

  /**
   * Get assignment details
   */
  static async getAssignment(testId, candidateId) {
    const sql = `
      SELECT * FROM test_candidates
      WHERE test_id = ? AND candidate_id = ?
    `;
    const results = await query(sql, [testId, candidateId]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get all candidates assigned to a test (with user details)
   */
  static async getCandidatesByTest(testId) {
    const sql = `
      SELECT 
        tc.*,
        u.full_name,
        u.email,
        u.phone
      FROM test_candidates tc
      JOIN users u ON tc.candidate_id = u.user_id
      WHERE tc.test_id = ?
      ORDER BY tc.invited_at DESC
    `;
    return await query(sql, [testId]);
  }

  /**
   * ✅ CORRECTLY FIXED: Get all tests assigned to a candidate
   * Shows all tests: scheduled, active, AND completed (so candidate can view results)
   * Excludes draft and cancelled tests only
   */
  static async getTestsByCandidate(candidateId) {
    const sql = `
      SELECT 
        tc.*,
        t.test_title,
        t.test_description,
        t.duration_minutes,
        t.total_marks,
        t.start_time,
        t.end_time,
        t.status as test_status,
        t.show_results_immediately,
        t.passing_percentage,
        u.full_name as recruiter_name,
        o.name as recruiter_organization
      FROM test_candidates tc
      JOIN tests t ON tc.test_id = t.test_id
      JOIN users u ON t.recruiter_id = u.user_id
      LEFT JOIN organizations o ON u.org_id = o.org_id
      WHERE tc.candidate_id = ?
        AND t.status IN ('scheduled', 'active', 'completed')
      ORDER BY t.start_time DESC
    `;
    return await query(sql, [candidateId]);
  }

  /**
   * Remove candidate from test
   */
  static async removeCandidate(testId, candidateId) {
    const sql = `
      DELETE FROM test_candidates
      WHERE test_id = ? AND candidate_id = ?
    `;
    const result = await query(sql, [testId, candidateId]);
    return result.affectedRows > 0;
  }

  /**
   * Update invitation status
   */
  static async updateInvitationStatus(testId, candidateId, status) {
    const sql = `
      UPDATE test_candidates
      SET invitation_status = ?
      WHERE test_id = ? AND candidate_id = ?
    `;
    const result = await query(sql, [status, testId, candidateId]);
    return result.affectedRows > 0;
  }

  /**
   * Start test (record start time)
   */
  static async startTest(testId, candidateId) {
    const sql = `
      UPDATE test_candidates
      SET started_at = NOW()
      WHERE test_id = ? AND candidate_id = ? AND started_at IS NULL
    `;
    const result = await query(sql, [testId, candidateId]);
    return result.affectedRows > 0;
  }

  /**
   * Submit test (record submission time and calculate time taken)
   */
  static async submitTest(testId, candidateId) {
    const sql = `
      UPDATE test_candidates
      SET 
        submitted_at = NOW(),
        time_taken_minutes = TIMESTAMPDIFF(MINUTE, started_at, NOW())
      WHERE test_id = ? AND candidate_id = ?
    `;
    const result = await query(sql, [testId, candidateId]);
    return result.affectedRows > 0;
  }

  /**
   * Update test score and result
   */
  static async updateScore(testId, candidateId, score, totalMarks) {
    const percentage = (score / totalMarks) * 100;
    
    // COALESCE ensures NULL passing_percentage defaults to 40
    // Without it, MySQL evaluates `100 >= NULL` as NULL (not true) → always sets 'fail'
    const sql = `
      UPDATE test_candidates
      SET 
        score = ?,
        percentage = ?,
        result_status = CASE
          WHEN ? >= (SELECT COALESCE(passing_percentage, 40) FROM tests WHERE test_id = ?) THEN 'pass'
          ELSE 'fail'
        END
      WHERE test_id = ? AND candidate_id = ?
    `;
    const result = await query(sql, [
      score, 
      percentage, 
      percentage, 
      testId, 
      testId, 
      candidateId
    ]);
    return result.affectedRows > 0;
  }

  /**
   * Update proctoring data
   */
  static async updateProctoringData(testId, candidateId, data) {
    const updates = [];
    const values = [];

    if (data.total_tab_switches !== undefined) {
      updates.push('total_tab_switches = ?');
      values.push(data.total_tab_switches);
    }
    if (data.total_window_blurs !== undefined) {
      updates.push('total_window_blurs = ?');
      values.push(data.total_window_blurs);
    }
    if (data.location_verified !== undefined) {
      updates.push('location_verified = ?');
      values.push(data.location_verified);
    }
    if (data.webcam_verified !== undefined) {
      updates.push('webcam_verified = ?');
      values.push(data.webcam_verified);
    }
    if (data.second_camera_verified !== undefined) {
      updates.push('second_camera_verified = ?');
      values.push(data.second_camera_verified);
    }
    if (data.is_suspicious !== undefined) {
      updates.push('is_suspicious = ?');
      values.push(data.is_suspicious);
    }

    if (updates.length === 0) return false;

    values.push(testId, candidateId);
    const sql = `
      UPDATE test_candidates
      SET ${updates.join(', ')}
      WHERE test_id = ? AND candidate_id = ?
    `;
    
    const result = await query(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * Increment tab switch count
   */
  static async incrementTabSwitches(testId, candidateId) {
    const sql = `
      UPDATE test_candidates
      SET total_tab_switches = total_tab_switches + 1
      WHERE test_id = ? AND candidate_id = ?
    `;
    await query(sql, [testId, candidateId]);
  }

  /**
   * Increment window blur count
   */
  static async incrementWindowBlurs(testId, candidateId) {
    const sql = `
      UPDATE test_candidates
      SET total_window_blurs = total_window_blurs + 1
      WHERE test_id = ? AND candidate_id = ?
    `;
    await query(sql, [testId, candidateId]);
  }

  /**
   * Get assignment by ID
   */
  static async getById(assignmentId) {
    const sql = 'SELECT * FROM test_candidates WHERE assignment_id = ?';
    const results = await query(sql, [assignmentId]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get statistics for a test
   */
  static async getTestStats(testId) {
    const sql = `
      SELECT 
        COUNT(*) as total_candidates,
        SUM(CASE WHEN invitation_status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN invitation_status = 'declined' THEN 1 ELSE 0 END) as declined,
        SUM(CASE WHEN invitation_status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN started_at IS NOT NULL THEN 1 ELSE 0 END) as started,
        SUM(CASE WHEN submitted_at IS NOT NULL THEN 1 ELSE 0 END) as submitted,
        AVG(CASE WHEN percentage IS NOT NULL THEN percentage ELSE NULL END) as avg_percentage
      FROM test_candidates
      WHERE test_id = ?
    `;
    const results = await query(sql, [testId]);
    return results[0];
  }
}

module.exports = TestCandidate;