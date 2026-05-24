/**
 * Answer Model - FIX: Case-insensitive MCQ evaluation
 */

const { query } = require('../config/database');

class Answer {
  /**
   * Save or update answer (MCQ or Coding)
   */
  static async saveAnswer(answerData) {
    const {
      assignment_id,
      question_id,
      selected_option,
      code_answer,
      selected_language,
      time_spent_seconds,
    } = answerData;

    const existing = await this.getAnswer(assignment_id, question_id);

    if (existing) {
      const sql = `
        UPDATE answers
        SET 
          selected_option = ?,
          code_answer = ?,
          selected_language = ?,
          time_spent_seconds = ?,
          answered_at = CURRENT_TIMESTAMP
        WHERE assignment_id = ? AND question_id = ?
      `;
      
      await query(sql, [
        selected_option || null,
        code_answer || null,
        selected_language || null,
        time_spent_seconds || 0,
        assignment_id,
        question_id,
      ]);

      return existing.answer_id;
    } else {
      const sql = `
        INSERT INTO answers (
          assignment_id,
          question_id,
          selected_option,
          code_answer,
          selected_language,
          time_spent_seconds
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      const result = await query(sql, [
        assignment_id,
        question_id,
        selected_option || null,
        code_answer || null,
        selected_language || null,
        time_spent_seconds || 0,
      ]);

      return result.insertId;
    }
  }

  /**
   * Get answer for a specific question
   */
  static async getAnswer(assignmentId, questionId) {
    const sql = `
      SELECT * FROM answers
      WHERE assignment_id = ? AND question_id = ?
    `;
    const results = await query(sql, [assignmentId, questionId]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get all answers for an assignment
   */
  static async getAnswersByAssignment(assignmentId) {
    const sql = `
      SELECT * FROM answers
      WHERE assignment_id = ?
      ORDER BY question_id ASC
    `;
    return await query(sql, [assignmentId]);
  }

  /**
   * ✅ FIXED: Evaluate MCQ answer - CASE-INSENSITIVE
   */
  static async evaluateMCQAnswer(answerId, correctOption) {
    // Step 1: Get the answer with question info
    const sql = `
      SELECT 
        a.answer_id,
        a.selected_option,
        a.question_id,
        q.marks
      FROM answers a
      JOIN questions q ON a.question_id = q.question_id
      WHERE a.answer_id = ?
    `;
    const results = await query(sql, [answerId]);
    
    if (results.length === 0) return null;

    const answerData = results[0];
    
    // ✅ FIX: Case-insensitive comparison
    const isCorrect = answerData.selected_option?.toLowerCase() === correctOption?.toLowerCase();
    const marksObtained = isCorrect ? answerData.marks : 0;

    // Step 2: Update the answer
    const updateSql = `
      UPDATE answers
      SET 
        is_correct = ?,
        marks_obtained = ?
      WHERE answer_id = ?
    `;

    await query(updateSql, [isCorrect, marksObtained, answerId]);

    return isCorrect;
  }

  /**
   * Update marks for coding answer (manual evaluation)
   */
  static async updateCodingMarks(answerId, marksObtained) {
    const sql = `
      UPDATE answers
      SET 
        marks_obtained = ?,
        is_correct = CASE WHEN ? > 0 THEN TRUE ELSE FALSE END
      WHERE answer_id = ?
    `;
    
    const result = await query(sql, [marksObtained, marksObtained, answerId]);
    return result.affectedRows > 0;
  }

  /**
   * Get answer count for assignment
   */
  static async getAnswerCount(assignmentId) {
    const sql = `
      SELECT COUNT(*) as count FROM answers
      WHERE assignment_id = ?
    `;
    const result = await query(sql, [assignmentId]);
    return result[0].count;
  }

  /**
   * Delete answers by assignment
   */
  static async deleteByAssignment(assignmentId) {
    const sql = 'DELETE FROM answers WHERE assignment_id = ?';
    const result = await query(sql, [assignmentId]);
    return result.affectedRows;
  }

  /**
   * Get unanswered questions
   */
  static async getUnansweredQuestions(assignmentId, testId) {
    const sql = `
      SELECT q.question_id
      FROM questions q
      WHERE q.test_id = ?
        AND q.question_id NOT IN (
          SELECT question_id FROM answers WHERE assignment_id = ?
        )
    `;
    return await query(sql, [testId, assignmentId]);
  }
}

module.exports = Answer;