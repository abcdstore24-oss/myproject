/**
 * CandidateQuestion Model
 *
 * Stores which questions were assigned to each candidate.
 * Assignment happens once at startTest() and is immutable afterwards.
 *
 * Logic at assignment time:
 *   • Test HAS sections → for each section, randomly pick section.questions_to_pick
 *     questions (or all if NULL).  Order sections by order_number.
 *   • Test has NO sections → randomly pick test.questions_per_candidate questions
 *     from the full pool (or all if NULL).
 */

const { query } = require('../config/database');
const Section = require('./Section');

class CandidateQuestion {
  /**
   * Check whether questions have already been assigned for this assignment
   */
  static async hasAssignedQuestions(assignmentId) {
    const rows = await query(
      'SELECT 1 FROM candidate_questions WHERE assignment_id = ? LIMIT 1',
      [assignmentId]
    );
    return rows.length > 0;
  }

  /**
   * Assign questions to a candidate — idempotent, safe to call multiple times.
   * Does nothing if questions are already assigned.
   *
   * @param {number} assignmentId
   * @param {number} testId
   * @param {number|null} questionsPerCandidate  — from tests.questions_per_candidate
   * @returns {boolean} true if newly assigned, false if already existed
   */
  static async assignIfNeeded(assignmentId, testId, questionsPerCandidate) {
    const alreadyAssigned = await this.hasAssignedQuestions(assignmentId);
    if (alreadyAssigned) return false;

    const hasSections = await Section.testHasSections(testId);

    if (hasSections) {
      await this._assignWithSections(assignmentId, testId);
    } else {
      await this._assignFlat(assignmentId, testId, questionsPerCandidate);
    }

    return true;
  }

  /**
   * Assign questions grouped by section.
   * Each section can specify how many to pick; NULL = all.
   */
  static async _assignWithSections(assignmentId, testId) {
    const sections = await Section.getByTest(testId);
    let displayOrder = 0;
    const rows = [];

    for (const section of sections) {
      // Get all questions in this section
      const poolRows = await query(
        'SELECT question_id FROM questions WHERE test_id = ? AND section_id = ? ORDER BY question_number ASC',
        [testId, section.section_id]
      );

      const pool = poolRows.map(r => r.question_id);
      const pickCount = section.questions_to_pick
        ? Math.min(section.questions_to_pick, pool.length)
        : pool.length;

      const picked = this._randomPick(pool, pickCount);

      for (const qId of picked) {
        rows.push([assignmentId, qId, section.section_id, displayOrder++]);
      }
    }

    for (const [aId, qId, sId, ord] of rows) {
      await query(
        'INSERT INTO candidate_questions (assignment_id, question_id, section_id, display_order) VALUES (?, ?, ?, ?)',
        [aId, qId, sId, ord]
      );
    }
  }

  /**
   * Assign questions from the flat pool (no sections).
   * questionsPerCandidate NULL = all questions.
   */
  static async _assignFlat(assignmentId, testId, questionsPerCandidate) {
    const poolRows = await query(
      'SELECT question_id FROM questions WHERE test_id = ? ORDER BY question_number ASC',
      [testId]
    );

    const pool = poolRows.map(r => r.question_id);
    const pickCount = questionsPerCandidate
      ? Math.min(questionsPerCandidate, pool.length)
      : pool.length;

    const picked = this._randomPick(pool, pickCount);
    const rows = picked.map((qId, idx) => [assignmentId, qId, null, idx]);

    for (const [aId, qId, sId, ord] of rows) {
      await query(
        'INSERT INTO candidate_questions (assignment_id, question_id, section_id, display_order) VALUES (?, ?, ?, ?)',
        [aId, qId, sId, ord]
      );
    }
  }

  /**
   * Get all questions assigned to a candidate, ordered by display_order.
   * Returns full question rows (joined with questions table).
   */
  static async getQuestionsForCandidate(assignmentId) {
    const sql = `
      SELECT q.*
      FROM candidate_questions cq
      JOIN questions q ON cq.question_id = q.question_id
      WHERE cq.assignment_id = ?
      ORDER BY cq.display_order ASC
    `;
    return await query(sql, [assignmentId]);
  }

  /**
   * Shuffle and pick N items from an array (Fisher-Yates)
   */
  static _randomPick(arr, n) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }
}

module.exports = CandidateQuestion;