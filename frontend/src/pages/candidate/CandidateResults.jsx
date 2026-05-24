/**
 * CandidateResults.jsx
 * Route: /candidate/results/:assignmentId
 * Redesigned: score ring, animated stats, Q-by-Q accordion, proctoring summary
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as reportsApi from '../../api/reportsApi';

/* ─── Animated Score Ring ─────────────────────────────────── */
function ScoreRing({ pct, pass, size = 160 }) {
  const [animPct, setAnimPct] = useState(0);
  const r = (size / 2) - 12;
  const C = 2 * Math.PI * r;
  const color = pass ? '#10B981' : '#EF4444';
  const trackColor = pass ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)';

  useEffect(() => {
    const t = setTimeout(() => {
      let start = 0;
      const target = Math.min(pct, 100);
      const step = () => {
        start += 2.5;
        setAnimPct(Math.min(start, target));
        if (start < target) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, 400);
    return () => clearTimeout(t);
  }, [pct]);

  const dashOff = C - (C * animPct) / 100;

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={10} />
        {/* Progress */}
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={dashOff}
          style={{ transition: 'stroke-dashoffset 0.05s linear', filter: `drop-shadow(0 0 8px ${color}60)` }}
        />
      </svg>
      {/* Center text */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: 'Syne, sans-serif', fontSize: size * 0.19,
          fontWeight: 800, color, lineHeight: 1,
        }}>
          {Math.round(animPct)}%
        </div>
        <div style={{ fontSize: size * 0.09, color, fontWeight: 700, marginTop: 3, letterSpacing: '0.06em' }}>
          {pass ? 'PASS' : 'FAIL'}
        </div>
      </div>
    </div>
  );
}

/* ─── Animated counter ────────────────────────────────────── */
function AnimCount({ to, duration = 800, suffix = '' }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = 16;
    const inc = to / (duration / step);
    const t = setInterval(() => {
      start += inc;
      if (start >= to) { setVal(to); clearInterval(t); }
      else setVal(Math.round(start));
    }, step);
    return () => clearInterval(t);
  }, [to]);
  return <>{val}{suffix}</>;
}

