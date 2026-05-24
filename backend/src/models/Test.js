/**
 * Test Model
 *
 * FIX B-15: Removed the dual-accept field-name pattern.
 *
 * Previously, Test.create() silently accepted BOTH frontend aliases ('title',
 * 'description', 'allowed_radius', 'enable_tab_switch_detection') AND real
 * DB column names ('test_title', 'location_radius_meters', etc.) because the
 * mapping was done inside the model with no enforcement in the validator.
 * This meant two completely different payloads could produce identical DB rows
 * — making the API contract undefined.
 *
 * Resolution:
 *   - The validator (testValidator.js) enforces the FRONTEND canonical names
 *     ('title', 'description', etc.) and strips unknown fields.
 *   - Test.create() and Test.update() map those frontend names to DB column
 *     names in one explicit place (the FIELD_MAP constant below).
 *   - Callers that send DB column names directly (e.g. 'test_title') now
 *     correctly get a 400 from the validator instead of silently accepted.
 *   - Test.update() uses the same FIELD_MAP so mapping logic lives in a
 *     single constant, not scattered across create() and update().
 *
 * No schema change. No frontend change needed — frontend already sends the
 * aliases defined here as the canonical names.
 */

const { query } = require('../config/database');

// ── Single source of truth: frontend key → DB column name ─────────────────
// Only fields present in this map are accepted on create/update.
const FIELD_MAP = {
  title:                      'test_title',
  description:                'test_description',
  duration_minutes:           'duration_minutes',
  start_time:                 'start_time',
  end_time:                   'end_time',
  enable_webcam:              'enable_webcam',
  enable_second_camera:       'enable_second_camera',
  enable_location_tracking:   'enable_location_tracking',
  allowed_latitude:           'allowed_latitude',
  allowed_longitude:          'allowed_longitude',
  allowed_radius:             'location_radius_meters',
  enable_tab_switch_detection: 'enable_tab_monitoring',
  enable_window_blur_detection: 'enable_window_blur_detection',
  max_tab_switches:           'max_tab_switches',
  randomize_questions:        'randomize_questions',
  show_results_immediately:   'show_results_immediately',
  passing_percentage:         'passing_percentage',
  questions_per_candidate:    'questions_per_candidate',
  status:                     'status',
};

// Shared SELECT aliases so every query returns the same shape to callers
const SELECT_ALIASES = `
  t.*,
  t.test_title            AS title,
  t.test_description      AS description,
  t.location_radius_meters AS allowed_radius,
  t.enable_tab_monitoring  AS enable_tab_switch_detection
`;

