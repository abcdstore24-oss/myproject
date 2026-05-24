/**
 * executionController.js
 * Handles LeetCode-style code execution and grading
 */

const { runAgainstTestCases, checkDockerAvailable } = require('../services/codeExecutor');
const Question = require('../models/Question');
const Answer = require('../models/Answer');
const TestCandidate = require('../models/TestCandidate');

// ─── Helper: extract driver code for a language from initial_codes ────────────
function getDriverCode(initialCodes, language) {
  if (!initialCodes) return '';
  const key = `_driver_${language.toLowerCase()}`;
  return (initialCodes[key] || '').trim();
}

// ─── Helper: validate request ─────────────────────────────────────────────────
async function validateRequest(req) {
  const { questionId, code, language, testId } = req.body;
  const candidateId = req.userId;

  if (!questionId || !code || !language || !testId) {
    return { error: 'questionId, code, language, and testId are required' };
  }
  if (!code.trim()) {
    return { error: 'Code cannot be empty' };
  }

  const dockerAvailable = await checkDockerAvailable();
  if (!dockerAvailable) {
    return { error: 'Code execution service unavailable. Please ensure Docker is running.' };
  }

  const question = await Question.getById(questionId);
  if (!question) return { error: 'Question not found' };
  if (question.question_type !== 'coding') return { error: 'Not a coding question' };
  if (!question.test_cases || question.test_cases.length === 0) {
    return { error: 'No test cases defined for this question' };
  }

  const assignment = await TestCandidate.getAssignment(testId, candidateId);
  if (!assignment) return { error: 'You are not assigned to this test' };
  if (assignment.submitted_at) return { error: 'Test already submitted' };

  return { question, assignment };
}

/**
 * POST /api/execution/run
 * Run code against visible test cases ("Run Code" button during exam)
 */
const runCode = async (req, res) => {
  try {
    const { code, language } = req.body;
    const validated = await validateRequest(req);

    if (validated.error) {
      return res.status(400).json({ success: false, message: validated.error });
    }

    const { question } = validated;
    const driverCode = getDriverCode(question.initial_codes, language);

    // Run only visible test cases for the "Run" button
    const visibleTestCases = question.test_cases.filter(tc => !tc.is_hidden);
    const testCasesToRun = visibleTestCases.length > 0 ? visibleTestCases : question.test_cases;

    const executionResult = await runAgainstTestCases(language, code, driverCode, testCasesToRun);

    const hiddenCount = question.test_cases.length - testCasesToRun.length;

    res.json({
      success: true,
      data: {
        ...executionResult,
        hiddenCount,
        note: hiddenCount > 0
          ? `${hiddenCount} hidden test case(s) will be evaluated on submit.`
          : null,
      },
    });
  } catch (error) {
    console.error('Run code error:', error.message);
    res.status(500).json({ success: false, message: 'Execution failed: ' + error.message });
  }
};

/**
 * POST /api/execution/grade
 * Run code against ALL test cases and update marks (called on final submit)
 */
const gradeCode = async (req, res) => {
  try {
    const { code, language } = req.body;
    const validated = await validateRequest(req);

    if (validated.error) {
      return res.status(400).json({ success: false, message: validated.error });
    }

    const { question, assignment } = validated;
    const driverCode = getDriverCode(question.initial_codes, language);

    // All test cases — including hidden
    const executionResult = await runAgainstTestCases(language, code, driverCode, question.test_cases);

    // Proportional marks: passed/total × question.marks
    const marksObtained = executionResult.totalCount > 0
      ? parseFloat(((executionResult.passedCount / executionResult.totalCount) * question.marks).toFixed(2))
      : 0;

    // Update answer record
    const existingAnswer = await Answer.getAnswer(assignment.assignment_id, question.question_id);
    if (existingAnswer) {
      await Answer.updateCodingMarks(existingAnswer.answer_id, marksObtained);
    }

    res.json({
      success: true,
      data: {
        ...executionResult,
        marksObtained,
        totalMarks: question.marks,
      },
    });
  } catch (error) {
    console.error('Grade code error:', error.message);
    res.status(500).json({ success: false, message: 'Grading failed: ' + error.message });
  }
};

module.exports = { runCode, gradeCode };