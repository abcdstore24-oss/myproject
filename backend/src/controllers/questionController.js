/**
 * Question Controller - FIXED
 * Auto-updates test total_marks when questions change
 */

const Question = require('../models/Question');
const Test = require('../models/Test');

class QuestionController {
  /**
   * Get all questions for a test
   */
  static async getQuestions(req, res) {
    try {
      const { testId } = req.params;
      
      const test = await Test.getById(testId);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found',
        });
      }

      if (req.userRole !== 'admin' && test.recruiter_id !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const questions = await Question.getByTest(testId);
      
      res.status(200).json({
        success: true,
        data: {
          questions,
          count: questions.length,
        },
      });
    } catch (error) {
      console.error('Get questions error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch questions',
      });
    }
  }

  /**
   * Get single question
   */
  static async getQuestion(req, res) {
    try {
      const { id } = req.params;
      
      const question = await Question.getById(id);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found',
        });
      }

      const test = await Test.getById(question.test_id);
      if (req.userRole !== 'admin' && test.recruiter_id !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      res.status(200).json({
        success: true,
        data: { question },
      });
    } catch (error) {
      console.error('Get question error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch question',
      });
    }
  }

  /**
   * Update test total marks
   * Calculates sum of all question marks and updates test
   */
  static async updateTestTotalMarks(testId) {
    try {
      const questions = await Question.getByTest(testId);
      const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
      
      await Test.updateTotalMarks(testId, totalMarks);
      
      console.log(`Updated test ${testId} total marks: ${totalMarks}`);
    } catch (error) {
      console.error('Update total marks error:', error.message);
      // Don't throw error, just log it
    }
  }

  /**
   * Create MCQ question
   */
  static async createMCQQuestion(req, res) {
    try {
      const { test_id, question_text, option_a, option_b, option_c, option_d,
              correct_option, marks, difficulty, section_id } = req.body;
      
      const test = await Test.getById(test_id);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found',
        });
      }

      if (req.userRole !== 'admin' && test.recruiter_id !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const question_number = await Question.getNextQuestionNumber(test_id);

      const questionData = {
        test_id,
        question_type: 'mcq',
        question_number,
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_option,
        marks: marks || 1,
        difficulty: difficulty || 'medium',
        section_id: section_id || null,
      };

      const questionId = await Question.create(questionData);
      const question = await Question.getById(questionId);

      // ✅ UPDATE TOTAL MARKS
      await QuestionController.updateTestTotalMarks(test_id);

      res.status(201).json({
        success: true,
        message: 'MCQ question created successfully',
        data: { question },
      });
    } catch (error) {
      console.error('Create MCQ question error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to create MCQ question',
      });
    }
  }

  /**
   * Create coding question
   */
  static async createCodingQuestion(req, res) {
    try {
      const {
        test_id,
        question_text,
        supported_languages,
        initial_codes,
        test_cases,
        marks,
        difficulty,
        section_id,
      } = req.body;
      
      const test = await Test.getById(test_id);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found',
        });
      }

      if (req.userRole !== 'admin' && test.recruiter_id !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const question_number = await Question.getNextQuestionNumber(test_id);

      const questionData = {
        test_id,
        question_type: 'coding',
        question_number,
        question_text,
        supported_languages,
        initial_codes: initial_codes || {},
        test_cases,
        marks: marks || 5,
        difficulty: difficulty || 'medium',
        section_id: section_id || null,
      };

      const questionId = await Question.create(questionData);
      const question = await Question.getById(questionId);

      // ✅ UPDATE TOTAL MARKS
      await QuestionController.updateTestTotalMarks(test_id);

      res.status(201).json({
        success: true,
        message: 'Coding question created successfully',
        data: { question },
      });
    } catch (error) {
      console.error('Create coding question error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to create coding question',
      });
    }
  }

  /**
   * Update question
   */
  static async updateQuestion(req, res) {
    try {
      const { id } = req.params;
      
      const question = await Question.getById(id);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found',
        });
      }

      const test = await Test.getById(question.test_id);
      if (req.userRole !== 'admin' && test.recruiter_id !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const updated = await Question.update(id, req.body);

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'No changes made',
        });
      }

      const updatedQuestion = await Question.getById(id);

      // ✅ UPDATE TOTAL MARKS (in case marks changed)
      await QuestionController.updateTestTotalMarks(question.test_id);

      res.status(200).json({
        success: true,
        message: 'Question updated successfully',
        data: { question: updatedQuestion },
      });
    } catch (error) {
      console.error('Update question error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to update question',
      });
    }
  }

  /**
   * Delete question
   */
  static async deleteQuestion(req, res) {
    try {
      const { id } = req.params;
      
      const question = await Question.getById(id);
      if (!question) {
        return res.status(404).json({
          success: false,
          message: 'Question not found',
        });
      }

      const test = await Test.getById(question.test_id);
      if (req.userRole !== 'admin' && test.recruiter_id !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const deleted = await Question.delete(id);

      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete question',
        });
      }

      // ✅ UPDATE TOTAL MARKS
      await QuestionController.updateTestTotalMarks(question.test_id);

      res.status(200).json({
        success: true,
        message: 'Question deleted successfully',
      });
    } catch (error) {
      console.error('Delete question error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to delete question',
      });
    }
  }
}

module.exports = QuestionController;