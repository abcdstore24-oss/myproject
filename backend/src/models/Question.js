/**
 * Question Model - Updated for new schema
 * Supports: supported_languages (JSON) and initial_codes (JSON) only
 * Removed: coding_language and initial_code (deprecated columns)
 */

const { query } = require('../config/database');

class Question {
  /**
   * Create a new question
   */
  static async create(questionData) {
    const sql = `
      INSERT INTO questions (
        test_id, question_type, question_number, question_text,
        option_a, option_b, option_c, option_d, correct_option,
        supported_languages, initial_codes, test_cases,
        marks, difficulty, section_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Handle test_cases JSON
    let testCasesJson = null;
    if (questionData.test_cases) {
      if (typeof questionData.test_cases === 'string') {
        testCasesJson = questionData.test_cases;
      } else {
        testCasesJson = JSON.stringify(questionData.test_cases);
      }
    }
    
    // Handle supported_languages JSON
    let supportedLanguagesJson = null;
    if (questionData.supported_languages) {
      if (typeof questionData.supported_languages === 'string') {
        supportedLanguagesJson = questionData.supported_languages;
      } else {
        supportedLanguagesJson = JSON.stringify(questionData.supported_languages);
      }
    }
    
    // Handle initial_codes JSON
    let initialCodesJson = null;
    if (questionData.initial_codes) {
      if (typeof questionData.initial_codes === 'string') {
        initialCodesJson = questionData.initial_codes;
      } else {
        initialCodesJson = JSON.stringify(questionData.initial_codes);
      }
    }
    
    const result = await query(sql, [
      questionData.test_id,
      questionData.question_type,
      questionData.question_number,
      questionData.question_text,
      questionData.option_a || null,
      questionData.option_b || null,
      questionData.option_c || null,
      questionData.option_d || null,
      questionData.correct_option || null,
      supportedLanguagesJson,
      initialCodesJson,
      testCasesJson,
      questionData.marks || 1,
      questionData.difficulty || 'medium',
      questionData.section_id || null,
    ]);
    
    return result.insertId;
  }

  /**
   * Get all questions for a test
   */
  static async getByTest(testId) {
    const sql = `
      SELECT * FROM questions
      WHERE test_id = ?
      ORDER BY question_number ASC
    `;
    const questions = await query(sql, [testId]);
    return questions.map(q => this.parseQuestion(q));
  }

  /**
   * Get question by ID
   */
  static async getById(questionId) {
    const sql = 'SELECT * FROM questions WHERE question_id = ?';
    const questions = await query(sql, [questionId]);
    
    if (questions.length === 0) return null;
    
    return this.parseQuestion(questions[0]);
  }

  /**
   * Parse question - handle all JSON fields
   */
  static parseQuestion(question) {
    return {
      ...question,
      test_cases: question.test_cases ? this.safeJsonParse(question.test_cases) : null,
      supported_languages: question.supported_languages 
        ? this.safeJsonParse(question.supported_languages) 
        : null,
      initial_codes: question.initial_codes 
        ? this.safeJsonParse(question.initial_codes) 
        : null,
    };
  }

  /**
   * Safe JSON parse helper
   */
  static safeJsonParse(value) {
    try {
      if (value === null || value === undefined) return null;

      // If already object/array, return it
      if (typeof value === "object") {
        return value;
      }

      // If string, parse it
      if (typeof value === "string") {
        return JSON.parse(value);
      }

      return value;
    } catch (error) {
      console.error("JSON parse error:", error.message, "Input:", value);
      return null;
    }
  }

  /**
   * Update question
   */
  static async update(questionId, questionData) {
    const allowedFields = [
      'question_text', 'option_a', 'option_b', 'option_c', 'option_d',
      'correct_option', 'supported_languages', 'initial_codes', 'test_cases',
      'marks', 'difficulty', 'question_number', 'section_id'
    ];
    
    const updates = [];
    const values = [];

    Object.keys(questionData).forEach((key) => {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        
        // Handle JSON fields
        if (key === 'test_cases' || key === 'supported_languages' || key === 'initial_codes') {
          if (typeof questionData[key] === 'string') {
            values.push(questionData[key]);
          } else if (questionData[key]) {
            values.push(JSON.stringify(questionData[key]));
          } else {
            values.push(null);
          }
        } else {
          values.push(questionData[key]);
        }
      }
    });

    if (updates.length === 0) {
      return false;
    }

    values.push(questionId);
    const sql = `UPDATE questions SET ${updates.join(', ')} WHERE question_id = ?`;
    
    const result = await query(sql, values);
    return result.affectedRows > 0;
  }

  /**
   * Delete question
   */
  static async delete(questionId) {
    const sql = 'DELETE FROM questions WHERE question_id = ?';
    const result = await query(sql, [questionId]);
    return result.affectedRows > 0;
  }

  /**
   * Get question count for a test
   */
  static async getCountByTest(testId) {
    const sql = 'SELECT COUNT(*) as count FROM questions WHERE test_id = ?';
    const result = await query(sql, [testId]);
    return result[0].count;
  }

  /**
   * Get next question number for a test
   */
  static async getNextQuestionNumber(testId) {
    const sql = 'SELECT MAX(question_number) as max_num FROM questions WHERE test_id = ?';
    const result = await query(sql, [testId]);
    return (result[0].max_num || 0) + 1;
  }

  /**
   * Get questions by type
   */
  static async getByType(testId, questionType) {
    const sql = `
      SELECT * FROM questions
      WHERE test_id = ? AND question_type = ?
      ORDER BY question_number ASC
    `;
    const questions = await query(sql, [testId, questionType]);
    
    return questions.map(q => this.parseQuestion(q));
  }

  /**
   * Bulk delete questions by test
   */
  static async deleteByTest(testId) {
    const sql = 'DELETE FROM questions WHERE test_id = ?';
    const result = await query(sql, [testId]);
    return result.affectedRows;
  }
}

module.exports = Question;