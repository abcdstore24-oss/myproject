/**
 * Exam Controller
 *
 * FIX B-16: submitTest() was calling Test.getById(testId) TWICE:
 *   1. Implicitly needed (but not done) before score calculation
 *   2. Explicitly after scoring: `const test = await Test.getById(testId);`
 *      just to read test.show_results_immediately
 *
 * Fix: fetch the test ONCE at the top of submitTest (same pattern as every
 * other method in this controller) and reuse the variable throughout.
 * This eliminates one unnecessary DB round-trip on the critical submit path.
 *
 * All other methods are unchanged.
 */

const TestCandidate     = require('../models/TestCandidate');
const Test              = require('../models/Test');
const Question          = require('../models/Question');
const Answer            = require('../models/Answer');
const Section           = require('../models/Section');
const CandidateQuestion = require('../models/CandidateQuestion');
const { createToken }                    = require('../services/mobileCameraTokens');
const { runAgainstTestCases, checkDockerAvailable } = require('../services/codeExecutor');

class ExamController {
  /**
   * Verify pre-exam requirements
   * POST /api/exam/verify-requirements
   */
  static async verifyRequirements(req, res) {
    try {
      const { testId }    = req.body;
      const candidateId   = req.userId;

      const test = await Test.getById(testId);
      if (!test) {
        return res.status(404).json({ success: false, message: 'Test not found' });
      }

      if (!['scheduled', 'active'].includes(test.status)) {
        return res.status(400).json({ success: false, message: 'This test is not published yet' });
      }

      const assignment = await TestCandidate.getAssignment(testId, candidateId);
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this test' });
      }

      if (assignment.submitted_at) {
        return res.status(400).json({ success: false, message: 'You have already submitted this test' });
      }

      if (assignment.started_at) {
        const personalDeadline = new Date(
          new Date(assignment.started_at).getTime() + test.duration_minutes * 60 * 1000
        );
        if (new Date() >= personalDeadline) {
          return res.status(400).json({ success: false, message: 'Your allotted time for this test has expired.' });
        }
      }

      const now       = new Date();
      const startTime = new Date(test.start_time);
      const endTime   = new Date(test.end_time);

      if (now < startTime) {
        return res.status(400).json({ success: false, message: 'Test has not started yet', startTime: test.start_time });
      }
      if (now >= endTime) {
        return res.status(400).json({ success: false, message: 'This test has ended' });
      }

      res.status(200).json({
        success: true,
        message: 'Requirements verified',
        data: {
          test,
          assignment,
          requirements: {
            webcam_required:        test.enable_webcam,
            location_required:      test.enable_location_tracking,
            second_camera_required: test.enable_second_camera,
          },
        },
      });
    } catch (error) {
      console.error('Verify requirements error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to verify requirements' });
    }
  }

  /**
   * Update webcam verification status
   * POST /api/exam/verify-webcam
   */
  static async verifyWebcam(req, res) {
    try {
      const { testId, webcamVerified } = req.body;
      const candidateId = req.userId;

      await TestCandidate.updateProctoringData(testId, candidateId, {
        webcam_verified: webcamVerified,
      });

      res.status(200).json({ success: true, message: 'Webcam verification updated' });
    } catch (error) {
      console.error('Verify webcam error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to update webcam verification' });
    }
  }

  /**
   * Verify location
   * POST /api/exam/verify-location
   */
  static async verifyLocation(req, res) {
    try {
      const { testId, latitude, longitude } = req.body;
      const candidateId = req.userId;

      const test = await Test.getById(testId);
      if (!test) {
        return res.status(404).json({ success: false, message: 'Test not found' });
      }

      let locationVerified = true;

      if (test.enable_location_tracking && test.allowed_latitude && test.allowed_longitude) {
        const distance    = calculateDistance(latitude, longitude, test.allowed_latitude, test.allowed_longitude);
        const radiusMeters = test.location_radius_meters || 1000;
        locationVerified  = distance <= radiusMeters;

        if (!locationVerified) {
          return res.status(400).json({
            success: false,
            message: `You are ${Math.round(distance)}m away from the allowed location. Maximum allowed distance is ${radiusMeters}m.`,
            data: { distance: Math.round(distance), allowed_radius: radiusMeters },
          });
        }
      }

      await TestCandidate.updateProctoringData(testId, candidateId, { location_verified: locationVerified });

      res.status(200).json({
        success: true,
        message: 'Location verified successfully',
        data: { location_verified: locationVerified },
      });
    } catch (error) {
      console.error('Verify location error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to verify location' });
    }
  }

  /**
   * Verify second camera
   * POST /api/exam/verify-second-camera
   */
  static async verifySecondCamera(req, res) {
    try {
      const { testId, secondCameraVerified } = req.body;
      const candidateId = req.userId;

      await TestCandidate.updateProctoringData(testId, candidateId, {
        second_camera_verified: secondCameraVerified,
      });

      res.status(200).json({ success: true, message: 'Second camera verification updated' });
    } catch (error) {
      console.error('Verify second camera error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to update second camera verification' });
    }
  }

  /**
   * Start test — records start time and returns questions
   * POST /api/exam/start
   */
  static async startTest(req, res) {
    try {
      const { testId }  = req.body;
      const candidateId = req.userId;

      const test = await Test.getById(testId);
      if (!test) {
        return res.status(404).json({ success: false, message: 'Test not found' });
      }

      if (!['scheduled', 'active'].includes(test.status)) {
        return res.status(400).json({
          success: false,
          message: test.status === 'draft'
            ? 'This test has not been published yet.'
            : test.status === 'cancelled'
            ? 'This test has been cancelled.'
            : 'This test is no longer available.',
        });
      }

      const now = new Date();
      if (now >= new Date(test.end_time)) {
        return res.status(400).json({ success: false, message: 'This test has ended. You can no longer start or resume it.' });
      }
      if (now < new Date(test.start_time)) {
        return res.status(400).json({ success: false, message: 'Test has not started yet.', startTime: test.start_time });
      }

      const assignment = await TestCandidate.getAssignment(testId, candidateId);
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this test' });
      }

      if (assignment.submitted_at) {
        return res.status(400).json({ success: false, message: 'You have already submitted this test' });
      }

      if (assignment.started_at) {
        const personalDeadline = new Date(
          new Date(assignment.started_at).getTime() + test.duration_minutes * 60 * 1000
        );
        if (new Date() >= personalDeadline) {
          return res.status(400).json({ success: false, message: 'Your allotted time for this test has expired. The test has been auto-submitted.' });
        }
      }

      if (test.enable_webcam && !assignment.webcam_verified) {
        return res.status(400).json({ success: false, message: 'Please verify your webcam before starting the test' });
      }
      if (test.enable_location_tracking && !assignment.location_verified) {
        return res.status(400).json({ success: false, message: 'Please verify your location before starting the test' });
      }

      const started = await TestCandidate.startTest(testId, candidateId);

      await CandidateQuestion.assignIfNeeded(
        assignment.assignment_id,
        testId,
        test.questions_per_candidate || null
      );

      const rawQuestions = await CandidateQuestion.getQuestionsForCandidate(assignment.assignment_id);
      const questions    = rawQuestions.map(q => Question.parseQuestion(q));
      const sections     = await Section.getByTest(testId);
      const answers      = await Answer.getAnswersByAssignment(assignment.assignment_id);

      res.status(200).json({
        success: true,
        message: started ? 'Test started successfully' : 'Test already in progress',
        data: {
          test,
          sections,
          questions: questions.map(q => ({
            ...q,
            correct_option: undefined,
            test_cases: q.test_cases?.map(tc => ({
              input:           tc.input,
              expected_output: tc.is_hidden ? 'Hidden' : tc.expected_output,
              is_hidden:       tc.is_hidden,
            })),
          })),
          assignment,
          answers,
        },
      });
    } catch (error) {
      console.error('Start test error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to start test' });
    }
  }

  /**
   * Get exam session (resume)
   * GET /api/exam/:testId/session
   */
  static async getExamSession(req, res) {
    try {
      const { testId }  = req.params;
      const candidateId = req.userId;

      const test = await Test.getById(testId);
      if (!test) {
        return res.status(404).json({ success: false, message: 'Test not found' });
      }

      const assignment = await TestCandidate.getAssignment(testId, candidateId);
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this test' });
      }
      if (!assignment.started_at) {
        return res.status(400).json({ success: false, message: 'Test not started yet' });
      }

      const rawQuestions = await CandidateQuestion.getQuestionsForCandidate(assignment.assignment_id);
      const questions    = rawQuestions.map(q => Question.parseQuestion(q));
      const sections     = await Section.getByTest(testId);
      const answers      = await Answer.getAnswersByAssignment(assignment.assignment_id);

      res.status(200).json({
        success: true,
        data: {
          test,
          sections,
          questions: questions.map(q => ({
            ...q,
            correct_option: undefined,
            test_cases: q.test_cases?.map(tc => ({
              input:           tc.input,
              expected_output: tc.is_hidden ? 'Hidden' : tc.expected_output,
              is_hidden:       tc.is_hidden,
            })),
          })),
          assignment,
          answers,
        },
      });
    } catch (error) {
      console.error('Get exam session error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to get exam session' });
    }
  }

  /**
   * Save / auto-save an answer
   * POST /api/exam/save-answer
   */
  static async saveAnswer(req, res) {
    try {
      const { testId, questionId, selectedOption, codeAnswer, selectedLanguage, timeSpent } = req.body;
      const candidateId = req.userId;

      const assignment = await TestCandidate.getAssignment(testId, candidateId);
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this test' });
      }
      if (assignment.submitted_at) {
        return res.status(400).json({ success: false, message: 'Test already submitted' });
      }

      const test = await Test.getById(testId);
      if (test && new Date() >= new Date(test.end_time)) {
        return res.status(400).json({ success: false, message: 'Test time has expired. No further answers accepted.' });
      }

      await Answer.saveAnswer({
        assignment_id:      assignment.assignment_id,
        question_id:        questionId,
        selected_option:    selectedOption,
        code_answer:        codeAnswer,
        selected_language:  selectedLanguage,
        time_spent_seconds: timeSpent || 0,
      });

      res.status(200).json({ success: true, message: 'Answer saved successfully' });
    } catch (error) {
      console.error('Save answer error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to save answer' });
    }
  }

  /**
   * Submit test — evaluate all answers and record final score
   * POST /api/exam/submit
   *
   * FIX B-16: Test fetched ONCE at the top of this function.
   * Previous version fetched it a SECOND time at line ~591 only to read
   * test.show_results_immediately. That redundant query is now removed.
   */
  static async submitTest(req, res) {
    try {
      const { testId }  = req.body;
      const candidateId = req.userId;

      // FIX B-16: single fetch — reused throughout the entire function
      const test = await Test.getById(testId);
      if (!test) {
        return res.status(404).json({ success: false, message: 'Test not found' });
      }

      const assignment = await TestCandidate.getAssignment(testId, candidateId);
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this test' });
      }
      if (assignment.submitted_at) {
        return res.status(400).json({ success: false, message: 'Test already submitted' });
      }
      if (!assignment.started_at) {
        return res.status(400).json({ success: false, message: 'Test not started yet' });
      }

      await TestCandidate.submitTest(testId, candidateId);

      const rawQuestions = await CandidateQuestion.getQuestionsForCandidate(assignment.assignment_id);
      const questions    = rawQuestions.map(q => Question.parseQuestion(q));
      const answers      = await Answer.getAnswersByAssignment(assignment.assignment_id);

      let totalScore = 0;

      for (const answer of answers) {
        const question = questions.find(q => q.question_id === answer.question_id);
        if (!question) continue;

        if (question.question_type === 'mcq') {
          const isCorrect = await Answer.evaluateMCQAnswer(answer.answer_id, question.correct_option);
          if (isCorrect) totalScore += question.marks;

        } else if (question.question_type === 'coding') {
          if (!answer.code_answer || !answer.selected_language) continue;

          const dockerUp = await checkDockerAvailable();
          if (!dockerUp) {
            return res.status(503).json({
              success: false,
              message: 'Code evaluation service is temporarily unavailable. Please try submitting again in a moment.',
            });
          }

          const testCases = question.test_cases;
          if (!testCases || testCases.length === 0) continue;

          try {
            const driverCode = question.initial_codes?.[`_driver_${answer.selected_language.toLowerCase()}`] || '';
            const result     = await runAgainstTestCases(
              answer.selected_language,
              answer.code_answer,
              driverCode,
              testCases
            );

            const marksObtained = result.allPassed
              ? question.marks
              : Math.floor((result.passedCount / result.totalCount) * question.marks);

            await Answer.updateCodingMarks(answer.answer_id, marksObtained);
            totalScore += marksObtained;
          } catch (err) {
            console.error(`Coding eval failed for answer ${answer.answer_id}:`, err.message);
          }
        }
      }

      const candidateTotalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
      const totalMarks          = candidateTotalMarks || 0;
      const percentage          = totalMarks > 0 ? (totalScore / totalMarks) * 100 : 0;

      // FIX B-16: `test` is already in scope — no second getById needed
      await TestCandidate.updateScore(testId, candidateId, totalScore, totalMarks || 1);

      const io = req.app.get('io');
      if (io) {
        const payload = { message: 'Exam submitted. Secondary camera session ended.' };
        io.to(`user_${candidateId}`).emit('exam_ended', payload);
        io.to(`mobile_${assignment.assignment_id}`).emit('exam_ended', payload);
      }

      res.status(200).json({
        success: true,
        message: 'Test submitted successfully',
        data: {
          score:                   totalScore,
          total_marks:             totalMarks,
          percentage,
          assignment_id:           assignment.assignment_id,
          show_results_immediately: test.show_results_immediately ?? false, // reuses hoisted `test`
        },
      });
    } catch (error) {
      console.error('Submit test error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to submit test' });
    }
  }

  /**
   * Generate short-lived QR token for mobile second camera
   * GET /api/exam/mobile-camera-token/:testId
   */
  static async generateMobileCameraToken(req, res) {
    try {
      const { testId }  = req.params;
      const candidateId = req.userId;

      const assignment = await TestCandidate.getAssignment(testId, candidateId);
      if (!assignment) {
        return res.status(403).json({ success: false, message: 'You are not assigned to this test' });
      }

      const token       = createToken(assignment.assignment_id, testId, candidateId);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const mobileUrl   = `${frontendUrl}/mobile-camera?token=${token}`;

      res.json({ success: true, data: { token, mobileUrl } });
    } catch (error) {
      console.error('Generate mobile camera token error:', error.message);
      res.status(500).json({ success: false, message: 'Failed to generate token' });
    }
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R  = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = ExamController;