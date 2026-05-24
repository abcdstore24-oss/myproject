/**
 * Reports Controller
 *
 * FIX B-06: All occurrences of req.user.user_id replaced with req.userId.
 * req.userId is set by authMiddleware and is the single canonical way every
 * other controller accesses the authenticated user's ID. Using req.user.user_id
 * directly creates tight coupling to the user-object shape and breaks if
 * authMiddleware is ever refactored.
 *
 * No logic changes — purely the accessor fix on lines that had req.user.user_id.
 */

const db = require('../config/database');

// ─────────────────────────────────────────────
// GET /api/reports/candidate/:assignmentId
// Candidate views their own result
// ─────────────────────────────────────────────
const getCandidateResult = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.userId; // FIX B-06

    const assignments = await db.query(
      `SELECT tc.*, t.test_title, t.total_marks, t.passing_percentage
       FROM test_candidates tc
       JOIN tests t ON tc.test_id = t.test_id
       WHERE tc.assignment_id = ? AND tc.candidate_id = ?`,
      [assignmentId, userId]
    );

    if (assignments.length === 0)
      return res.status(404).json({ success: false, message: 'Assignment not found' });

    const assignment = assignments[0];

    if (!assignment.submitted_at)
      return res.status(400).json({ success: false, message: 'Test not yet completed' });

    const answers = await db.query(
      `SELECT
        a.answer_id, a.question_id, a.selected_option, a.code_answer,
        a.is_correct, a.marks_obtained,
        q.question_text, q.question_type, q.marks, q.correct_option
       FROM answers a
       JOIN questions q ON a.question_id = q.question_id
       WHERE a.assignment_id = ?
       ORDER BY q.question_number`,
      [assignmentId]
    );

    const totalQuestions  = answers.length;
    const correctAnswers  = answers.filter(a => a.is_correct).length;
    const mcqQuestions    = answers.filter(a => a.question_type === 'mcq');
    const codingQuestions = answers.filter(a => a.question_type === 'coding');
    const mcqCorrect      = mcqQuestions.filter(a => a.is_correct).length;
    const codingCorrect   = codingQuestions.filter(a => a.is_correct).length;

    const violations = await db.query(
      `SELECT event_type, COUNT(*) as count
       FROM monitoring_logs WHERE assignment_id = ?
       GROUP BY event_type`,
      [assignmentId]
    );

    const percentage = assignment.percentage || 0;
    const passed     = assignment.result_status === 'pass';

    res.json({
      success: true,
      data: {
        assignment: {
          assignmentId:  assignment.assignment_id,
          testTitle:     assignment.test_title,
          score:         assignment.score,
          totalMarks:    assignment.total_marks,
          percentage:    assignment.percentage,
          passed,
          completedAt:   assignment.submitted_at,
        },
        statistics: {
          totalQuestions,
          correctAnswers,
          wrongAnswers: totalQuestions - correctAnswers,
          accuracy: totalQuestions > 0 ? ((correctAnswers / totalQuestions) * 100).toFixed(1) : 0,
          mcq: {
            total:    mcqQuestions.length,
            correct:  mcqCorrect,
            accuracy: mcqQuestions.length > 0 ? ((mcqCorrect / mcqQuestions.length) * 100).toFixed(1) : 0,
          },
          coding: {
            total:    codingQuestions.length,
            correct:  codingCorrect,
            accuracy: codingQuestions.length > 0 ? ((codingCorrect / codingQuestions.length) * 100).toFixed(1) : 0,
          },
        },
        proctoring: {
          tabSwitches: assignment.total_tab_switches || 0,
          windowBlurs: assignment.total_window_blurs || 0,
          violations:  violations.reduce((acc, v) => { acc[v.event_type] = v.count; return acc; }, {}),
          status:      assignment.is_suspicious ? 'Flagged' : 'Normal',
        },
        answers: answers.map(a => ({
          questionId:     a.question_id,
          questionText:   a.question_text,
          questionType:   a.question_type,
          marks:          a.marks,
          marksObtained:  a.marks_obtained,
          isCorrect:      a.is_correct,
          selectedOption: a.selected_option,
          correctOption:  a.correct_option,
          codeAnswer:     a.code_answer,
        })),
      },
    });
  } catch (error) {
    console.error('Get candidate result error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch result' });
  }
};

