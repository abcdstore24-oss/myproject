/**
 * TestEnrollment.jsx
 * Route: /candidate/tests/:testId/enrollment
 * Pre-exam page: test details, proctoring requirements, join/resume action.
 * Full redesign — drops old className/Button/Alert imports, uses CSS variables.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import * as candidateApi from '../../api/candidateApi';

/* ─── Helpers ────────────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtShort(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function getStatus(test, assignment) {
  if (!test || !assignment) return 'unknown';
  const now   = new Date();
  const start = new Date(test.start_time);
  const end   = new Date(test.end_time);
  if (assignment.submitted_at)                        return 'completed';
  if (assignment.started_at && !assignment.submitted_at) {
    const deadline = new Date(new Date(assignment.started_at).getTime() + test.duration_minutes * 60000);
    if (now >= deadline) return 'time-up';
    return 'in-progress';
  }
  if (now > end)   return 'expired';
  if (now < start) return 'upcoming';
  return 'active';
}

function canJoin(test, assignment) {
  const s = getStatus(test, assignment);
  return (
    assignment?.invitation_status === 'accepted' &&
    (s === 'active' || (s === 'in-progress' && !assignment?.submitted_at))
  );
}

/* ─── Stat Chip ──────────────────────────────────────────── */
function Chip({ label, value, color = 'var(--text-1)', icon }) {
  return (
    <div style={{
      padding: '12px 16px', borderRadius: 12,
      background: 'var(--s3)', border: '1px solid var(--border-1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color, fontFamily: 'Syne, sans-serif' }}>{value}</div>
    </div>
  );
}

/* ─── Proctor Requirement Row ────────────────────────────── */
function ReqRow({ enabled, label, sub, icon }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '12px 16px', borderRadius: 11,
      background: enabled ? 'rgba(99,102,241,0.06)' : 'var(--s3)',
      border: `1px solid ${enabled ? 'rgba(99,102,241,0.18)' : 'var(--border-1)'}`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: enabled ? 'rgba(99,102,241,0.12)' : 'var(--s4)',
        border: `1px solid ${enabled ? 'rgba(99,102,241,0.25)' : 'var(--border-2)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: enabled ? '#818CF8' : 'var(--text-2)', marginBottom: 1 }}>
          {label}
        </div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub}</div>}
      </div>
      <div style={{
        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
        background: enabled ? 'rgba(99,102,241,0.12)' : 'var(--s4)',
        border: `1px solid ${enabled ? 'rgba(99,102,241,0.25)' : 'var(--border-2)'}`,
        color: enabled ? '#818CF8' : 'var(--text-3)',
        letterSpacing: '0.04em',
      }}>
        {enabled ? 'Required' : 'Not Required'}
      </div>
    </div>
  );
}

/* ─── Status Banner ──────────────────────────────────────── */
function StatusBanner({ status, test, assignment }) {
  const configs = {
    completed: {
      bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.22)',
      icon: '✅', color: '#34D399',
      title: 'Test Completed!',
      body: `Score: ${assignment?.percentage?.toFixed(1)}% · ${assignment?.result_status === 'pass' ? '✅ Pass' : '❌ Fail'}`,
    },
    'in-progress': {
      bg: 'rgba(99,102,241,0.07)', border: 'rgba(99,102,241,0.22)',
      icon: '▶️', color: '#818CF8',
      title: 'Test In Progress',
      body: 'You can resume the test anytime before the deadline.',
    },
    'time-up': {
      bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.22)',
      icon: '⏰', color: '#FCA5A5',
      title: 'Time Expired',
      body: 'Your answers were automatically submitted when time ran out.',
    },
    active: {
      bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.22)',
      icon: '🟢', color: '#34D399',
      title: 'Test is Live!',
      body: 'You can join and start the test right now.',
    },
    upcoming: {
      bg: 'rgba(139,92,246,0.07)', border: 'rgba(139,92,246,0.22)',
      icon: '📅', color: '#A78BFA',
      title: 'Test Upcoming',
      body: `Starts on ${fmtDate(test?.start_time)}`,
    },
    expired: {
      bg: 'rgba(107,114,128,0.07)', border: 'rgba(107,114,128,0.2)',
      icon: '🔒', color: 'var(--text-3)',
      title: 'Test Expired',
      body: `The test ended on ${fmtDate(test?.end_time)}`,
    },
  };
  const c = configs[status] || configs.upcoming;
  return (
    <div style={{
      padding: '16px 18px', borderRadius: 12,
      background: c.bg, border: `1px solid ${c.border}`,
      display: 'flex', alignItems: 'flex-start', gap: 12,
    }}>
      <span style={{ fontSize: 20, flexShrink: 0 }}>{c.icon}</span>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: c.color, marginBottom: 3 }}>{c.title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{c.body}</div>
      </div>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
const TestEnrollment = () => {
  const { testId } = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();

  const [test,       setTest]       = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await candidateApi.getEnrollmentDetails(testId);
        setTest(res.data.test);
        setAssignment(res.data.assignment);
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load test details');
      } finally {
        setLoading(false);
      }
    })();
  }, [testId]);

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--s0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes te-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--s5)', borderTopColor: '#10B981', animation: 'te-spin 0.9s linear infinite', margin: '0 auto 14px' }} />
        <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Loading test details…</p>
      </div>
    </div>
  );

  /* ── Error / Not found ── */
  if (error || !test || !assignment) return (
    <div style={{ minHeight: '100vh', background: 'var(--s0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <p style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 20 }}>{error || 'Test not found or access denied'}</p>
        <button onClick={() => navigate('/candidate/dashboard')} style={{
          padding: '10px 24px', borderRadius: 10,
          background: 'linear-gradient(135deg, #10B981, #059669)',
          border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer',
          fontFamily: 'DM Sans, sans-serif',
        }}>← Back to Dashboard</button>
      </div>
    </div>
  );

  const status   = getStatus(test, assignment);
  const joinable = canJoin(test, assignment);
  const inProgress = status === 'in-progress';

  const STATS = [
    { label: 'Duration',   value: `${test.duration_minutes} min`,          icon: '⏱️' },
    { label: 'Questions',  value: test.question_count ?? '—',              icon: '📝' },
    { label: 'Total Marks',value: test.total_marks ?? '—',                 icon: '🏆' },
    { label: 'Pass Mark',  value: `${test.passing_percentage ?? 40}%`,     icon: '🎯' },
    { label: 'Opens',      value: fmtShort(test.start_time),               icon: '📅' },
    { label: 'Closes',     value: fmtShort(test.end_time),                 icon: '🔒' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--s0)' }}>
      <style>{`@keyframes te-spin{to{transform:rotate(360deg)}} @keyframes te-fadeup{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* ── Topbar ── */}
      <header style={{
        height: 58, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 24px',
        background: 'var(--topbar-bg)',
        borderBottom: '1px solid var(--border-1)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 40, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px rgba(16,185,129,0.35)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.2 }}>
              {test.test_title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Test Enrollment</div>
          </div>
        </div>
        <button onClick={() => navigate('/candidate/dashboard')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: 'var(--s3)', border: '1px solid var(--border-2)',
          color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.2s',
          fontFamily: 'DM Sans, sans-serif',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)'; e.currentTarget.style.color = 'var(--text-1)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--text-2)'; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Dashboard
        </button>
      </header>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 24px 64px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

        {/* ── LEFT: Details ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Status banner */}
          <div style={{ animation: 'te-fadeup 0.4s both' }}>
            <StatusBanner status={status} test={test} assignment={assignment} />
          </div>

          {/* Test info card */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-1)', borderRadius: 18, overflow: 'hidden', animation: 'te-fadeup 0.4s 60ms both' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-1)', background: 'var(--s1)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z"/><polyline points="9 2 9 9 16 9"/>
              </svg>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Test Information</h2>
            </div>
            <div style={{ padding: '20px 22px' }}>
              {test.test_description && (
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 20, padding: '12px 14px', borderRadius: 10, background: 'var(--s2)', border: '1px solid var(--border-1)' }}>
                  {test.test_description}
                </p>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {STATS.map(s => <Chip key={s.label} {...s} />)}
              </div>
            </div>
          </div>

          {/* Proctoring requirements */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-1)', borderRadius: 18, overflow: 'hidden', animation: 'te-fadeup 0.4s 120ms both' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-1)', background: 'var(--s1)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Proctoring Requirements</h2>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ReqRow
                enabled={test.enable_webcam}
                label="Webcam Monitoring"
                sub="Periodic snapshots + face detection throughout the exam"
                icon="🎥"
              />
              <ReqRow
                enabled={test.enable_second_camera}
                label="Secondary Camera"
                sub="Scan a QR code to connect your phone as a second camera"
                icon="📱"
              />
              <ReqRow
                enabled={test.enable_location_tracking}
                label="GPS Location Verification"
                sub="You must be within the allowed geographic boundary"
                icon="📍"
              />
              <ReqRow
                enabled={test.enable_tab_monitoring}
                label="Tab Switch Detection"
                sub={test.enable_tab_monitoring ? `Max ${test.max_tab_switches ?? 3} violations before auto-submission` : 'Switching tabs will not be penalised'}
                icon="👁️"
              />
            </div>
          </div>

          {/* Result card (if completed) */}
          {assignment.submitted_at && (
            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--border-1)',
              borderRadius: 18, padding: '22px', animation: 'te-fadeup 0.4s 180ms both',
              borderTop: `2px solid ${assignment.result_status === 'pass' ? '#10B981' : '#EF4444'}`,
            }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🏆</span> Your Result
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                {[
                  { label: 'Score', value: `${assignment.score}/${test.total_marks}`, color: 'var(--text-1)', icon: '📊' },
                  { label: 'Percentage', value: `${parseFloat(assignment.percentage).toFixed(1)}%`, color: assignment.result_status === 'pass' ? '#34D399' : '#FCA5A5', icon: '📈' },
                  { label: 'Result', value: assignment.result_status === 'pass' ? 'Passed ✅' : 'Not Passed ❌', color: assignment.result_status === 'pass' ? '#34D399' : '#FCA5A5', icon: '🎯' },
                ].map(s => <Chip key={s.label} {...s} />)}
              </div>
              {test.show_results_immediately && (
                <button onClick={() => navigate(`/candidate/results/${assignment.assignment_id}`)} style={{
                  marginTop: 16, width: '100%', padding: '11px', borderRadius: 10,
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  border: 'none', color: 'white', fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', fontFamily: 'Syne, sans-serif',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.3)', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.filter = 'brightness(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.filter = ''; }}
                >
                  View Detailed Results →
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Action sidebar ── */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--border-1)',
            borderRadius: 18, overflow: 'hidden',
            boxShadow: 'var(--shadow-md)',
            animation: 'te-fadeup 0.4s 80ms both',
          }}>
            {/* Accent strip */}
            <div style={{
              height: 3,
              background: joinable
                ? 'linear-gradient(90deg, #10B981, #059669)'
                : status === 'upcoming'
                ? 'linear-gradient(90deg, #8B5CF6, #6366F1)'
                : 'linear-gradient(90deg, var(--s5), var(--s4))',
            }} />

            <div style={{ padding: '22px 20px' }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 18 }}>
                {joinable ? (inProgress ? '▶ Resume Test' : '🚀 Join Test') : '📋 Test Status'}
              </h3>

              {/* Main CTA */}
              {joinable ? (
                <button onClick={() => navigate(`/candidate/tests/${testId}/pre-exam`)} style={{
                  width: '100%', padding: '14px', borderRadius: 12,
                  background: inProgress
                    ? 'linear-gradient(135deg, #6366F1, #8B5CF6)'
                    : 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none', color: 'white', fontWeight: 800, fontSize: 15,
                  cursor: 'pointer', fontFamily: 'Syne, sans-serif',
                  boxShadow: inProgress ? '0 4px 20px rgba(99,102,241,0.35)' : '0 4px 20px rgba(16,185,129,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.filter = ''; }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    {inProgress ? <polygon points="5 3 19 12 5 21 5 3"/> : <path d="M5 12h14M12 5l7 7-7 7"/>}
                  </svg>
                  {inProgress ? 'Resume Test' : 'Begin Test'}
                </button>
              ) : (
                <div style={{
                  padding: '14px', borderRadius: 12, textAlign: 'center',
                  background: 'var(--s3)', border: '1px solid var(--border-2)',
                  fontSize: 14, fontWeight: 600, color: 'var(--text-3)',
                }}>
                  {status === 'upcoming'  && '⏳ Test not started yet'}
                  {status === 'completed' && '✅ Test completed'}
                  {status === 'expired'   && '🔒 Test window closed'}
                  {status === 'time-up'   && '⏰ Time expired'}
                  {assignment?.invitation_status === 'pending' && '📬 Invitation pending'}
                </div>
              )}

              {/* Upcoming timer */}
              {status === 'upcoming' && (
                <div style={{
                  marginTop: 14, padding: '12px 14px', borderRadius: 10,
                  background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
                  textAlign: 'center', fontSize: 12, color: '#A78BFA',
                }}>
                  {Math.max(0, Math.ceil((new Date(test.start_time) - new Date()) / 60000))} minutes until start
                </div>
              )}

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border-1)', margin: '20px 0' }} />

              {/* Quick stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Duration', val: `${test.duration_minutes} min` },
                  { label: 'Opens', val: fmtShort(test.start_time) },
                  { label: 'Closes', val: fmtShort(test.end_time) },
                  { label: 'Proctoring', val: [test.enable_webcam && 'Webcam', test.enable_location_tracking && 'GPS', test.enable_second_camera && '2nd Cam'].filter(Boolean).join(', ') || 'Basic' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{s.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', textAlign: 'right', maxWidth: 160 }}>{s.val || '—'}</span>
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: 'var(--border-1)', margin: '18px 0' }} />

              {/* Reminders */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 4 }}>Before You Start</p>
                {[
                  '⚠️ Stable internet connection required',
                  test.enable_webcam && '🎥 Camera access will be requested',
                  test.enable_location_tracking && '📍 Location access will be requested',
                  '🖥️ Use Chrome or Firefox for best results',
                ].filter(Boolean).map((r, i) => (
                  <p key={i} style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, margin: 0 }}>{r}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive: stack on mobile */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: '1fr 300px'"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TestEnrollment;