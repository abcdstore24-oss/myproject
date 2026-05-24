/**
 * Candidate Controller
 * Handles candidate-test assignments and enrollments
 */

const TestCandidate = require('../models/TestCandidate');
const Test = require('../models/Test');
const User = require('../models/User');

class CandidateController {
  /**
   * Assign candidates to a test
   * POST /api/tests/:testId/candidates
   */
  static async assignCandidates(req, res) {
    try {
      const { testId } = req.params;
      const { candidate_ids } = req.body; // Array of candidate IDs

      // Validate input
      if (!candidate_ids || !Array.isArray(candidate_ids) || candidate_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Please provide at least one candidate ID',
        });
      }

      // Check if test exists
      const test = await Test.getById(testId);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found',
        });
      }

      // Check permission (only recruiter who created test or admin)
      if (req.userRole !== 'admin' && test.recruiter_id !== req.userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only test creator can assign candidates',
        });
      }

      // Verify all users exist and are candidates
      const users = await User.getByIds(candidate_ids);
      const invalidUsers = users.filter(u => u.role !== 'candidate');
      
      if (invalidUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Some users are not candidates',
          invalid_users: invalidUsers.map(u => u.email),
        });
      }

      // Assign candidates (will skip already assigned ones)
      const results = await TestCandidate.assignCandidates(testId, candidate_ids);

      res.status(200).json({
        success: true,
        message: `${results.assigned} candidate(s) assigned successfully`,
        data: {
          total_requested: candidate_ids.length,
          newly_assigned: results.assigned,
          already_assigned: results.skipped,
        },
      });
    } catch (error) {
      console.error('Assign candidates error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to assign candidates',
      });
    }
  }

  /**
   * Get all candidates assigned to a test
   * GET /api/tests/:testId/candidates
   */
  static async getTestCandidates(req, res) {
    try {
      const { testId } = req.params;

      // Check if test exists
      const test = await Test.getById(testId);
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

      const candidates = await TestCandidate.getCandidatesByTest(testId);

      res.status(200).json({
        success: true,
        data: {
          candidates,
          count: candidates.length,
        },
      });
    } catch (error) {
      console.error('Get test candidates error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch candidates',
      });
    }
  }

  /**
   * Remove candidate from test
   * DELETE /api/tests/:testId/candidates/:candidateId
   */
  static async removeCandidate(req, res) {
    try {
      const { testId, candidateId } = req.params;

      // Check if test exists
      const test = await Test.getById(testId);
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

      // Check if assignment exists
      const assignment = await TestCandidate.getAssignment(testId, candidateId);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'Candidate not assigned to this test',
        });
      }

      // Don't allow removal if candidate has started the test
      if (assignment.started_at) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove candidate who has already started the test',
        });
      }

      await TestCandidate.removeCandidate(testId, candidateId);

      res.status(200).json({
        success: true,
        message: 'Candidate removed from test',
      });
    } catch (error) {
      console.error('Remove candidate error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to remove candidate',
      });
    }
  }

  /**
   * Get all tests assigned to current candidate
   * GET /api/candidates/my-tests
   */
  static async getMyCandidateTests(req, res) {
    try {
      const candidateId = req.userId;

      const tests = await TestCandidate.getTestsByCandidate(candidateId);
      
      res.status(200).json({
        success: true,
        data: {
          tests,
          count: tests.length,
        },
      });
    } catch (error) {
      console.error('Get my tests error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch tests',
      });
    }
  }

  /**
   * Get test enrollment details for candidate
   * GET /api/candidates/tests/:testId/enrollment
   */
  static async getEnrollmentDetails(req, res) {
    try {
      const { testId } = req.params;
      const candidateId = req.userId;

      // Check if test exists
      const test = await Test.getById(testId);
      if (!test) {
        return res.status(404).json({
          success: false,
          message: 'Test not found',
        });
      }

      // Check if candidate is assigned
      const assignment = await TestCandidate.getAssignment(testId, candidateId);
      if (!assignment) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to this test',
        });
      }

      // Get test with questions count
      const questionCount = await Test.getQuestionCount(testId);

      res.status(200).json({
        success: true,
        data: {
          test: {
            ...test,
            question_count: questionCount,
          },
          assignment,
        },
      });
    } catch (error) {
      console.error('Get enrollment details error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch enrollment details',
      });
    }
  }

  /**
   * Update invitation status (accept/decline)
   * PATCH /api/candidates/tests/:testId/invitation
   */
  static async updateInvitationStatus(req, res) {
    try {
      const { testId } = req.params;
      const candidateId = req.userId;
      const { status } = req.body; // 'accepted' or 'declined'

      if (!['accepted', 'declined'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid status. Must be "accepted" or "declined"',
        });
      }

      // Check if assignment exists
      const assignment = await TestCandidate.getAssignment(testId, candidateId);
      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: 'You are not assigned to this test',
        });
      }

      // Don't allow changing status if already started
      if (assignment.started_at) {
        return res.status(400).json({
          success: false,
          message: 'Cannot change invitation status after starting the test',
        });
      }

      await TestCandidate.updateInvitationStatus(testId, candidateId, status);

      res.status(200).json({
        success: true,
        message: `Invitation ${status}`,
      });
    } catch (error) {
      console.error('Update invitation status error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to update invitation status',
      });
    }
  }

  /**
   * Get all available candidates (for assignment dropdown)
   * GET /api/candidates/available
   */
  static async getAvailableCandidates(req, res) {
    try {
      // Only admins and recruiters can see this
      if (!['admin', 'recruiter'].includes(req.userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const candidates = await User.getCandidates();

      res.status(200).json({
        success: true,
        data: {
          candidates: candidates.map(c => ({
            user_id: c.user_id,
            full_name: c.full_name,
            email: c.email,
            phone: c.phone,
          })),
          count: candidates.length,
        },
      });
    } catch (error) {
      console.error('Get available candidates error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch candidates',
      });
    }
  }
}

module.exports = CandidateController;