// ─────────────────────────────────────────────
// GET /api/reports/test/:testId
// Recruiter views a test's full report
// ─────────────────────────────────────────────
const getTestReport = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.userId; // FIX B-06

    const tests = await db.query(
      'SELECT * FROM tests WHERE test_id = ? AND recruiter_id = ?',
      [testId, userId]
    );
    if (tests.length === 0)
      return res.status(404).json({ success: false, message: 'Test not found' });

    const test = tests[0];

    const candidates = await db.query(
      `SELECT
        tc.assignment_id, tc.candidate_id, tc.result_status,
        tc.score, tc.percentage,
        tc.total_tab_switches, tc.total_window_blurs,
        tc.is_suspicious, tc.started_at, tc.submitted_at,
        u.full_name, u.email
       FROM test_candidates tc
       JOIN users u ON tc.candidate_id = u.user_id
       WHERE tc.test_id = ?
       ORDER BY tc.percentage DESC`,
      [testId]
    );

    const completedCandidates  = candidates.filter(c => c.submitted_at !== null);
    const inProgressCandidates = candidates.filter(c => c.started_at !== null && c.submitted_at === null);
    const notStartedCandidates = candidates.filter(c => c.started_at === null);

    const scores       = completedCandidates.map(c => c.percentage || 0);
    const averageScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : 0;
    const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
    const lowestScore  = scores.length > 0 ? Math.min(...scores) : 0;
    const passedCount  = completedCandidates.filter(c => c.percentage >= (test.passing_percentage || 50)).length;
    const passRate     = completedCandidates.length > 0
      ? ((passedCount / completedCandidates.length) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        test: {
          testId:            test.test_id,
          testTitle:         test.test_title,
          totalMarks:        test.total_marks,
          passingPercentage: test.passing_percentage,
          durationMinutes:   test.duration_minutes,
        },
        statistics: {
          totalCandidates: candidates.length,
          completed:        completedCandidates.length,
          inProgress:       inProgressCandidates.length,
          notStarted:       notStartedCandidates.length,
          averageScore, highestScore, lowestScore, passedCount, passRate,
          scoreDistribution: {
            '90-100':   completedCandidates.filter(c => c.percentage >= 90).length,
            '80-89':    completedCandidates.filter(c => c.percentage >= 80 && c.percentage < 90).length,
            '70-79':    completedCandidates.filter(c => c.percentage >= 70 && c.percentage < 80).length,
            '60-69':    completedCandidates.filter(c => c.percentage >= 60 && c.percentage < 70).length,
            '50-59':    completedCandidates.filter(c => c.percentage >= 50 && c.percentage < 60).length,
            'Below 50': completedCandidates.filter(c => c.percentage < 50).length,
          },
        },
        proctoring: {
          suspiciousCandidates: candidates.filter(c => c.is_suspicious).length,
          highViolations: candidates.filter(c => (c.total_tab_switches || 0) >= (test.max_tab_switches || 3)).length,
        },
        candidates: candidates.map(c => ({
          assignmentId: c.assignment_id,
          candidateId:  c.candidate_id,
          name:         c.full_name,
          email:        c.email,
          status:       c.submitted_at ? 'completed' : c.started_at ? 'in_progress' : 'not_started',
          resultStatus: c.result_status,
          score:        c.score,
          percentage:   c.percentage,
          tabSwitches:  c.total_tab_switches,
          windowBlurs:  c.total_window_blurs,
          isSuspicious: c.is_suspicious,
          startedAt:    c.started_at,
          completedAt:  c.submitted_at,
        })),
      },
    });
  } catch (error) {
    console.error('Get test report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch test report' });
  }
};

