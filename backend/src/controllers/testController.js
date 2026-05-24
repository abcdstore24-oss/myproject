/**
 * Test Controller
 * Handles test management HTTP requests
 */

const Test = require('../models/Test');
const Question = require('../models/Question');

class TestController {
  /**
   * Get all tests (admin) or recruiter's tests
   * GET /api/tests
   */
  static async getAllTests(req, res) {
    try {
      let tests;
      
      if (req.userRole === 'admin') {
        tests = await Test.getAll();
      } else {
        tests = await Test.getByRecruiter(req.userId);
      }

      res.status(200).json({
        success: true,
        data: {
          tests,
          count: tests.length,
        },
      });
    } catch (error) {
      console.error('Get tests error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tests',
      });
    }
  }

  /**
   * Get test by ID
   * GET /api/tests/:id
   */
  static async getTestById(req, res) {
    try {
      const { id } = req.params;
      const test = await Test.getById(id);

      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found',
        });
      }

      // Check permission (admin or test owner)
      if (req.userRole !== 'admin' && test.recruiter_id !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      res.status(200).json({
        success: true,
        data: { test },
      });
    } catch (error) {
      console.error('Get test error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch test',
      });
    }
  }

  /**
   * Create new test
   * POST /api/tests
   */
  static async createTest(req, res) {
    try {
      const testData = {
        ...req.body,
        recruiter_id: req.userId,
      };

      const testId = await Test.create(testData);
      const test = await Test.getById(testId);

      res.status(201).json({
        success: true,
        message: 'Test created successfully',
        data: { test },
      });
    } catch (error) {
      console.error('Create test error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to create test',
      });
    }
  }

  /**
   * Update test
   * PUT /api/tests/:id
   */
  static async updateTest(req, res) {
    try {
      const { id } = req.params;
      
      // Check if test exists
      const test = await Test.getById(id);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found',
        });
      }

      // Check permission
      if (req.userRole !== 'admin' && test.recruiter_id !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const updated = await Test.update(id, req.body);

      if (!updated) {
        return res.status(400).json({
          success: false,
          message: 'No changes made',
        });
      }

      const updatedTest = await Test.getById(id);

      res.status(200).json({
        success: true,
        message: 'Test updated successfully',
        data: { test: updatedTest },
      });
    } catch (error) {
      console.error('Update test error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to update test',
      });
    }
  }

  /**
   * Delete test
   * DELETE /api/tests/:id
   */
  static async deleteTest(req, res) {
    try {
      const { id } = req.params;
      
      // Check if test exists
      const test = await Test.getById(id);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found',
        });
      }

      // Check permission
      if (req.userRole !== 'admin' && test.recruiter_id !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      // Delete associated questions first
      await Question.deleteByTest(id);
      
      // Delete test
      const deleted = await Test.delete(id);

      if (!deleted) {
        return res.status(500).json({
          success: false,
          message: 'Failed to delete test',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Test deleted successfully',
      });
    } catch (error) {
      console.error('Delete test error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to delete test',
      });
    }
  }

  /**
   * Get test statistics
   * GET /api/tests/stats
   */
  static async getTestStats(req, res) {
    try {
      const recruiterId = req.userRole === 'admin' ? null : req.userId;
      const stats = await Test.getStats(recruiterId);

      res.status(200).json({
        success: true,
        data: { stats },
      });
    } catch (error) {
      console.error('Get test stats error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch statistics',
      });
    }
  }

  /**
   * Publish test
   * PATCH /api/tests/:id/publish
   */
  static async publishTest(req, res) {
    try {
      const { id } = req.params;
      
      // Check if test exists
      const test = await Test.getById(id);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found',
        });
      }

      // Check permission
      if (req.userRole !== 'admin' && test.recruiter_id !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      // Cannot re-publish a test that is already live or done
      if (['active', 'completed', 'cancelled'].includes(test.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot publish a test that is already '${test.status}'.`,
        });
      }

      // Check if test has questions
      if (test.question_count === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot publish test without questions',
        });
      }

      await Test.publish(id);
      const updatedTest = await Test.getById(id);

      res.status(200).json({
        success: true,
        message: 'Test published successfully',
        data: { test: updatedTest },
      });
    } catch (error) {
      console.error('Publish test error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to publish test',
      });
    }
  }
}

module.exports = TestController;