class Test {
  /**
   * Create a new test
   * @param {object} testData — uses FRONTEND canonical keys (see FIELD_MAP)
   */
  static async create(testData) {
    const sql = `
      INSERT INTO tests (
        recruiter_id,
        test_title, test_description, duration_minutes,
        start_time, end_time,
        enable_webcam, enable_second_camera, enable_location_tracking,
        allowed_latitude, allowed_longitude, location_radius_meters,
        enable_tab_monitoring, enable_window_blur_detection, max_tab_switches,
        randomize_questions, show_results_immediately, passing_percentage,
        questions_per_candidate, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await query(sql, [
      testData.recruiter_id,
      testData.title,                                       // mapped from 'title'
      testData.description              ?? null,
      testData.duration_minutes,
      testData.start_time,
      testData.end_time,
      testData.enable_webcam            ?? true,
      testData.enable_second_camera     ?? false,
      testData.enable_location_tracking ?? false,
      testData.allowed_latitude  ? parseFloat(testData.allowed_latitude)  : null,
      testData.allowed_longitude ? parseFloat(testData.allowed_longitude) : null,
      testData.allowed_radius           ?? 1000,            // mapped from 'allowed_radius'
      testData.enable_tab_switch_detection ?? true,         // mapped from alias
      testData.enable_window_blur_detection ?? true,
      testData.max_tab_switches ? parseInt(testData.max_tab_switches, 10) : 3,
      testData.randomize_questions      ?? false,
      testData.show_results_immediately ?? false,
      testData.passing_percentage ? parseFloat(testData.passing_percentage) : 40.00,
      testData.questions_per_candidate ? parseInt(testData.questions_per_candidate, 10) : null,
      testData.status                   || 'draft',
    ]);

    return result.insertId;
  }

  /**
   * Get all tests (admin view — all recruiters)
   */
  static async getAll() {
    const sql = `
      SELECT ${SELECT_ALIASES},
             u.full_name  AS recruiter_name,
             u.email      AS recruiter_email,
             (SELECT COUNT(*) FROM questions       WHERE test_id = t.test_id) AS question_count,
             (SELECT COUNT(*) FROM test_candidates WHERE test_id = t.test_id) AS candidate_count
      FROM tests t
      LEFT JOIN users u ON t.recruiter_id = u.user_id
      ORDER BY t.created_at DESC
    `;
    return await query(sql);
  }

  /**
   * Get tests scoped to a single recruiter
   */
  static async getByRecruiter(recruiterId) {
    const sql = `
      SELECT ${SELECT_ALIASES},
             (SELECT COUNT(*) FROM questions       WHERE test_id = t.test_id) AS question_count,
             (SELECT COUNT(*) FROM test_candidates WHERE test_id = t.test_id) AS candidate_count
      FROM tests t
      WHERE t.recruiter_id = ?
      ORDER BY t.created_at DESC
    `;
    return await query(sql, [recruiterId]);
  }

  /**
   * Get single test by ID
   */
  static async getById(testId) {
    const sql = `
      SELECT ${SELECT_ALIASES},
             u.full_name  AS recruiter_name,
             u.email      AS recruiter_email,
             (SELECT COUNT(*) FROM questions       WHERE test_id = t.test_id) AS question_count,
             (SELECT COUNT(*) FROM test_candidates WHERE test_id = t.test_id) AS candidate_count
      FROM tests t
      LEFT JOIN users u ON t.recruiter_id = u.user_id
      WHERE t.test_id = ?
    `;
    const rows = await query(sql, [testId]);
    return rows[0] || null;
  }

  /**
   * Update test
   * FIX B-15: Uses FIELD_MAP — only frontend canonical keys are accepted.
   * Sending 'test_title' directly now produces no update (unknown key).
   * The validator enforces 'title' as the only valid key.
   */
  static async update(testId, testData) {
    const updates = [];
    const values  = [];

    // INT/DECIMAL columns that must never receive an empty string — coerce to null
    const NULLABLE_FIELDS = new Set([
      'questions_per_candidate',
      'allowed_latitude',
      'allowed_longitude',
    ]);

    Object.keys(testData).forEach((frontendKey) => {
      const dbColumn = FIELD_MAP[frontendKey];
      if (!dbColumn) return; // Unknown keys silently ignored

      let value = testData[frontendKey];

      // Coerce empty string → null for nullable numeric columns
      if (NULLABLE_FIELDS.has(frontendKey) && value === '') {
        value = null;
      }

      updates.push(`${dbColumn} = ?`);
      values.push(value);
    });

    if (updates.length === 0) return false;

    values.push(testId);
    const result = await query(
      `UPDATE tests SET ${updates.join(', ')} WHERE test_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  /**
   * Delete test (cascades to questions, candidates, answers, logs via FK)
   */
  static async delete(testId) {
    const result = await query('DELETE FROM tests WHERE test_id = ?', [testId]);
    return result.affectedRows > 0;
  }

  /**
   * Get aggregate statistics
   */
  static async getStats(recruiterId = null) {
    let sql = `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'draft'     THEN 1 ELSE 0 END) AS draft,
        SUM(CASE WHEN status = 'scheduled' THEN 1 ELSE 0 END) AS scheduled,
        SUM(CASE WHEN status = 'active'    THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
      FROM tests
    `;
    const params = [];
    if (recruiterId) {
      sql += ' WHERE recruiter_id = ?';
      params.push(recruiterId);
    }
    const result = await query(sql, params);
    return result[0];
  }

  /**
   * Verify a test belongs to a given recruiter (used for ownership checks)
   */
  static async belongsToRecruiter(testId, recruiterId) {
    const rows = await query(
      'SELECT test_id FROM tests WHERE test_id = ? AND recruiter_id = ?',
      [testId, recruiterId]
    );
    return rows.length > 0;
  }

  /**
   * Publish test — transition draft → scheduled
   */
  static async publish(testId) {
    const result = await query(
      "UPDATE tests SET status = 'scheduled' WHERE test_id = ?",
      [testId]
    );
    return result.affectedRows > 0;
  }

  /**
   * Recalculate and persist total_marks from the questions table
   */
  static async updateTotalMarks(testId) {
    const rows = await query(
      'SELECT COALESCE(SUM(marks), 0) AS total FROM questions WHERE test_id = ?',
      [testId]
    );
    const total = rows[0].total;
    await query('UPDATE tests SET total_marks = ? WHERE test_id = ?', [total, testId]);
    return total;
  }

  /**
   * Get question count (lightweight, no JOIN)
   */
  static async getQuestionCount(testId) {
    const rows = await query(
      'SELECT COUNT(*) AS count FROM questions WHERE test_id = ?',
      [testId]
    );
    return rows[0].count;
  }
}

module.exports = Test;