// ─────────────────────────────────────────────
// GET /api/reports/candidate/:assignmentId/detailed
// Recruiter views detailed candidate report
// ─────────────────────────────────────────────
const getDetailedCandidateReport = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const userId = req.userId; // FIX B-06

    const assignments = await db.query(
      `SELECT tc.*, t.test_title, t.total_marks, t.passing_percentage, u.full_name, u.email
       FROM test_candidates tc
       JOIN tests t ON tc.test_id = t.test_id
       JOIN users u ON tc.candidate_id = u.user_id
       WHERE tc.assignment_id = ? AND t.recruiter_id = ?`,
      [assignmentId, userId]
    );
    if (assignments.length === 0)
      return res.status(404).json({ success: false, message: 'Assignment not found' });

    const assignment = assignments[0];

    const answers = await db.query(
      `SELECT
        a.answer_id, a.question_id,
        a.selected_option, a.code_answer, a.selected_language,
        a.is_correct, a.marks_obtained,
        a.time_spent_seconds, a.answered_at,
        q.question_number, q.question_text, q.question_type,
        q.marks, q.correct_option,
        q.option_a, q.option_b, q.option_c, q.option_d
       FROM answers a
       JOIN questions q ON a.question_id = q.question_id
       WHERE a.assignment_id = ?
       ORDER BY q.question_number`,
      [assignmentId]
    );

    const logs = await db.query(
      `SELECT log_id, event_type, event_description, severity, snapshot_url, logged_at
       FROM monitoring_logs WHERE assignment_id = ? ORDER BY logged_at ASC`,
      [assignmentId]
    );

    const snapshots = await db.query(
      `SELECT snapshot_url, logged_at FROM monitoring_logs
       WHERE assignment_id = ? AND snapshot_url IS NOT NULL ORDER BY logged_at ASC`,
      [assignmentId]
    );

    res.json({
      success: true,
      data: {
        candidate: {
          name:         assignment.full_name,
          email:        assignment.email,
          assignmentId: assignment.assignment_id,
        },
        test: {
          testTitle:         assignment.test_title,
          totalMarks:        assignment.total_marks,
          passingPercentage: assignment.passing_percentage,
        },
        result: {
          status:      assignment.submitted_at ? 'completed' : assignment.started_at ? 'in_progress' : 'not_started',
          score:       assignment.score,
          percentage:  assignment.percentage,
          passed:      assignment.result_status === 'pass',
          startedAt:   assignment.started_at,
          completedAt: assignment.submitted_at,
        },
        proctoring: {
          tabSwitches:      assignment.total_tab_switches,
          windowBlurs:      assignment.total_window_blurs,
          isSuspicious:     assignment.is_suspicious,
          locationVerified: assignment.location_verified,
          webcamVerified:   assignment.webcam_verified,
        },
        answers: answers.map(a => ({
          questionNumber:   a.question_number,
          questionText:     a.question_text,
          questionType:     a.question_type,
          marks:            a.marks,
          marksObtained:    a.marks_obtained,
          isCorrect:        a.is_correct,
          selectedOption:   a.selected_option,
          correctOption:    a.correct_option,
          options: a.question_type === 'mcq'
            ? { a: a.option_a, b: a.option_b, c: a.option_c, d: a.option_d } : null,
          codeAnswer:       a.code_answer,
          selectedLanguage: a.selected_language,
          timeSpent:        a.time_spent_seconds,
          answeredAt:       a.answered_at,
        })),
        logs: logs.map(l => ({
          logId:       l.log_id,
          eventType:   l.event_type,
          description: l.event_description,
          severity:    l.severity,
          snapshotUrl: l.snapshot_url,
          timestamp:   l.logged_at,
        })),
        snapshots: snapshots.map(s => ({ url: s.snapshot_url, timestamp: s.logged_at })),
      },
    });
  } catch (error) {
    console.error('Get detailed candidate report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch detailed report' });
  }
};

// ─────────────────────────────────────────────
// GET /api/reports/test/:testId/analytics
// Chart data for recruiter
// ─────────────────────────────────────────────
const getTestAnalytics = async (req, res) => {
  try {
    const { testId } = req.params;
    const userId = req.userId; // FIX B-06

    const tests = await db.query(
      'SELECT * FROM tests WHERE test_id = ? AND recruiter_id = ?',
      [testId, userId]
    );
    if (tests.length === 0)
      return res.status(404).json({ success: false, message: 'Test not found' });

    const candidates = await db.query(
      `SELECT percentage, submitted_at
       FROM test_candidates
       WHERE test_id = ? AND submitted_at IS NOT NULL
       ORDER BY submitted_at ASC`,
      [testId]
    );

    const scoreDistribution = [
      { range: '0-20',   count: candidates.filter(c => c.percentage < 20).length },
      { range: '20-40',  count: candidates.filter(c => c.percentage >= 20 && c.percentage < 40).length },
      { range: '40-60',  count: candidates.filter(c => c.percentage >= 40 && c.percentage < 60).length },
      { range: '60-80',  count: candidates.filter(c => c.percentage >= 60 && c.percentage < 80).length },
      { range: '80-100', count: candidates.filter(c => c.percentage >= 80).length },
    ];

    const completionByDay = {};
    candidates.forEach(c => {
      const date = new Date(c.submitted_at).toISOString().split('T')[0];
      completionByDay[date] = (completionByDay[date] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        scoreDistribution,
        completionTimeline: Object.entries(completionByDay).map(([date, count]) => ({ date, count })),
      },
    });
  } catch (error) {
    console.error('Get test analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};

module.exports = { getCandidateResult, getTestReport, getDetailedCandidateReport, getTestAnalytics };