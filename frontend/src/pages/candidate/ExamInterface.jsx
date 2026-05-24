/**
 * ExamInterface.jsx - FIXED (mobile UI improvements)
 * Fixes: mobile top bar layout, Q-Nav overlap, timer display on small screens
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as examApi from '../../api/examApi';
import CodeEditor from '../../components/exam/CodeEditor';
import { useSocket } from '../../context/SocketContext';
import * as monitoringApi from '../../api/monitoringApi';
import WebcamCapture from '../../components/exam/WebcamCapture';
import ProctoringWarning from '../../components/exam/ProctoringWarning';
import ProctoringStats from '../../components/exam/ProctoringStats';
import WebcamPreview from '../../components/exam/WebcamPreview';

import { useAIProctor } from '../../hooks/useAIProctor';
import { useObjectDetector } from '../../hooks/useObjectDetector';
import { useCam2Detector } from '../../hooks/useCam2Detector';

const ExamInterface = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { emitProctoringEvent, sendHeartbeat, on, off } = useSocket();

  // State
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [sections, setSections] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [visitedQuestions, setVisitedQuestions] = useState(new Set([0]));
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoSubmitting, setAutoSubmitting] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [assignment, setAssignment] = useState(null);
  const [proctoringEnabled, setProctoringEnabled] = useState(true);
  const [proctoringWarning, setProctoringWarning] = useState(null);
  const [proctoringStats, setProctoringStats] = useState({
    tabSwitches: 0,
    windowBlurs: 0,
    copyPaste: 0,
    totalViolations: 0,
  });
  const [webcamActive, setWebcamActive] = useState(false);
  const [executionResults, setExecutionResults] = useState({});
  const [runningCode, setRunningCode] = useState(false);
  const [timeExpired, setTimeExpired] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  const autoSaveTimeoutRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const webcamStopRef = useRef(null);
  const webcamPreviewStopRef = useRef(null);
  const webcamVideoRef = useRef(null);

  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth > 900);

  useEffect(() => {
    loadExamData();
    return () => {
      clearInterval(timerIntervalRef.current);
      clearTimeout(autoSaveTimeoutRef.current);
    };
  }, [testId]);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth > 900);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadExamData = async () => {
    try {
      setLoading(true);

      let examData;
      if (location.state?.test && location.state?.questions) {
        examData = location.state;
      } else {
        const response = await examApi.getExamSession(testId);
        examData = response.data;
      }

      if (!examData || !examData.test) {
        throw new Error('Test data not found');
      }

      if (!examData.assignment) {
        throw new Error('Assignment not found. Please start the test from pre-exam checks.');
      }

      if (!examData.assignment.started_at) {
        throw new Error('Test not started. Please complete pre-exam verification first.');
      }

      setTest(examData.test);
      setQuestions(examData.questions || []);
      setSections(examData.sections || []);
      setAssignment(examData.assignment);

      const answerMap = {};
      if (examData.answers) {
        examData.answers.forEach((ans) => {
          answerMap[ans.question_id] = {
            selectedOption: ans.selected_option,
            codeAnswer: ans.code_answer,
            selectedLanguage: ans.selected_language,
          };
        });
      }
      setAnswers(answerMap);

      if (examData.assignment.started_at && examData.test.duration_minutes) {
        const startTime = new Date(examData.assignment.started_at);
        const durationMs = examData.test.duration_minutes * 60 * 1000;
        const personalEnd = new Date(startTime.getTime() + durationMs);
        const testWindowEnd = new Date(examData.test.end_time);
        const effectiveEnd = personalEnd < testWindowEnd ? personalEnd : testWindowEnd;
        const now = new Date();
        const remaining = Math.max(0, Math.floor((effectiveEnd - now) / 1000));
        setTimeRemaining(remaining);
        startTimer();
      } else {
        setAlert({ type: 'error', message: 'Unable to calculate test duration' });
      }
    } catch (error) {
      console.error('Load exam data error:', error);
      setAlert({
        type: 'error',
        message: error.message || error.response?.data?.message || 'Failed to load exam',
      });
      setTimeout(() => {
        navigate(`/candidate/tests/${testId}/pre-exam`);
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const logProctoringEvent = async (eventType, eventDescription, severity = 'medium') => {
    try {
      await monitoringApi.logEvent({
        testId: parseInt(testId),
        eventType,
        eventDescription,
        severity,
      });

      emitProctoringEvent({
        testId: parseInt(testId),
        eventType,
        eventDescription,
        severity,
      });

      setProctoringStats(prev => {
        const newStats = { ...prev };
        if (eventType === 'tab_switch') newStats.tabSwitches += 1;
        else if (eventType === 'window_blur') newStats.windowBlurs += 1;
        else if (eventType === 'copy_attempt' || eventType === 'paste_attempt') newStats.copyPaste += 1;
        newStats.totalViolations = newStats.tabSwitches + newStats.windowBlurs + newStats.copyPaste;
        return newStats;
      });

      // Read current value directly from ref for immediate logic
      const updatedStats = {
        tabSwitches:     proctoringStats.tabSwitches     + (eventType === 'tab_switch'    ? 1 : 0),
        windowBlurs:     proctoringStats.windowBlurs     + (eventType === 'window_blur'   ? 1 : 0),
        copyPaste:       proctoringStats.copyPaste        + (['copy_attempt','paste_attempt'].includes(eventType) ? 1 : 0),
      };
      updatedStats.totalViolations = updatedStats.tabSwitches + updatedStats.windowBlurs + updatedStats.copyPaste;

      const maxTabSwitches = test?.max_tab_switches || 3;

      const warningMessages = {
        tab_switch: {
          title: '⚠️ Tab Switch Detected',
          message: 'You switched tabs or minimized the window. This activity is being monitored.',
          count: `Tab switches: ${updatedStats?.tabSwitches ?? 0}/${maxTabSwitches}`,
        },
        window_blur: {
          title: '⚠️ Window Focus Lost',
          message: 'The exam window lost focus. Please stay focused on the test.',
          count: `Window blurs: ${updatedStats?.windowBlurs ?? 0}`,
        },
        copy_attempt: {
          title: '🚨 Copy Attempt Detected',
          message: 'Copying content is not allowed during the exam.',
          count: `Copy/Paste attempts: ${updatedStats?.copyPaste ?? 0}`,
        },
        paste_attempt: {
          title: '🚨 Paste Attempt Detected',
          message: 'Pasting content is not allowed during the exam.',
          count: `Copy/Paste attempts: ${updatedStats?.copyPaste ?? 0}`,
        },
        right_click: {
          title: 'ℹ️ Right-Click Disabled',
          message: 'Right-click is disabled during the exam.',
          count: null,
        },
        fullscreen_exit: {
          title: '⚠️ Fullscreen Exited',
          message: 'Please return to fullscreen mode.',
          count: null,
        },
      };

      const warning = warningMessages[eventType];
      if (warning) {
        setProctoringWarning({ ...warning, severity });
      }

      if (
        eventType === 'tab_switch' &&
        updatedStats &&
        updatedStats.tabSwitches >= maxTabSwitches
      ) {
        setProctoringWarning({
          title: '⛔ Exam Auto-Submitted',
          message: `You exceeded the maximum number of tab switches (${maxTabSwitches}). Your exam has been automatically submitted.`,
          count: null,
          severity: 'critical',
        });
        setTimeout(() => handleAutoSubmit(), 2000);
      }
    } catch (error) {
      console.error('Failed to log proctoring event:', error);
    }
  };

  const handleWebcamReady = () => setWebcamActive(true);

  useEffect(() => {
    if (!test || !proctoringEnabled) return;
    const handleVisibilityChange = () => {
      if (document.hidden) logProctoringEvent('tab_switch', 'Candidate switched tabs or minimized window', 'medium');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [test, proctoringEnabled, testId]);

  useEffect(() => {
    if (!test || !proctoringEnabled) return;
    const handleWindowBlur = () => logProctoringEvent('window_blur', 'Window lost focus - candidate may have switched applications', 'medium');
    window.addEventListener('blur', handleWindowBlur);
    return () => window.removeEventListener('blur', handleWindowBlur);
  }, [test, proctoringEnabled, testId]);

  useEffect(() => {
    if (!test || !proctoringEnabled) return;
    const handleCopy = () => logProctoringEvent('copy_attempt', 'Candidate attempted to copy content', 'high');
    const handlePaste = () => logProctoringEvent('paste_attempt', 'Candidate attempted to paste content', 'high');
    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    return () => { document.removeEventListener('copy', handleCopy); document.removeEventListener('paste', handlePaste); };
  }, [test, proctoringEnabled, testId]);

  useEffect(() => {
    if (!test || !proctoringEnabled) return;
    const handleContextMenu = (e) => { e.preventDefault(); logProctoringEvent('right_click', 'Candidate attempted to right-click', 'low'); };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [test, proctoringEnabled, testId]);

  useEffect(() => {
    if (!test || !proctoringEnabled) return;
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) logProctoringEvent('fullscreen_exit', 'Candidate exited fullscreen mode', 'medium');
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [test, proctoringEnabled, testId]);

  useEffect(() => {
    if (!test || !proctoringEnabled) return;
    const heartbeatInterval = setInterval(() => sendHeartbeat(testId), 10000);
    return () => clearInterval(heartbeatInterval);
  }, [test, proctoringEnabled, testId, sendHeartbeat]);

  const { processFrame: processCam2Frame } = useCam2Detector({
    enabled:     !!test && proctoringEnabled && !!test.enable_second_camera,
    onViolation: (eventType, description, severity) => {
      logProctoringEvent(eventType, description, severity);
    },
  });

  useEffect(() => {
    if (!test) return;
    const handleSecondaryCameraStatus = (data) => {
      if (data.status === 'disconnected') {
        setProctoringWarning({ title: '📱 Second Camera Disconnected', message: 'Your second camera has disconnected. Please reconnect it to avoid violations.', severity: 'high', count: null });
        logProctoringEvent('suspicious_activity', 'Second camera disconnected during exam', 'high');
      } else if (data.status === 'connected') {
        setProctoringWarning(null);
      }
    };
     // ADD — feed Camera 2 frames into COCO-SSD detector
    const handleCam2Frame = (data) => {
      if (data.frame) processCam2Frame(data.frame);
    };

    on('secondary_camera_status', handleSecondaryCameraStatus);
    on('secondary_camera_frame',  handleCam2Frame);              // NEW

    return () => {
      off('secondary_camera_status', handleSecondaryCameraStatus);
      off('secondary_camera_frame',  handleCam2Frame);           // NEW
    };
  }, [test, testId, processCam2Frame]);

  // AI-based proctoring on Camera 1 — no-face, multiple faces, gaze, distance
  useAIProctor({
    videoRef:    webcamVideoRef,
    enabled:     !!test && proctoringEnabled && !!test.enable_webcam,
    onViolation: (eventType, description, severity) => {
      logProctoringEvent(eventType, description, severity);
    },
  });

  // Object detection — phone and unauthorised person
  useObjectDetector({
    videoRef:    webcamVideoRef,
    enabled:     !!test && proctoringEnabled && !!test.enable_webcam,
    onViolation: (eventType, description, severity) => {
      logProctoringEvent(eventType, description, severity);
    },
  });

  const startTimer = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) { clearInterval(timerIntervalRef.current); handleAutoSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];

  const handleAnswerChange = useCallback((questionId, answerData) => {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], ...answerData } }));
    triggerAutoSave(questionId, answerData);
  }, []);

  const triggerAutoSave = (questionId, answerData) => {
    if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
    autoSaveTimeoutRef.current = setTimeout(() => saveAnswerToBackend(questionId, answerData), 2000);
  };

  const saveAnswerToBackend = async (questionId, answerData) => {
    if (timeExpired) return;
    try {
      setAutoSaving(true);
      await examApi.saveAnswer(testId, questionId, {
        selectedOption: answerData.selectedOption,
        codeAnswer: answerData.codeAnswer,
        selectedLanguage: answerData.selectedLanguage,
        timeSpent: 0,
      });
      setAutoSaving(false);
    } catch (error) {
      console.error('Auto-save error:', error);
      setAutoSaving(false);
    }
  };

  const handleMCQSelection = (option) => handleAnswerChange(currentQuestion.question_id, { selectedOption: option });
  const handleCodeChange = (code) => handleAnswerChange(currentQuestion.question_id, { codeAnswer: code });

  const handleLanguageChange = (language) => {
    const qId = questions[currentQuestionIndex]?.question_id;
    if (qId) setExecutionResults(prev => { const next = { ...prev }; delete next[qId]; return next; });
    handleAnswerChange(currentQuestion.question_id, { selectedLanguage: language });
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
    setVisitedQuestions((prev) => new Set([...prev, index]));
    setShowMobileNav(false); // ✅ Close mobile nav when question selected
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const newIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(newIndex);
      setVisitedQuestions((prev) => new Set([...prev, newIndex]));
    }
  };

  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      const newIndex = currentQuestionIndex - 1;
      setCurrentQuestionIndex(newIndex);
      setVisitedQuestions((prev) => new Set([...prev, newIndex]));
    }
  };

  const isQuestionAnswered = (questionId) => {
    const answer = answers[questionId];
    if (!answer) return false;
    return answer.selectedOption || answer.codeAnswer;
  };

  const isQuestionVisited = (index) => visitedQuestions.has(index);

  const getAnsweredCount = () => questions.filter((q) => isQuestionAnswered(q.question_id)).length;

  const handleSubmitClick = () => {
    const unanswered = questions.length - getAnsweredCount();
    if (unanswered > 0) {
      if (!window.confirm(`You have ${unanswered} unanswered questions. Are you sure you want to submit?`)) return;
    }
    setShowSubmitModal(true);
  };

  const handleAutoSubmit = async () => {
    if (webcamStopRef.current) webcamStopRef.current();
    if (webcamPreviewStopRef.current) webcamPreviewStopRef.current();
    setTimeExpired(true);
    setProctoringEnabled(false);
    setWebcamActive(false);
    setAutoSubmitting(true);
    await handleSubmitTest();
  };

  const handleSubmitTest = async () => {
    if (webcamStopRef.current) webcamStopRef.current();
    if (webcamPreviewStopRef.current) webcamPreviewStopRef.current();
    setProctoringEnabled(false);
    setWebcamActive(false);
    try {
      setSubmitting(true);
      if (autoSaveTimeoutRef.current) clearTimeout(autoSaveTimeoutRef.current);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      const response = await examApi.submitTest(testId);
      const { show_results_immediately, assignment_id } = response.data;

      const successMsg = show_results_immediately
        ? 'Test submitted! Redirecting to your results...'
        : 'Test submitted! Results will be available once released by the recruiter.';

      setAlert({ type: 'success', message: successMsg });

      setTimeout(() => {
        if (show_results_immediately) {
          navigate(`/candidate/results/${assignment_id || assignment.assignment_id}`);
        } else {
          navigate('/candidate/dashboard');
        }
      }, 3000);
    } catch (error) {
      console.error('Submit test error:', error);
      setAlert({ type: 'error', message: error.response?.data?.message || 'Failed to submit test' });
      setSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  const handleRunCode = async () => {
    const question = questions[currentQuestionIndex];
    if (!question || question.question_type !== 'coding') return;

    const currentAnswer = answers[question.question_id];
    if (!currentAnswer?.codeAnswer?.trim()) {
      setAlert({ type: 'error', message: 'Please write some code before running' });
      return;
    }
    if (!currentAnswer?.selectedLanguage) {
      setAlert({ type: 'error', message: 'Please select a language first' });
      return;
    }

    setRunningCode(true);
    setExecutionResults(prev => ({ ...prev, [question.question_id]: { running: true } }));

    try {
      const response = await examApi.runCode(
        question.question_id,
        currentAnswer.codeAnswer,
        currentAnswer.selectedLanguage,
        testId
      );

      if (response.success) {
        setExecutionResults(prev => ({
          ...prev,
          [question.question_id]: { running: false, ...response.data },
        }));
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Execution failed';
      setExecutionResults(prev => ({ ...prev, [question.question_id]: { running: false, error: message } }));
      setAlert({ type: 'error', message });
    } finally {
      setRunningCode(false);
    }
  };

  const isUrgent  = timeRemaining < 300;
  const isWarning = timeRemaining < 600;
  const timerColor = isUrgent ? '#EF4444' : isWarning ? '#F59E0B' : '#34D399';

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'var(--s0)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:44, height:44, borderRadius:'50%', border:'3px solid var(--s5)', borderTopColor:'#6366F1', animation:'spin 0.9s linear infinite', margin:'0 auto 16px' }} />
        <p style={{ fontSize:14, color:'var(--text-2)' }}>Loading exam…</p>
      </div>
    </div>
  );

  if (!test || questions.length === 0) return (
    <div style={{ minHeight:'100vh', background:'var(--s0)', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:15, color:'var(--text-2)', marginBottom:20 }}>Unable to load exam</p>
        <button onClick={() => navigate('/candidate/dashboard')} style={{
          padding:'10px 24px', borderRadius:10, background:'var(--s3)',
          border:'1px solid var(--border-2)', color:'var(--text-1)',
          cursor:'pointer', fontFamily:'DM Sans, sans-serif', fontWeight:600,
        }}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );

  const answeredCount  = questions.filter(q => isQuestionAnswered(q.question_id)).length;
  const currentAnswer  = answers[currentQuestion?.question_id] || {};
  const execResult     = executionResults[currentQuestion?.question_id];
  const currentSection = sections.find(s => s.section_id === currentQuestion?.section_id);

  return (
    <div style={{ minHeight:'100vh', background:'var(--s0)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <style>{`
        @keyframes spin         { to { transform: rotate(360deg); } }
        @keyframes glowPulse    { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes fadeUp       { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes timerPulse   { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes slideInRight { from{transform:translateX(100%)} to{transform:translateX(0)} }
        input[type=radio] { display:none; }

        /* ── Desktop nav panel ── */
        .exam-nav-panel {
          width: 260px;
          flex-shrink: 0;
        }

        /* ── Mobile: slide-in nav overlay ── */
        @media (max-width: 900px) {
          .exam-nav-panel {
            position: fixed !important;
            top: 0 !important;
            right: 0 !important;
            bottom: 0 !important;
            width: 280px !important;
            z-index: 150 !important;
            box-shadow: -8px 0 40px rgba(0,0,0,0.6) !important;
            animation: slideInRight 0.3s cubic-bezier(0.16,1,0.3,1);
            /* Ensure it goes below the top bar */
            padding-top: 24px !important;
          }

          /* ── MOBILE HEADER: stack into 2 rows ── */
          .exam-topbar {
            height: auto !important;
            flex-direction: column !important;
            padding: 8px 12px !important;
            gap: 6px !important;
            align-items: stretch !important;
          }

          /* Row 1: logo+title LEFT, timer CENTER, submit RIGHT */
          .exam-topbar-row1 {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
          }

          /* Row 2: meta info + nav toggle */
          .exam-topbar-row2 {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            width: 100% !important;
          }

          .exam-topbar-title {
            font-size: 12px !important;
            max-width: 110px !important;
          }

          .exam-timer-val {
            font-size: 18px !important;
          }

          .exam-submit-btn {
            padding: 6px 12px !important;
            font-size: 12px !important;
          }
        }

        /* Hide on desktop */
        .exam-topbar-row1 { display: contents; }
        .exam-topbar-row2 { display: none; }

        @media (min-width: 901px) {
          .exam-topbar-row2 { display: none !important; }
          .exam-mobile-backdrop { display: none !important; }
          .exam-nav-toggle { display: none !important; }
        }
      `}</style>

      {/* ── Top Bar ── */}
      <header className="exam-topbar" style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
        background: 'var(--topbar-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-1)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        {/* ── ROW 1 (visible on both mobile & desktop) ── */}
        <div className="exam-topbar-row1" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          gap: 8,
        }}>
          {/* Left: Logo + test name */}
          <div style={{ display:'flex', alignItems:'center', gap:10, minWidth:0, flex:1 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg,#10B981,#059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <div className="exam-topbar-title" style={{
              fontFamily: 'Syne, sans-serif', fontSize: 13.5, fontWeight: 700,
              color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden',
              textOverflow: 'ellipsis', maxWidth: 220,
            }}>
              {test.test_title}
            </div>
          </div>

          {/* Center: Timer */}
          <div style={{ textAlign:'center', flexShrink:0 }}>
            <div className="exam-timer-val" style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 20, fontWeight: 700,
              color: timerColor, lineHeight: 1,
              animation: isUrgent ? 'timerPulse 1s ease-in-out infinite' : 'none',
              textShadow: isUrgent ? `0 0 20px ${timerColor}60` : 'none',
            }}>
              {formatTime(timeRemaining)}
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-3)', marginTop: 1, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Time Left
            </div>
          </div>

          {/* Right: violations + submit */}
          <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            {proctoringStats.totalViolations > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '3px 8px', borderRadius: 20,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                fontSize: 11, fontWeight: 700, color: '#FCA5A5',
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
                {proctoringStats.totalViolations}
              </div>
            )}
            <button
              className="exam-submit-btn"
              onClick={handleSubmitClick}
              disabled={submitting}
              style={{
                padding: '7px 18px', borderRadius: 9, fontSize: 13, fontWeight: 700,
                background: submitting ? 'var(--s4)' : 'linear-gradient(135deg,#10B981,#059669)',
                border: 'none', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer',
                boxShadow: submitting ? 'none' : '0 0 16px rgba(16,185,129,0.35)',
                fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
              }}
            >
              {submitting
                ? <><div style={{ width:12, height:12, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.25)', borderTopColor:'white', animation:'spin 0.7s linear infinite' }} /></>
                : <><span>Submit</span> <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></>
              }
            </button>
          </div>
        </div>

        {/* ── ROW 2: mobile only — meta info + Q-Nav toggle ── */}
        <div className="exam-topbar-row2" style={{
          display: 'none', // overridden by media query on mobile
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          paddingTop: 2,
          borderTop: '1px solid var(--border-1)',
        }}>
          {/* Meta: Q count + answered + saving */}
          <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:'var(--text-3)' }}>
            <span>Q {currentQuestionIndex + 1}/{questions.length}</span>
            <span>·</span>
            <span>{answeredCount} answered</span>
            {autoSaving && (
              <>
                <span>·</span>
                <span style={{ color:'#818CF8', display:'flex', alignItems:'center', gap:4 }}>
                  <span style={{ width:5, height:5, borderRadius:'50%', background:'#818CF8', display:'inline-block', animation:'glowPulse 1s ease-in-out infinite' }} />
                  Saving…
                </span>
              </>
            )}
          </div>

          {/* Q-Nav toggle */}
          <button
            className="exam-nav-toggle"
            onClick={() => setShowMobileNav(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 7,
              background: showMobileNav ? 'rgba(99,102,241,0.15)' : 'var(--s3)',
              border: `1px solid ${showMobileNav ? 'rgba(99,102,241,0.3)' : 'var(--border-2)'}`,
              color: showMobileNav ? '#818CF8' : 'var(--text-2)',
              cursor: 'pointer', fontSize: 11, fontWeight: 700,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
            Q-Nav
          </button>
        </div>

        {/* Desktop: meta info in same row (hidden on mobile via row2) */}
        <div className="exam-topbar-desktop-meta" style={{
          // Only shown on desktop, injected via CSS below
        }} />
      </header>

      {/* Desktop sub-info strip — shown only on desktop inside header via absolute trick */}
      {/* Actually we handle via the header's left block — replicate below for desktop */}

      {/* ── Alert banner ── */}
      {alert && (
        <div style={{
          padding: '10px 16px', flexShrink: 0,
          background: alert.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          borderBottom: `1px solid ${alert.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize:15 }}>{alert.type === 'success' ? '✅' : '⚠️'}</span>
          <span style={{ fontSize:13, color: alert.type === 'success' ? '#34D399' : '#FCA5A5', flex:1 }}>{alert.message}</span>
          <button onClick={() => setAlert(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:18, lineHeight:1, padding:2 }}>×</button>
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ flex:1, display:'flex', overflow:'hidden', minHeight:0 }}>

        {/* ── Left: Question Panel ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 16px', minWidth:0 }} className="custom-scrollbar">

          {/* Section breadcrumb */}
          {currentSection && (
            <div style={{ marginBottom:14, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
              <span style={{
                padding:'3px 12px', borderRadius:20,
                background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)',
                fontSize:11, fontWeight:700, color:'#818CF8', letterSpacing:'0.05em', textTransform:'uppercase',
              }}>
                {currentSection.title}
              </span>
              {currentSection.description && (
                <span style={{ fontSize:12, color:'var(--text-3)' }}>{currentSection.description}</span>
              )}
            </div>
          )}

          {/* Question card */}
          <div style={{
            background:'var(--s2)', border:'1px solid var(--border-1)',
            borderRadius:16, overflow:'hidden',
            boxShadow:'var(--shadow-md)',
            animation:'fadeUp 0.3s both',
          }} key={currentQuestion.question_id}>

            {/* Question header */}
            <div style={{
              padding:'14px 18px', borderBottom:'1px solid var(--border-1)',
              background:'var(--s1)', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{
                  width:30, height:30, borderRadius:8,
                  background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'Syne, sans-serif', fontSize:13, fontWeight:800, color:'#818CF8',
                }}>
                  {currentQuestion.question_number}
                </div>
                <span style={{ fontSize:13, fontWeight:600, color:'var(--text-2)' }}>
                  Q {currentQuestionIndex + 1} of {questions.length}
                </span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                <span style={{
                  padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700,
                  background: currentQuestion.question_type === 'mcq' ? 'rgba(99,102,241,0.12)' : 'rgba(139,92,246,0.12)',
                  color: currentQuestion.question_type === 'mcq' ? '#818CF8' : '#A78BFA',
                  border: `1px solid ${currentQuestion.question_type === 'mcq' ? 'rgba(99,102,241,0.25)' : 'rgba(139,92,246,0.25)'}`,
                  letterSpacing:'0.04em', textTransform:'uppercase',
                }}>
                  {currentQuestion.question_type === 'mcq' ? 'MCQ' : 'Coding'}
                </span>
                <span style={{
                  padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700,
                  background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)',
                  color:'#FCD34D', letterSpacing:'0.04em',
                }}>
                  {currentQuestion.marks} {currentQuestion.marks === 1 ? 'mark' : 'marks'}
                </span>
                {currentQuestion.difficulty && (
                  <span style={{
                    padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, letterSpacing:'0.04em',
                    background: currentQuestion.difficulty === 'easy' ? 'rgba(16,185,129,0.1)' : currentQuestion.difficulty === 'hard' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                    color: currentQuestion.difficulty === 'easy' ? '#34D399' : currentQuestion.difficulty === 'hard' ? '#FCA5A5' : '#FCD34D',
                    border: `1px solid ${currentQuestion.difficulty === 'easy' ? 'rgba(16,185,129,0.25)' : currentQuestion.difficulty === 'hard' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                  }}>
                    {currentQuestion.difficulty}
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding:'20px 18px' }}>
              {/* Question text */}
              <div style={{
                fontSize:15, color:'var(--text-1)', lineHeight:1.7,
                marginBottom:22, fontWeight:500,
              }}>
                {currentQuestion.question_text}
              </div>

              {/* ── MCQ Options ── */}
              {currentQuestion.question_type === 'mcq' && (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {['a','b','c','d'].map(opt => {
                    const text = currentQuestion[`option_${opt}`];
                    if (!text) return null;
                    const selected = currentAnswer.selectedOption === opt;
                    return (
                      <div
                        key={opt}
                        onClick={() => handleMCQSelection(opt)}
                        style={{
                          display:'flex', alignItems:'flex-start', gap:12,
                          padding:'13px 16px', borderRadius:12, cursor:'pointer',
                          background: selected ? 'rgba(99,102,241,0.1)' : 'var(--s3)',
                          border: `1px solid ${selected ? '#6366F1' : 'var(--border-1)'}`,
                          boxShadow: selected ? '0 0 0 1px rgba(99,102,241,0.3)' : 'none',
                          transition:'all 0.18s',
                        }}
                      >
                        <div style={{
                          width:20, height:20, borderRadius:'50%', flexShrink:0, marginTop:2,
                          background: selected ? '#6366F1' : 'var(--s5)',
                          border: `2px solid ${selected ? '#6366F1' : 'var(--border-2)'}`,
                          display:'flex', alignItems:'center', justifyContent:'center',
                          transition:'all 0.18s',
                          boxShadow: selected ? '0 0 10px rgba(99,102,241,0.4)' : 'none',
                        }}>
                          {selected && <div style={{ width:8, height:8, borderRadius:'50%', background:'white' }} />}
                        </div>
                        <div style={{ flex:1 }}>
                          <span style={{ fontSize:12, fontWeight:700, color: selected ? '#818CF8' : 'var(--text-3)', textTransform:'uppercase', marginRight:8, letterSpacing:'0.05em' }}>
                            {opt}.
                          </span>
                          <span style={{ fontSize:14, color: selected ? 'var(--text-1)' : 'var(--text-2)', lineHeight:1.55 }}>
                            {text}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Coding Question ── */}
              {currentQuestion.question_type === 'coding' && (
                <div>
                  <div style={{ marginBottom:14 }}>
                    <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:8 }}>
                      Language
                    </p>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {currentQuestion.supported_languages?.map(lang => {
                        const sel = currentAnswer.selectedLanguage === lang;
                        return (
                          <button key={lang} onClick={() => handleLanguageChange(lang)} style={{
                            padding:'6px 14px', borderRadius:8, fontSize:13, fontWeight:600,
                            cursor:'pointer', transition:'all 0.15s',
                            background: sel ? 'rgba(99,102,241,0.15)' : 'var(--s3)',
                            border: `1px solid ${sel ? 'rgba(99,102,241,0.4)' : 'var(--border-2)'}`,
                            color: sel ? '#818CF8' : 'var(--text-2)',
                            fontFamily:'JetBrains Mono, monospace',
                          }}>
                            {lang}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ border:'1px solid var(--border-1)', borderRadius:12, overflow:'hidden', marginBottom:12 }}>
                    <div style={{
                      padding:'8px 14px', background:'var(--s1)',
                      borderBottom:'1px solid var(--border-1)',
                      display:'flex', alignItems:'center', gap:8,
                    }}>
                      {['#FF5F57','#FEBC2E','#28C840'].map(c => (
                        <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c }} />
                      ))}
                      <span style={{ fontSize:11, color:'var(--text-3)', fontFamily:'JetBrains Mono, monospace', marginLeft:4 }}>
                        {currentAnswer.selectedLanguage || 'select a language'}
                      </span>
                    </div>
                    <CodeEditor
                      value={currentAnswer.codeAnswer || ''}
                      language={currentAnswer.selectedLanguage || 'javascript'}
                      onChange={handleCodeChange}
                      initialCode={(() => {
                        const lang = currentAnswer.selectedLanguage;
                        if (!lang || !currentQuestion.initial_codes) return undefined;
                        const code = currentQuestion.initial_codes[lang];
                        return (typeof code === 'string' && !lang.startsWith('_driver_')) ? code : undefined;
                      })()}
                    />
                  </div>

                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                    <button
                      onClick={handleRunCode}
                      disabled={runningCode || !currentAnswer.selectedLanguage}
                      style={{
                        display:'inline-flex', alignItems:'center', gap:8,
                        padding:'8px 18px', borderRadius:9, fontSize:13, fontWeight:700,
                        background: runningCode ? 'var(--s4)' : 'rgba(16,185,129,0.15)',
                        border:'1px solid rgba(16,185,129,0.3)',
                        color: runningCode ? 'var(--text-3)' : '#34D399',
                        cursor: (runningCode || !currentAnswer.selectedLanguage) ? 'not-allowed' : 'pointer',
                        fontFamily:'DM Sans, sans-serif', transition:'all 0.2s',
                        opacity: !currentAnswer.selectedLanguage ? 0.45 : 1,
                      }}
                    >
                      {runningCode
                        ? <><div style={{ width:12, height:12, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.2)', borderTopColor:'#34D399', animation:'spin 0.7s linear infinite' }} /> Running…</>
                        : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Run Code</>
                      }
                    </button>
                    <span style={{ fontSize:11, color:'var(--text-3)' }}>Visible test cases only</span>
                  </div>

                  {currentQuestion.test_cases?.length > 0 && (
                    <div>
                      <p style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:10 }}>
                        Test Cases
                      </p>
                      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                        {currentQuestion.test_cases.map((tc, idx) => {
                          const tcResult = execResult?.results?.[idx];
                          return (
                            <div key={idx} style={{
                              borderRadius:12, overflow:'hidden',
                              border:`1px solid ${tcResult ? (tcResult.passed ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)') : 'var(--border-1)'}`,
                              background: tcResult ? (tcResult.passed ? 'rgba(16,185,129,0.05)' : 'rgba(239,68,68,0.05)') : 'var(--s3)',
                            }}>
                              <div style={{
                                padding:'8px 14px', display:'flex', alignItems:'center', justifyContent:'space-between',
                                borderBottom:'1px solid var(--border-1)',
                                background:'var(--s2)',
                              }}>
                                <span style={{ fontSize:12, fontWeight:600, color:'var(--text-2)', display:'flex', alignItems:'center', gap:6 }}>
                                  Test {idx + 1}
                                  {tc.is_hidden && <span style={{ fontSize:10, background:'var(--s5)', color:'var(--text-3)', padding:'1px 6px', borderRadius:4 }}>hidden</span>}
                                </span>
                                {tcResult && (
                                  <span style={{
                                    fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                                    background: tcResult.passed ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                    color: tcResult.passed ? '#34D399' : '#FCA5A5',
                                  }}>
                                    {tcResult.passed ? '✓ Passed' : tcResult.timedOut ? '⏱ TLE' : '✗ Failed'}
                                  </span>
                                )}
                              </div>
                              <div style={{ padding:'10px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                                <div>
                                  <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:4, letterSpacing:'0.06em', textTransform:'uppercase' }}>Input</div>
                                  <pre style={{ margin:0, fontSize:12, color:'var(--text-1)', background:'var(--s1)', padding:'6px 10px', borderRadius:6, overflow:'auto', fontFamily:'JetBrains Mono, monospace' }}>
                                    {tc.input || '(none)'}
                                  </pre>
                                </div>
                                {!tc.is_hidden && (
                                  <div>
                                    <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:4, letterSpacing:'0.06em', textTransform:'uppercase' }}>Expected</div>
                                    <pre style={{ margin:0, fontSize:12, color:'var(--text-1)', background:'var(--s1)', padding:'6px 10px', borderRadius:6, overflow:'auto', fontFamily:'JetBrains Mono, monospace' }}>
                                      {tc.expected_output}
                                    </pre>
                                  </div>
                                )}
                              </div>
                              {tcResult && !tcResult.passed && (
                                <div style={{ padding:'0 14px 12px' }}>
                                  {tcResult.actualOutput && (
                                    <div style={{ marginBottom:6 }}>
                                      <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:4, letterSpacing:'0.06em', textTransform:'uppercase' }}>Your Output</div>
                                      <pre style={{ margin:0, fontSize:12, color:'#FCA5A5', background:'rgba(239,68,68,0.06)', padding:'6px 10px', borderRadius:6, overflow:'auto', fontFamily:'JetBrains Mono, monospace' }}>
                                        {tcResult.actualOutput}
                                      </pre>
                                    </div>
                                  )}
                                  {tcResult.stderr && (
                                    <div>
                                      <div style={{ fontSize:10, color:'#EF4444', marginBottom:4, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' }}>Error</div>
                                      <pre style={{ margin:0, fontSize:11.5, color:'#FCA5A5', background:'rgba(239,68,68,0.08)', padding:'8px 12px', borderRadius:6, overflow:'auto', fontFamily:'JetBrains Mono, monospace', whiteSpace:'pre-wrap' }}>
                                        {tcResult.stderr}
                                      </pre>
                                    </div>
                                  )}
                                  {tcResult.timedOut && (
                                    <div style={{ fontSize:12, color:'#F59E0B', fontWeight:600 }}>⏱ Time Limit Exceeded (10s)</div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {execResult?.results && (
                        <div style={{
                          marginTop:10, padding:'10px 16px', borderRadius:10, textAlign:'center',
                          fontSize:13, fontWeight:700,
                          background: execResult.allPassed ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.08)',
                          border: `1px solid ${execResult.allPassed ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.2)'}`,
                          color: execResult.allPassed ? '#34D399' : '#FCD34D',
                        }}>
                          {execResult.passedCount}/{execResult.totalCount} test cases passed
                          {execResult.allPassed ? ' 🎉' : ''}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Prev / Next ── */}
              <div style={{
                display:'flex', justifyContent:'space-between', marginTop:24,
                paddingTop:18, borderTop:'1px solid var(--border-1)',
              }}>
                <button
                  onClick={previousQuestion}
                  disabled={currentQuestionIndex === 0}
                  style={{
                    display:'inline-flex', alignItems:'center', gap:7,
                    padding:'9px 18px', borderRadius:10, fontSize:13, fontWeight:600,
                    background:'var(--s3)', border:'1px solid var(--border-2)',
                    color: currentQuestionIndex === 0 ? 'var(--text-3)' : 'var(--text-1)',
                    cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                    opacity: currentQuestionIndex === 0 ? 0.4 : 1,
                    transition:'all 0.2s', fontFamily:'DM Sans, sans-serif',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                  Previous
                </button>
                <button
                  onClick={nextQuestion}
                  disabled={currentQuestionIndex === questions.length - 1}
                  style={{
                    display:'inline-flex', alignItems:'center', gap:7,
                    padding:'9px 18px', borderRadius:10, fontSize:13, fontWeight:600,
                    background: currentQuestionIndex === questions.length - 1 ? 'var(--s3)' : 'rgba(99,102,241,0.15)',
                    border: `1px solid ${currentQuestionIndex === questions.length - 1 ? 'var(--border-2)' : 'rgba(99,102,241,0.3)'}`,
                    color: currentQuestionIndex === questions.length - 1 ? 'var(--text-3)' : '#818CF8',
                    cursor: currentQuestionIndex === questions.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: currentQuestionIndex === questions.length - 1 ? 0.4 : 1,
                    transition:'all 0.2s', fontFamily:'DM Sans, sans-serif',
                  }}
                >
                  Next
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Navigator Panel ── */}
        {(isDesktop || showMobileNav) && (
        <div style={{
          overflowY:'auto',
          borderLeft:'1px solid var(--border-1)',
          background:'var(--s1)', padding:'18px 14px',
        }} className="exam-nav-panel custom-scrollbar">

          {/* Progress bar */}
          <div style={{
            marginBottom:16, padding:'14px 16px', borderRadius:14,
            background:'var(--s2)', border:'1px solid var(--border-1)',
          }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--text-3)', letterSpacing:'0.07em', textTransform:'uppercase' }}>Progress</span>
              <span style={{ fontSize:13, fontWeight:800, fontFamily:'Syne, sans-serif', color:'#34D399' }}>
                {answeredCount}/{questions.length}
              </span>
            </div>
            <div style={{ height:5, background:'var(--s4)', borderRadius:3, overflow:'hidden' }}>
              <div style={{
                height:'100%', borderRadius:3,
                background:'linear-gradient(90deg,#10B981,#6366F1)',
                width:`${(answeredCount / questions.length) * 100}%`,
                transition:'width 0.4s ease',
              }} />
            </div>
          </div>

          {/* Legend */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:14 }}>
            {[
              { color:'#6366F1', label:'Current' },
              { color:'#10B981', label:'Answered' },
              { color:'#F59E0B', label:'Visited' },
              { color:'var(--s4)', label:'Not visited' },
            ].map(l => (
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text-3)' }}>
                <div style={{ width:10, height:10, borderRadius:3, background:l.color, flexShrink:0 }} />
                {l.label}
              </div>
            ))}
          </div>

          {/* Question grid */}
          {sections.length > 0 ? sections.map(sec => {
            const secQs = questions.map((q,i) => ({q,i})).filter(({q}) => q.section_id === sec.section_id);
            if (!secQs.length) return null;
            return (
              <div key={sec.section_id} style={{ marginBottom:16 }}>
                <p style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8, paddingLeft:2 }}>
                  {sec.title}
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6 }}>
                  {secQs.map(({q,i}) => {
                    const answered = !!isQuestionAnswered(q.question_id);
                    const current  = i === currentQuestionIndex;
                    const visited  = isQuestionVisited(i);
                    const bg = current ? '#6366F1' : answered ? 'rgba(16,185,129,0.2)' : visited ? 'rgba(245,158,11,0.15)' : 'var(--s3)';
                    const bc = current ? '#6366F1' : answered ? 'rgba(16,185,129,0.4)' : visited ? 'rgba(245,158,11,0.3)' : 'var(--border-1)';
                    const tc = current ? 'white' : answered ? '#34D399' : visited ? '#FCD34D' : 'var(--text-3)';
                    return (
                      <button key={q.question_id} onClick={() => goToQuestion(i)} style={{
                        aspectRatio:'1', borderRadius:8, fontSize:12, fontWeight:700,
                        background:bg, border:`1px solid ${bc}`, color:tc,
                        cursor:'pointer', transition:'all 0.15s',
                        boxShadow: current ? '0 0 10px rgba(99,102,241,0.4)' : 'none',
                        fontFamily:'Syne, sans-serif',
                      }}>
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6, marginBottom:16 }}>
              {questions.map((q,i) => {
                const answered = !!isQuestionAnswered(q.question_id);
                const current  = i === currentQuestionIndex;
                const visited  = isQuestionVisited(i);
                const bg = current ? '#6366F1' : answered ? 'rgba(16,185,129,0.2)' : visited ? 'rgba(245,158,11,0.15)' : 'var(--s3)';
                const bc = current ? '#6366F1' : answered ? 'rgba(16,185,129,0.4)' : visited ? 'rgba(245,158,11,0.3)' : 'var(--border-1)';
                const tc = current ? 'white' : answered ? '#34D399' : visited ? '#FCD34D' : 'var(--text-3)';
                return (
                  <button key={q.question_id} onClick={() => goToQuestion(i)} style={{
                    aspectRatio:'1', borderRadius:8, fontSize:12, fontWeight:700,
                    background:bg, border:`1px solid ${bc}`, color:tc,
                    cursor:'pointer', transition:'all 0.15s',
                    boxShadow: current ? '0 0 10px rgba(99,102,241,0.4)' : 'none',
                    fontFamily:'Syne, sans-serif',
                  }}>
                    {i + 1}
                  </button>
                );
              })}
            </div>
          )}

          {/* Proctoring mini stats */}
          {proctoringEnabled && (
            <div style={{
              marginTop:8, padding:'12px 14px', borderRadius:12,
              background:'var(--s2)', border:'1px solid var(--border-1)',
            }}>
              <p style={{ fontSize:10, fontWeight:700, color:'var(--text-3)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:10 }}>
                Proctoring
              </p>
              {[
                { label:'Tab switches',  val:proctoringStats.tabSwitches,  max: test?.max_tab_switches || 3, color:'#F59E0B' },
                { label:'Window blurs',  val:proctoringStats.windowBlurs,  max: null, color:'#8B5CF6' },
                { label:'Copy/Paste',    val:proctoringStats.copyPaste,    max: null, color:'#EF4444' },
              ].map(s => (
                <div key={s.label} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                  <span style={{ fontSize:11, color:'var(--text-3)' }}>{s.label}</span>
                  <span style={{
                    fontSize:12, fontWeight:700, fontFamily:'Syne, sans-serif',
                    color: s.val > 0 ? s.color : 'var(--text-3)',
                  }}>
                    {s.val}{s.max ? `/${s.max}` : ''}
                  </span>
                </div>
              ))}
              {webcamActive && (
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:8, paddingTop:8, borderTop:'1px solid var(--border-1)', fontSize:11, color:'#34D399' }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'#10B981', animation:'glowPulse 1.5s ease-in-out infinite' }} />
                  Webcam active
                </div>
              )}
            </div>
          )}
        </div>)}
      </div>

      {/* Mobile nav backdrop */}
      {showMobileNav && (
        <div onClick={() => setShowMobileNav(false)} style={{
          position:'fixed', inset:0, zIndex:149,
          background:'rgba(0,0,0,0.55)', backdropFilter:'blur(4px)',
        }} className="exam-mobile-backdrop" />
      )}

      {/* ── Submit Confirm Modal ── */}
      {showSubmitModal && (
        <>
          <div onClick={() => setShowSubmitModal(false)} style={{
            position:'fixed', inset:0, zIndex:200,
            background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)',
            WebkitBackdropFilter:'blur(8px)',
          }} />
          <div style={{
            position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
            zIndex:201, width:'calc(100% - 32px)', maxWidth:420,
            background:'var(--s2)', border:'1px solid var(--border-2)',
            borderRadius:20, padding:'24px',
            boxShadow:'var(--shadow-xl)',
            animation:'fadeUp 0.25s both',
          }}>
            <div style={{
              width:48, height:48, borderRadius:13, background:'rgba(16,185,129,0.1)',
              border:'1px solid rgba(16,185,129,0.25)',
              display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </div>
            <h3 style={{ fontFamily:'Syne, sans-serif', fontSize:18, fontWeight:800, color:'var(--text-1)', marginBottom:10 }}>
              Submit Test?
            </h3>
            <p style={{ fontSize:14, color:'var(--text-2)', lineHeight:1.6, marginBottom:8 }}>
              You have answered <strong style={{ color:'#34D399' }}>{answeredCount}</strong> of <strong style={{ color:'var(--text-1)' }}>{questions.length}</strong> questions.
            </p>
            {answeredCount < questions.length && (
              <div style={{
                padding:'10px 14px', borderRadius:10, marginBottom:14,
                background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)',
                fontSize:13, color:'#FCD34D', display:'flex', alignItems:'center', gap:8,
              }}>
                <span>⚠️</span>
                {questions.length - answeredCount} question{questions.length - answeredCount > 1 ? 's' : ''} unanswered. You cannot change answers after submission.
              </div>
            )}
            <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:20 }}>This action is irreversible.</p>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={() => setShowSubmitModal(false)} disabled={submitting} style={{
                flex:1, padding:'11px', borderRadius:11,
                background:'var(--s3)', border:'1px solid var(--border-2)',
                color:'var(--text-1)', fontWeight:600, fontSize:14, cursor:'pointer',
                fontFamily:'DM Sans, sans-serif',
              }}>
                Cancel
              </button>
              <button onClick={handleSubmitTest} disabled={submitting} style={{
                flex:1, padding:'11px', borderRadius:11,
                background:'linear-gradient(135deg,#10B981,#059669)',
                border:'none', color:'white', fontWeight:700, fontSize:14,
                cursor: submitting ? 'not-allowed' : 'pointer',
                fontFamily:'DM Sans, sans-serif',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                boxShadow:'0 4px 16px rgba(16,185,129,0.3)',
              }}>
                {submitting
                  ? <><div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(255,255,255,0.25)', borderTopColor:'white', animation:'spin 0.7s linear infinite' }} /> Submitting…</>
                  : 'Yes, Submit'
                }
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Auto-Submit Overlay ── */}
      {autoSubmitting && (
        <div style={{
          position:'fixed', inset:0, zIndex:300,
          background:'rgba(0,0,0,0.88)', backdropFilter:'blur(12px)',
          display:'flex', alignItems:'center', justifyContent:'center',
          flexDirection:'column', textAlign:'center', padding:24,
        }}>
          <div style={{ fontSize:52, marginBottom:18 }}>⏰</div>
          <h2 style={{ fontFamily:'Syne, sans-serif', fontSize:26, fontWeight:800, color:'var(--text-1)', marginBottom:12 }}>
            Time's Up!
          </h2>
          <p style={{ fontSize:15, color:'var(--text-2)', marginBottom:28, maxWidth:360 }}>
            Your time limit has been reached. Your answers are being submitted automatically.
          </p>
          <div style={{ width:40, height:40, borderRadius:'50%', border:'3px solid var(--border-2)', borderTopColor:'#6366F1', animation:'spin 0.9s linear infinite' }} />
        </div>
      )}

      <ProctoringWarning warning={proctoringWarning} onClose={() => setProctoringWarning(null)} />

      {test?.enable_webcam && proctoringEnabled && (
        <WebcamPreview enabled={proctoringEnabled} stopRef={webcamPreviewStopRef} />
      )}

      {test?.enable_webcam && (
        <WebcamCapture
          testId={testId}
          videoRef={webcamVideoRef}
          captureInterval={30000}
          enabled={proctoringEnabled}
          onReady={handleWebcamReady}
          stopRef={webcamStopRef}
        />
      )}
    </div>
  );
};

export default ExamInterface;