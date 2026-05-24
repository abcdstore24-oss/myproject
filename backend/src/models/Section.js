/**
 * Section Model
 * DB operations for the sections table.
 * Sections are optional — a test with no rows in this table
 * behaves exactly like the original flat question list.
 */

const { query } = require('../config/database');

class Section {
  /**
   * Create a new section for a test
   */
  static async create(testId, { title, description, order_number, questions_to_pick, time_limit_minutes }) {
    // Auto-assign order_number after last existing section if not provided
    if (!order_number) {
      const maxRes = await query(
        'SELECT COALESCE(MAX(order_number), 0) + 1 AS next_order FROM sections WHERE test_id = ?',
        [testId]
      );
      order_number = maxRes[0].next_order;
    }

    const sql = `
      INSERT INTO sections (test_id, title, description, order_number, questions_to_pick, time_limit_minutes)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await query(sql, [
      testId,
      title,
      description || null,
      order_number,
      questions_to_pick || null,
      time_limit_minutes || null,
    ]);
    return result.insertId;
  }

  /**
   * Get all sections for a test (ordered), with question counts
   */
  static async getByTest(testId) {
    const sql = `
      SELECT
        s.*,
        COUNT(q.question_id) AS question_count,
        SUM(q.marks)         AS total_marks
      FROM sections s
      LEFT JOIN questions q ON q.section_id = s.section_id
      WHERE s.test_id = ?
      GROUP BY s.section_id
      ORDER BY s.order_number ASC
    `;
    return await query(sql, [testId]);
  }

  /**
   * Get a single section by ID
   */
  static async getById(sectionId) {
    const sql = 'SELECT * FROM sections WHERE section_id = ?';
    const rows = await query(sql, [sectionId]);
    return rows[0] || null;
  }

  /**
   * Update a section
   */
  static async update(sectionId, data) {
    const allowed = ['title', 'description', 'order_number', 'questions_to_pick', 'time_limit_minutes'];
    const updates = [];
    const values = [];

    Object.keys(data).forEach(key => {
      if (allowed.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(data[key] === '' ? null : data[key]);
      }
    });

    if (updates.length === 0) return false;

    values.push(sectionId);
    const result = await query(
      `UPDATE sections SET ${updates.join(', ')} WHERE section_id = ?`,
      values
    );
    return result.affectedRows > 0;
  }

  /**
   * Delete a section (questions in this section get section_id set to NULL via FK)
   */
  static async delete(sectionId) {
    const result = await query('DELETE FROM sections WHERE section_id = ?', [sectionId]);
    return result.affectedRows > 0;
  }

  /**
   * Check if a test has any sections defined
   */
  static async testHasSections(testId) {
    const rows = await query(
      'SELECT 1 FROM sections WHERE test_id = ? LIMIT 1',
      [testId]
    );
    return rows.length > 0;
  }
}

module.exports = Section;