/* ─── Stat mini card ──────────────────────────────────────── */
function MiniStat({ label, value, color = 'var(--text-1)', sub }) {
  return (
    <div style={{
      background: 'var(--s3)', borderRadius: 12, padding: '14px 16px',
      border: '1px solid var(--border-1)', textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5, letterSpacing: '0.03em' }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ─── Question row ────────────────────────────────────────── */
function QuestionRow({ answer, index }) {
  const [expanded, setExpanded] = useState(false);
  const correct   = answer.isCorrect;
  const answered  = answer.selectedOption || answer.codeAnswer;
  const color     = correct ? '#10B981' : answered ? '#EF4444' : '#6B7280';
  const bg        = correct ? 'rgba(16,185,129,0.06)' : answered ? 'rgba(239,68,68,0.06)' : 'rgba(107,114,128,0.06)';
  const border    = correct ? 'rgba(16,185,129,0.2)'  : answered ? 'rgba(239,68,68,0.2)' : 'rgba(107,114,128,0.15)';

  return (
    <div style={{
      borderRadius: 14, overflow: 'hidden',
      border: `1px solid ${border}`,
      background: bg,
      transition: 'all 0.2s',
    }}>
      {/* Row header */}
      <div
        onClick={() => setExpanded(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 18px', cursor: 'pointer',
        }}
      >
        {/* Status icon */}
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: correct ? 'rgba(16,185,129,0.15)' : answered ? 'rgba(239,68,68,0.12)' : 'rgba(107,114,128,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: `1px solid ${border}`,
        }}>
          {correct
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            : answered
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          }
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'Syne, sans-serif' }}>
              Q{index + 1}.
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '0.05em',
              textTransform: 'uppercase',
              background: answer.questionType === 'mcq' ? 'rgba(99,102,241,0.12)' : 'rgba(139,92,246,0.12)',
              color: answer.questionType === 'mcq' ? '#818CF8' : '#A78BFA',
              border: `1px solid ${answer.questionType === 'mcq' ? 'rgba(99,102,241,0.25)' : 'rgba(139,92,246,0.25)'}`,
            }}>
              {answer.questionType}
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.5, margin: 0,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%',
          }}>
            {answer.questionText}
          </p>
        </div>

        {/* Marks + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color }}>
              {answer.marksObtained ?? 0}/{answer.marks}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.04em' }}>marks</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '0 18px 16px',
          borderTop: `1px solid ${border}`,
          paddingTop: 14,
          animation: 'fadeUp 0.2s both',
        }}>
          {/* Full question text */}
          <div style={{
            fontSize: 14, color: 'var(--text-1)', lineHeight: 1.65, marginBottom: 14,
            padding: '12px 14px', borderRadius: 10, background: 'var(--s2)',
          }}>
            {answer.questionText}
          </div>

          {/* MCQ details */}
          {answer.questionType === 'mcq' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{
                  padding: '8px 14px', borderRadius: 9,
                  background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                  fontSize: 13,
                }}>
                  <span style={{ color: 'var(--text-3)' }}>Your answer: </span>
                  <strong style={{ color: correct ? '#34D399' : '#FCA5A5' }}>
                    {answer.selectedOption ? answer.selectedOption.toUpperCase() : 'Not answered'}
                  </strong>
                </div>
                {!correct && answer.correctOption && (
                  <div style={{
                    padding: '8px 14px', borderRadius: 9,
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                    fontSize: 13,
                  }}>
                    <span style={{ color: 'var(--text-3)' }}>Correct answer: </span>
                    <strong style={{ color: '#34D399' }}>{answer.correctOption.toUpperCase()}</strong>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Coding details */}
          {answer.questionType === 'coding' && answer.codeAnswer && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }}>
                Your Submission
              </p>
              <pre style={{
                margin: 0, fontSize: 12, color: 'var(--text-2)',
                background: 'var(--s1)', padding: '12px 14px', borderRadius: 10,
                overflow: 'auto', fontFamily: 'JetBrains Mono, monospace',
                border: '1px solid var(--border-1)', lineHeight: 1.6,
                maxHeight: 200,
              }}>
                {answer.codeAnswer}
              </pre>
              {answer.selectedLanguage && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
                  Language: {answer.selectedLanguage}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Confetti burst (CSS only) ──────────────────────────── */
function Confetti() {
  const colors = ['#6366F1','#10B981','#F59E0B','#8B5CF6','#EC4899','#34D399'];
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    x: Math.random() * 100,
    delay: Math.random() * 0.8,
    dur: 1.5 + Math.random() * 1.5,
    size: 5 + Math.random() * 6,
  }));
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10, overflow: 'hidden' }}>
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(-10px) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.x}%`, top: -20,
          width: p.size, height: p.size * 0.5, borderRadius: 2,
          background: p.color,
          animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
const CandidateResults = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await reportsApi.getCandidateResult(assignmentId);
        setResult(res.data);
      } catch (e) {
        setError(e.response?.data?.message || 'Failed to load results');
      } finally { setLoading(false); }
    })();
  }, [assignmentId]);

  /* ── Loading ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--s0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', border: '3px solid var(--s5)', borderTopColor: '#6366F1', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Loading your results…</p>
      </div>
    </div>
  );

  /* ── Error ── */
  if (error || !result) return (
    <div style={{ minHeight: '100vh', background: 'var(--s0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <p style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 8 }}>
          {error || 'Results not available yet'}
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 24 }}>
          Results will be visible once released by the recruiter.
        </p>
        <button onClick={() => navigate('/candidate/dashboard')} style={{
          padding: '10px 24px', borderRadius: 10,
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          border: 'none', color: 'white', fontWeight: 600, fontSize: 14,
          cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        }}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );

  const { assignment, statistics, proctoring } = result;
  const pct  = parseFloat(assignment.percentage ?? 0);
  const pass = assignment.passed || assignment.result_status === 'pass';
  const totalViolations = Object.values(proctoring?.violations || {}).reduce((a, b) => a + b, 0);
  const timeTaken = assignment.time_taken_minutes;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--s0)' }}>
      <style>{`
        @keyframes spin      { to { transform: rotate(360deg); } }
        @keyframes fadeUp    { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer   { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes glowPulse { 0%,100%{opacity:0.4} 50%{opacity:0.9} }
        @keyframes heroIn    { from{opacity:0;transform:translateY(30px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>

      {/* Confetti for pass */}
      {pass && <Confetti />}

      {/* ── Topbar ── */}
      <header style={{
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px',
        background: 'var(--topbar-bg)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-1)',
        position: 'sticky', top: 0, zIndex: 40,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 14, color: 'var(--text-1)' }}>
            TalentProctor
          </span>
        </div>
        <button onClick={() => navigate('/candidate/dashboard')} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
          background: 'var(--s3)', border: '1px solid var(--border-2)',
          color: 'var(--text-2)', cursor: 'pointer', transition: 'all 0.2s',
          fontFamily: 'DM Sans, sans-serif',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.background = 'var(--s4)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.background = 'var(--s3)'; }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Dashboard
        </button>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 20px 80px' }}>

        {/* ── Hero result card ── */}
        <div style={{
          background: 'var(--s2)',
          border: `1px solid ${pass ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)'}`,
          borderRadius: 24, overflow: 'hidden',
          boxShadow: 'var(--shadow-xl)',
          marginBottom: 20,
          animation: 'heroIn 0.6s cubic-bezier(0.16,1,0.3,1) both',
        }}>
          {/* Gradient top strip */}
          <div style={{
            height: 4,
            background: pass
              ? 'linear-gradient(90deg, #10B981, #6366F1, #8B5CF6)'
              : 'linear-gradient(90deg, #EF4444, #F97316)',
          }} />

          {/* Test title bar */}
          <div style={{
            padding: '18px 28px', borderBottom: '1px solid var(--border-1)',
            background: 'var(--s1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
          }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
                Assessment Result
              </p>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800, color: 'var(--text-1)', margin: 0 }}>
                {assignment.testTitle || assignment.test_title}
              </h2>
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 800,
              background: pass ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${pass ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: pass ? '#34D399' : '#FCA5A5',
              fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em',
            }}>
              {pass
                ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg> PASSED</>
                : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> NOT PASSED</>
              }
            </span>
          </div>

          {/* Score hero */}
          <div style={{
            padding: '40px 28px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 48, flexWrap: 'wrap',
          }}>
            <ScoreRing pct={pct} pass={pass} size={180} />

            {/* Stats beside ring */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 200 }}>
              {[
                { icon: '🏆', label: 'Total Score',    value: `${assignment.score ?? 0} / ${assignment.totalMarks ?? assignment.total_marks ?? 0}`, color: pass ? '#34D399' : '#FCA5A5' },
                { icon: '🎯', label: 'Pass Threshold', value: `${assignment.passingPercentage ?? assignment.passing_percentage ?? 40}%`,  color: 'var(--text-2)' },
                { icon: '⏱️', label: 'Time Taken',     value: timeTaken ? `${timeTaken} min` : '—',     color: 'var(--text-2)' },
                { icon: '📝', label: 'Questions',      value: `${statistics?.totalQuestions ?? 0} total`, color: 'var(--text-2)' },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.04em', marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance grid */}
          <div style={{
            padding: '20px 28px 28px',
            borderTop: '1px solid var(--border-1)',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12,
          }}>
            <MiniStat
              label="Accuracy"
              value={<><AnimCount to={parseFloat(statistics?.accuracy ?? 0)} />%</>}
              color={pass ? '#34D399' : '#FCA5A5'}
              sub={`${statistics?.correctAnswers ?? 0}/${statistics?.totalQuestions ?? 0} correct`}
            />
            {statistics?.mcq?.total > 0 && (
              <MiniStat
                label="MCQ Score"
                value={<><AnimCount to={parseFloat(statistics.mcq.accuracy ?? 0)} />%</>}
                color="#818CF8"
                sub={`${statistics.mcq.correct}/${statistics.mcq.total} correct`}
              />
            )}
            {statistics?.coding?.total > 0 && (
              <MiniStat
                label="Coding Score"
                value={<><AnimCount to={parseFloat(statistics.coding.accuracy ?? 0)} />%</>}
                color="#A78BFA"
                sub={`${statistics.coding.correct}/${statistics.coding.total} correct`}
              />
            )}
            <MiniStat
              label="Violations"
              value={totalViolations}
              color={totalViolations > 0 ? '#FCA5A5' : '#34D399'}
              sub={proctoring?.status || 'Normal'}
            />
          </div>
        </div>

        {/* ── Proctoring summary ── */}
        {proctoring && (
          <div style={{
            background: 'var(--s2)', border: '1px solid var(--border-1)',
            borderRadius: 18, padding: '22px 24px', marginBottom: 20,
            animation: 'fadeUp 0.5s 0.15s both',
          }}>
            <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🛡️</span> Proctoring Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              {[
                { label: 'Tab Switches',  val: proctoring.tabSwitches  ?? 0, warn: proctoring.tabSwitches  > 0 },
                { label: 'Window Blurs',  val: proctoring.windowBlurs  ?? 0, warn: proctoring.windowBlurs  > 3 },
                { label: 'Copy/Paste',    val: proctoring.copyPaste    ?? Object.values(proctoring.violations || {}).reduce((a,b)=>a+b,0) - (proctoring.tabSwitches ?? 0) - (proctoring.windowBlurs ?? 0), warn: false },
                { label: 'Proctor Status',val: proctoring.status ?? (totalViolations > 5 ? 'Suspicious' : 'Normal'), isStatus: true, pass: (proctoring.status === 'Normal' || totalViolations <= 5) },
              ].map((s, i) => (
                <div key={i} style={{
                  padding: '12px 14px', borderRadius: 12,
                  background: s.isStatus ? (s.pass ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.07)') : s.warn ? 'rgba(245,158,11,0.06)' : 'var(--s3)',
                  border: `1px solid ${s.isStatus ? (s.pass ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)') : s.warn ? 'rgba(245,158,11,0.2)' : 'var(--border-1)'}`,
                  textAlign: 'center',
                }}>
                  <div style={{
                    fontFamily: 'Syne, sans-serif', fontSize: typeof s.val === 'string' ? 14 : 22, fontWeight: 800, lineHeight: 1,
                    color: s.isStatus ? (s.pass ? '#34D399' : '#FCA5A5') : s.warn ? '#FCD34D' : 'var(--text-1)',
                    marginBottom: 6,
                  }}>
                    {s.val}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Question-by-question ── */}
        {result.answers?.length > 0 && (
          <div style={{
            background: 'var(--s2)', border: '1px solid var(--border-1)',
            borderRadius: 18, overflow: 'hidden',
            animation: 'fadeUp 0.5s 0.25s both',
          }}>
            {/* Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid var(--border-1)',
              background: 'var(--s1)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
            }}>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text-1)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📝</span> Question-by-Question Results
              </h3>
              <div style={{ display: 'flex', gap: 10, fontSize: 12, flexWrap: 'wrap' }}>
                {[
                  { color: '#10B981', label: `${result.answers.filter(a => a.isCorrect).length} Correct` },
                  { color: '#EF4444', label: `${result.answers.filter(a => !a.isCorrect && (a.selectedOption || a.codeAnswer)).length} Wrong` },
                  { color: '#6B7280', label: `${result.answers.filter(a => !a.selectedOption && !a.codeAnswer).length} Skipped` },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-2)' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                    {s.label}
                  </div>
                ))}
              </div>
            </div>
            {/* List */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {result.answers.map((answer, i) => (
                <QuestionRow key={answer.questionId} answer={answer} index={i} />
              ))}
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <button onClick={() => navigate('/candidate/dashboard')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '13px 32px', borderRadius: 12, fontSize: 15, fontWeight: 700,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            border: 'none', color: 'white', cursor: 'pointer',
            boxShadow: '0 0 24px rgba(99,102,241,0.35)',
            fontFamily: 'DM Sans, sans-serif', transition: 'all 0.25s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(99,102,241,0.45)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 24px rgba(99,102,241,0.35)'; }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to Dashboard
          </button>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12 }}>
            Your results have been recorded and sent to the recruiter.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CandidateResults;