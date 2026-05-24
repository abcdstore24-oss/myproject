/**
 * CandidateReport.jsx
 * Route: /recruiter/reports/candidate/:assignmentId
 * Hero summary, tabbed answers/logs/snapshots.
 * Fixed: all rgba(255,255,255,X) borders → CSS variables (light/dark theme compatible)
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import RecruiterLayout from '../../components/layout/RecruiterLayout';
import * as reportsApi from '../../api/reportsApi';

/* ─── Helpers ────────────────────────────────────────────── */
const API_URL = import.meta.env.VITE_API_URL || '';

function Avatar({ name, size = 52 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??';
  const hue = (name?.charCodeAt(0) ?? 0) * 37 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue},55%,24%)`, border: `2px solid hsl(${hue},55%,34%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Syne, sans-serif', fontSize: size * 0.33,
      fontWeight: 800, color: `hsl(${hue},70%,72%)`,
    }}>
      {initials}
    </div>
  );
}

function ScoreRing({ pct, pass, size = 100 }) {
  const [anim, setAnim] = useState(0);
  const r = size / 2 - 8;
  const C = 2 * Math.PI * r;
  const color = pass ? '#10B981' : '#EF4444';

  useEffect(() => {
    let v = 0;
    const id = setInterval(() => {
      v += 2;
      setAnim(Math.min(v, pct));
      if (v >= pct) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [pct]);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}18`} strokeWidth={7} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeLinecap="round" strokeDasharray={C}
          strokeDashoffset={C - (C * anim) / 100}
          style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: size * 0.2, fontWeight: 800, color, lineHeight: 1 }}>{Math.round(anim)}%</div>
        <div style={{ fontSize: size * 0.1, color, fontWeight: 700, marginTop: 2 }}>{pass ? 'PASS' : 'FAIL'}</div>
      </div>
    </div>
  );
}

const sevConfig = {
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.10)', border: 'rgba(239,68,68,0.25)', label: 'Critical' },
  high:     { color: '#F97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.25)', label: 'High' },
  medium:   { color: '#F59E0B', bg: 'rgba(245,158,11,0.10)', border: 'rgba(245,158,11,0.25)', label: 'Medium' },
  low:      { color: '#6366F1', bg: 'rgba(99,102,241,0.10)', border: 'rgba(99,102,241,0.25)', label: 'Low' },
};

const eventIcons = {
  tab_switch:          { icon: '🔄', label: 'Tab Switch' },
  window_blur:         { icon: '👁️', label: 'Window Blur' },
  copy_attempt:        { icon: '📋', label: 'Copy Attempt' },
  paste_attempt:       { icon: '📌', label: 'Paste Attempt' },
  right_click:         { icon: '🖱️', label: 'Right Click' },
  fullscreen_exit:     { icon: '🖥️', label: 'Fullscreen Exit' },
  webcam_snapshot:     { icon: '📷', label: 'Webcam Snapshot' },
  suspicious_activity: { icon: '🚨', label: 'Suspicious Activity' },
  location_check:      { icon: '📍', label: 'Location Check' },
};

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ─── Stat pill ──────────────────────────────────────────── */
function Stat({ label, val, color = 'var(--text-1)' }) {
  return (
    <div style={{ padding: '12px 16px', borderRadius: 12, background: 'var(--s3)', border: '1px solid var(--border-1)', textAlign: 'center' }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{val}</div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>{label}</div>
    </div>
  );
}

/* ─── Answers Tab ────────────────────────────────────────── */
function AnswersTab({ answers }) {
  const [expanded, setExpanded] = useState(null);

  if (!answers?.length) return (
    <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>No answers recorded</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {answers.map((a, i) => {
        const open     = expanded === i;
        const correct  = a.isCorrect;
        const answered = a.selectedOption || a.codeAnswer;
        const borderColor = correct ? 'rgba(16,185,129,0.3)' : answered ? 'rgba(239,68,68,0.25)' : 'var(--border-2)';
        const accentColor = correct ? '#10B981' : answered ? '#EF4444' : '#6B7280';

        return (
          <div key={i} style={{ borderRadius: 14, overflow: 'hidden', border: `1px solid ${borderColor}`, background: correct ? 'rgba(16,185,129,0.04)' : answered ? 'rgba(239,68,68,0.04)' : 'var(--s3)', borderLeft: `3px solid ${accentColor}` }}>
            {/* Row */}
            <div onClick={() => setExpanded(open ? null : i)} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', cursor: 'pointer' }}>
              {/* Status icon */}
              <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: correct ? 'rgba(16,185,129,0.12)' : answered ? 'rgba(239,68,68,0.1)' : 'rgba(107,114,128,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {correct
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  : answered
                  ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                }
              </div>
              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>Q{a.questionNumber}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20, letterSpacing: '0.04em', textTransform: 'uppercase', background: a.questionType === 'mcq' ? 'rgba(99,102,241,0.12)' : 'rgba(139,92,246,0.12)', color: a.questionType === 'mcq' ? '#818CF8' : '#A78BFA', border: `1px solid ${a.questionType === 'mcq' ? 'rgba(99,102,241,0.25)' : 'rgba(139,92,246,0.25)'}` }}>
                    {a.questionType}
                  </span>
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%' }}>{a.questionText}</p>
              </div>
              {/* Marks + chevron */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 800, color: accentColor }}>{a.marksObtained ?? 0}/{a.marks}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>marks</div>
                </div>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>

            {/* Expanded */}
            {open && (
              <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${borderColor}`, paddingTop: 14 }}>
                <p style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.65, marginBottom: 14, padding: '12px 14px', borderRadius: 10, background: 'var(--s2)' }}>{a.questionText}</p>

                {a.questionType === 'mcq' && a.options && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(a.options).map(([key, val]) => {
                      const isCandidateAnswer = key === a.selectedOption;
                      const isCorrectAnswer   = key === a.correctOption;
                      let bg = 'var(--s2)'; let border = 'var(--border-1)'; let textColor = 'var(--text-2)';
                      if (isCandidateAnswer && isCorrectAnswer) { bg = 'rgba(16,185,129,0.1)'; border = 'rgba(16,185,129,0.3)'; textColor = '#34D399'; }
                      else if (isCandidateAnswer && !isCorrectAnswer) { bg = 'rgba(239,68,68,0.08)'; border = 'rgba(239,68,68,0.25)'; textColor = '#FCA5A5'; }
                      else if (isCorrectAnswer) { bg = 'rgba(16,185,129,0.06)'; border = 'rgba(16,185,129,0.2)'; textColor = '#34D399'; }

                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 10, background: bg, border: `1px solid ${border}` }}>
                          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 800, color: textColor, textTransform: 'uppercase', flexShrink: 0, paddingTop: 2 }}>{key}.</span>
                          <span style={{ fontSize: 13.5, color: textColor, flex: 1, lineHeight: 1.55 }}>{val}</span>
                          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                            {isCandidateAnswer && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: isCandidateAnswer && isCorrectAnswer ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)', color: isCandidateAnswer && isCorrectAnswer ? '#34D399' : '#FCA5A5', border: `1px solid ${isCandidateAnswer && isCorrectAnswer ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}` }}>Candidate</span>
                            )}
                            {isCorrectAnswer && !isCandidateAnswer && (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(16,185,129,0.15)', color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' }}>✓ Correct</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {a.questionType === 'coding' && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', marginBottom: 8, fontWeight: 600 }}>
                      Language: <span style={{ color: '#818CF8' }}>{a.selectedLanguage || '—'}</span>
                      {a.marksObtained > 0 && <span style={{ color: '#34D399', marginLeft: 16 }}>✓ {a.marksObtained} marks awarded</span>}
                    </div>
                    {a.codeAnswer ? (
                      <div style={{ border: '1px solid var(--border-1)', borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ padding: '8px 14px', background: 'var(--s1)', borderBottom: '1px solid var(--border-1)', display: 'flex', gap: 6 }}>
                          {['#FF5F57','#FEBC2E','#28C840'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
                          <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 4, fontFamily: 'JetBrains Mono, monospace' }}>solution.{a.selectedLanguage === 'python' ? 'py' : a.selectedLanguage === 'java' ? 'java' : a.selectedLanguage === 'cpp' ? 'cpp' : 'js'}</span>
                        </div>
                        <pre style={{ margin: 0, padding: '14px 16px', background: 'var(--s0)', color: 'var(--text-1)', fontFamily: 'JetBrains Mono, monospace', fontSize: 12.5, overflow: 'auto', maxHeight: 300, lineHeight: 1.65 }}>
                          {a.codeAnswer}
                        </pre>
                      </div>
                    ) : (
                      <p style={{ fontSize: 13, color: 'var(--text-3)', fontStyle: 'italic' }}>No code submitted</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Logs Tab ───────────────────────────────────────────── */
function LogsTab({ logs }) {
  const [filter, setFilter] = useState('all');

  if (!logs?.length) return (
    <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>🛡️</div>
      No proctoring events recorded
    </div>
  );

  const filtered = filter === 'all' ? logs : logs.filter(l => l.severity === filter);
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  logs.forEach(l => { if (counts[l.severity] !== undefined) counts[l.severity]++; });

  return (
    <div>
      {/* Severity filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} style={{
          padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          background: filter === 'all' ? 'var(--s4)' : 'var(--s3)',
          border: `1px solid ${filter === 'all' ? 'var(--border-3)' : 'var(--border-1)'}`,
          color: filter === 'all' ? 'var(--text-1)' : 'var(--text-3)',
        }}>
          All ({logs.length})
        </button>
        {Object.entries(sevConfig).map(([sev, cfg]) => (
          <button key={sev} onClick={() => setFilter(sev)} style={{
            padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
            background: filter === sev ? cfg.bg : 'var(--s3)',
            border: `1px solid ${filter === sev ? cfg.border : 'var(--border-1)'}`,
            color: filter === sev ? cfg.color : 'var(--text-3)',
          }}>
            {cfg.label} ({counts[sev]})
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {/* Vertical line */}
        <div style={{ position: 'absolute', left: 17, top: 0, bottom: 0, width: 1, background: 'var(--border-1)', zIndex: 0 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((log, i) => {
            const sev  = sevConfig[log.severity] || sevConfig.low;
            const evt  = eventIcons[log.eventType] || { icon: '📝', label: log.eventType?.replace(/_/g, ' ') };
            return (
              <div key={log.logId || i} style={{ display: 'flex', gap: 14, position: 'relative', zIndex: 1 }}>
                {/* Timeline dot */}
                <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: sev.bg, border: `2px solid ${sev.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                  {evt.icon}
                </div>
                {/* Card */}
                <div style={{ flex: 1, padding: '11px 14px', borderRadius: 12, background: sev.bg, border: `1px solid ${sev.border}`, marginBottom: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5, flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: sev.color, letterSpacing: '0.04em' }}>{evt.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: `${sev.color}18`, border: `1px solid ${sev.border}`, color: sev.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{log.severity}</span>
                    </div>
                    <span style={{ fontSize: 11, color: sev.color, opacity: 0.7, fontFamily: 'JetBrains Mono, monospace' }}>{fmt(log.timestamp || log.logged_at)}</span>
                  </div>
                  <p style={{ fontSize: 13, color: sev.color, opacity: 0.85, margin: 0, lineHeight: 1.5 }}>{log.description || log.event_description}</p>
                  {log.snapshotUrl && (
                    <img src={`${API_URL}${log.snapshotUrl}`} alt="Snapshot" style={{ marginTop: 10, width: 120, height: 80, objectFit: 'cover', borderRadius: 8, border: `1px solid ${sev.border}` }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Snapshots Tab ──────────────────────────────────────── */
function SnapshotsTab({ snapshots }) {
  const [zoom, setZoom] = useState(null);

  if (!snapshots?.length) return (
    <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📷</div>
      No webcam snapshots captured
    </div>
  );

  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>
        {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} captured during the exam. Click to enlarge.
      </p>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {snapshots.map((snap, i) => (
          <div key={i} onClick={() => setZoom(snap)} style={{
            borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
            border: '1px solid var(--border-2)',
            transition: 'all 0.2s', position: 'relative',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--border-2)'; }}>
            <img src={`${API_URL}${snap.url}`} alt={`Snapshot ${i + 1}`} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block', background: 'var(--s3)' }} />
            <div style={{ padding: '6px 8px', background: 'var(--s2)', fontSize: 10, color: 'var(--text-3)', textAlign: 'center', fontFamily: 'JetBrains Mono, monospace' }}>
              {fmt(snap.timestamp)}
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {zoom && (
        <>
          <div onClick={() => setZoom(null)} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 301, maxWidth: '90vw', maxHeight: '85vh', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-3)', boxShadow: 'var(--shadow-xl)' }}>
            <img src={`${API_URL}${zoom.url}`} alt="Snapshot" style={{ display: 'block', maxWidth: '100%', maxHeight: 'calc(85vh - 40px)', objectFit: 'contain' }} />
            <div style={{ padding: '10px 16px', background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>{fmtDate(zoom.timestamp)}</span>
              <button onClick={() => setZoom(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 20, lineHeight: 1, padding: 2 }}>×</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
const CandidateReport = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [report, setReport]   = useState(null);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState(searchParams.get('tab') || 'answers');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await reportsApi.getDetailedCandidateReport(assignmentId);
        setReport(res.data);
      } catch (e) { setError(e.response?.data?.message || 'Failed to load report'); }
      finally { setLoading(false); }
    })();
  }, [assignmentId]);

  if (loading) return (
    <RecruiterLayout title="Candidate Report" subtitle="Loading…">
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--s5)', borderTopColor: '#6366F1', animation: 'spin 0.9s linear infinite' }} />
      </div>
    </RecruiterLayout>
  );

  if (error || !report) return (
    <RecruiterLayout title="Candidate Report">
      <div style={{ textAlign: 'center', padding: '64px 24px' }}>
        <p style={{ fontSize: 15, color: 'var(--text-2)', marginBottom: 20 }}>{error || 'Report not found'}</p>
        <button onClick={() => navigate(-1)} style={{
          padding: '10px 24px', borderRadius: 10,
          background: 'var(--s3)', border: '1px solid var(--border-2)',
          color: 'var(--text-1)', fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
        }}>← Go Back</button>
      </div>
    </RecruiterLayout>
  );

  const { candidate, test, result, proctoring, answers, logs, snapshots } = report;
  const pct  = parseFloat(result?.percentage ?? 0);
  const pass = result?.passed || result?.result_status === 'pass';

  return (
    <RecruiterLayout
      title="Candidate Report"
      subtitle={test?.testTitle}
      actions={
        <button onClick={() => navigate(-1)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '7px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600,
          background: 'var(--s3)', border: '1px solid var(--border-2)',
          color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)'; e.currentTarget.style.color = 'var(--text-1)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--text-2)'; }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back
        </button>
      }
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes glowPulse{0%,100%{opacity:0.5}50%{opacity:1}}`}</style>

      {/* ── Hero card ── */}
      <div style={{
        background: 'var(--s2)',
        border: `1px solid ${pass ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.15)'}`,
        borderRadius: 20, overflow: 'hidden', marginBottom: 20,
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Gradient top strip */}
        <div style={{ height: 3, background: pass ? 'linear-gradient(90deg,#10B981,#6366F1)' : 'linear-gradient(90deg,#EF4444,#F97316)' }} />

        <div style={{ padding: '24px 28px', display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Candidate identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar name={candidate?.name} size={56} />
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>{candidate?.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 6 }}>{candidate?.email}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
                Started: {fmtDate(result?.startedAt)} · Submitted: {fmtDate(result?.submittedAt)}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, background: 'var(--border-1)', alignSelf: 'stretch', flexShrink: 0 }} />

          {/* Score ring */}
          <ScoreRing pct={pct} pass={pass} size={104} />

          {/* Stats grid */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))', gap: 10 }}>
              <Stat label="Marks Scored"   val={`${result?.score ?? 0}/${test?.totalMarks ?? '—'}`}            color={pass ? '#34D399' : '#FCA5A5'} />
              <Stat label="Time Taken"     val={result?.timeTakenMinutes ? `${result.timeTakenMinutes}m` : '—'} />
              <Stat label="Tab Switches"   val={proctoring?.tabSwitches ?? 0}                                   color={proctoring?.tabSwitches > 0 ? '#FCD34D' : 'var(--text-1)'} />
              <Stat label="Copy/Paste"     val={proctoring?.copyPasteAttempts ?? 0}                             color={proctoring?.copyPasteAttempts > 0 ? '#FCA5A5' : 'var(--text-1)'} />
              <Stat label="Status"         val={proctoring?.isSuspicious ? '🚨 Flagged' : '✅ Normal'}          color={proctoring?.isSuspicious ? '#FCA5A5' : '#34D399'} />
            </div>
            {proctoring?.isSuspicious && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', fontSize: 13, color: '#FCA5A5', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🚨</span> This candidate has been flagged for suspicious activity.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab bar + content ── */}
      <div style={{ background: 'var(--s2)', border: '1px solid var(--border-1)', borderRadius: 18, overflow: 'hidden' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-1)', background: 'var(--s1)', padding: '0 20px' }}>
          {[
            { key: 'answers',   label: 'Answers',          count: answers?.length   ?? 0, icon: '📝' },
            { key: 'logs',      label: 'Proctoring Logs',  count: logs?.length      ?? 0, icon: '🛡️' },
            { key: 'snapshots', label: 'Webcam Snapshots', count: snapshots?.length ?? 0, icon: '📷' },
          ].map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '14px 16px', border: 'none', cursor: 'pointer',
                background: 'transparent', fontSize: 13.5, fontWeight: active ? 700 : 500,
                color: active ? '#818CF8' : 'var(--text-3)',
                borderBottom: `2px solid ${active ? '#6366F1' : 'transparent'}`,
                marginBottom: -1, transition: 'all 0.2s',
                fontFamily: 'DM Sans, sans-serif',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--text-2)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--text-3)'; }}>
                <span>{t.icon}</span>
                {t.label}
                <span style={{
                  minWidth: 20, height: 20, borderRadius: 10, padding: '0 6px',
                  background: active ? 'rgba(99,102,241,0.2)' : 'var(--s4)',
                  color: active ? '#818CF8' : 'var(--text-3)',
                  fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{ padding: '20px' }}>
          {tab === 'answers'   && <AnswersTab   answers={answers} />}
          {tab === 'logs'      && <LogsTab      logs={logs} />}
          {tab === 'snapshots' && <SnapshotsTab snapshots={snapshots} />}
        </div>
      </div>
    </RecruiterLayout>
  );
};

export default CandidateReport;