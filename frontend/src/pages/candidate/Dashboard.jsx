/**
 * CandidateDashboard.jsx
 * Route: /candidate/dashboard
 * Card-based test list with live countdowns, invitation actions, and result previews.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CandidateLayout from '../../components/layout/CandidateLayout';
import * as candidateApi from '../../api/candidateApi';

/* ─── Toast ──────────────────────────────────────────────── */
function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const c = { success: '#6EE7B7', error: '#FCA5A5', info: '#A5B4FC' }[type];
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderRadius: 12,
      background: 'var(--s3)', border: `1px solid ${c}30`,
      boxShadow: 'var(--shadow-lg)',
      animation: 'toastSlide 0.35s var(--ease-spring)',
      maxWidth: 360,
    }}>
      <span style={{ fontSize: 13.5, color: 'var(--text-1)' }}>{msg}</span>
      <button onClick={onClose} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--text-3)',padding:2,fontSize:16,lineHeight:1 }}>×</button>
    </div>
  );
}

/* ─── Countdown hook ─────────────────────────────────────── */
function useCountdown(targetDate) {
  const calc = useCallback(() => {
    const diff = new Date(targetDate) - new Date();
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { d, h, m, s, diff };
  }, [targetDate]);

  const [time, setTime] = useState(calc);
  useEffect(() => {
    const t = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(t);
  }, [calc]);
  return time;
}

/* ─── Countdown Display ──────────────────────────────────── */
function Countdown({ targetDate, label = 'Starts in', color = '#6366F1' }) {
  const time = useCountdown(targetDate);
  if (!time) return (
    <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#34D399' }}>
      <span style={{ width:6,height:6,borderRadius:'50%',background:'#10B981',animation:'glowPulse 1.5s ease-in-out infinite',display:'inline-block' }} />
      Active now
    </div>
  );

  const pads = (n) => String(n).padStart(2, '0');
  const parts = time.d > 0
    ? [{ v: time.d, l: 'd' }, { v: time.h, l: 'h' }, { v: time.m, l: 'm' }]
    : [{ v: time.h, l: 'h' }, { v: time.m, l: 'm' }, { v: time.s, l: 's' }];

  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {parts.map(({ v, l }) => (
          <div key={l} style={{
            textAlign: 'center', minWidth: 36, padding: '4px 6px', borderRadius: 6,
            background: `${color}12`, border: `1px solid ${color}25`,
          }}>
            <div style={{ fontSize: 15, fontWeight: 800, color, fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>{pads(v)}</div>
            <div style={{ fontSize: 9, color, opacity: 0.7, marginTop: 2, letterSpacing: '0.05em' }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Status helpers ─────────────────────────────────────── */
function getTestStatus(test) {
  const now = new Date();
  const start = new Date(test.start_time);
  const end   = new Date(test.end_time);
  if (test.submitted_at) return 'completed';
  if (test.started_at && !test.submitted_at) {
    const deadline = new Date(new Date(test.started_at).getTime() + test.duration_minutes * 60000);
    if (now >= deadline) return 'time-up';
    return 'in-progress';
  }
  if (now > end)   return 'expired';
  if (now < start) return 'upcoming';
  return 'active';
}

const statusMeta = {
  completed:    { label: 'Completed',    color: '#10B981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)',  dot: true  },
  'in-progress':{ label: 'In Progress',  color: '#6366F1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)',  dot: true  },
  'time-up':    { label: 'Time Expired', color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   dot: false },
  upcoming:     { label: 'Upcoming',     color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',  border: 'rgba(139,92,246,0.25)',  dot: false },
  active:       { label: 'Live',         color: '#10B981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)',  dot: true  },
  expired:      { label: 'Expired',      color: '#6B7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)', dot: false },
};

const invMeta = {
  pending:  { label: 'Invite Pending', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  accepted: { label: 'Accepted',       color: '#10B981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)'  },
  declined: { label: 'Declined',       color: '#EF4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)'   },
};

function Badge({ label, color, bg, border, dot }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: bg, border: `1px solid ${border}`,
      fontSize: 11, fontWeight: 700, color, letterSpacing: '0.04em',
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', animation: 'glowPulse 1.5s ease-in-out infinite' }} />}
      {label}
    </span>
  );
}

/* ─── Proctoring Icons ───────────────────────────────────── */
function ProctoringPill({ enabled, label, icon }) {
  if (!enabled) return null;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 6,
      background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
      fontSize: 11, color: '#A5B4FC',
    }}>
      <span>{icon}</span> {label}
    </div>
  );
}

/* ─── Score Ring ─────────────────────────────────────────── */
function ScoreRing({ pct, pass }) {
  const r = 28, C = 2 * Math.PI * r;
  const dashOff = C - (C * Math.min(pct, 100)) / 100;
  const color = pass ? '#10B981' : '#EF4444';
  return (
    <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
      <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--s4)" strokeWidth="5" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={dashOff}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 800, color, lineHeight: 1 }}>
          {parseFloat(pct || 0).toFixed(0)}%
        </div>
        <div style={{ fontSize: 9, color, marginTop: 1, fontWeight: 700 }}>
          {pass ? 'PASS' : 'FAIL'}
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────── */
function StatCard({ label, value, icon, color, loading }) {
  return (
    <div style={{
      background: 'var(--s2)', border: '1px solid var(--border-1)',
      borderRadius: 14, padding: '20px 22px',
      borderTop: `2px solid ${color}`,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, marginBottom: 12,
        background: `${color}18`, border: `1px solid ${color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color,
      }}>
        {icon}
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
        {loading ? <span style={{ display:'inline-block',width:32,height:24,background:'var(--s4)',borderRadius:5 }} /> : value}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 5 }}>{label}</div>
    </div>
  );
}

/* ─── Test Card ──────────────────────────────────────────── */
function TestCard({ test, onAccept, onDecline, onJoin, onViewResults, responding }) {
  const navigate = useNavigate();
  const status = getTestStatus(test);
  const sMeta  = statusMeta[status] || statusMeta.upcoming;
  const iMeta  = invMeta[test.invitation_status] || invMeta.pending;
  const isPending = test.invitation_status === 'pending';
  const isCompleted = status === 'completed';
  const isActive = status === 'active' && test.invitation_status === 'accepted';
  const isInProgress = status === 'in-progress';
  const isUpcoming = status === 'upcoming' && test.invitation_status === 'accepted';
  const canJoin = (isActive && !test.started_at) || isInProgress;
  const pct = parseFloat(test.percentage || 0);
  const pass = test.result_status === 'pass';

  /* Left accent color */
  const accentColor = isPending ? '#F59E0B' : sMeta.color;

  return (
    <div style={{
      background: 'var(--s2)', border: '1px solid var(--border-1)',
      borderRadius: 18, overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      transition: 'all 0.25s var(--ease-spring)',
      borderLeft: `3px solid ${accentColor}`,
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; e.currentTarget.style.borderColor = `${accentColor}60`; }}
    onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border-1)'; }}
    >
      <div style={{ padding: '22px 24px' }}>
        {/* Top row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: `${accentColor}12`, border: `1px solid ${accentColor}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              {isCompleted
                ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                : isPending
                ? <><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></>
                : <><path d="M9 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z"/><polyline points="9 2 9 9 16 9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></>
              }
            </svg>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <h3 style={{
                fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700,
                color: 'var(--text-1)', margin: 0,
              }}>
                {test.test_title}
              </h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <Badge {...sMeta} />
              {isPending && <Badge {...iMeta} />}
            </div>
            {test.recruiter_organization && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-3)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18M3 10h18M5 6h1m4 0h1m4 0h1m-9 4h1m4 0h1m4 0h1M5 21V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v15"/>
                </svg>
                {test.recruiter_organization}
              </div>
            )}
          </div>

          {/* Score ring for completed */}
          {isCompleted && test.show_results_immediately && (
            <ScoreRing pct={pct} pass={pass} />
          )}
          {isCompleted && !test.show_results_immediately && (
            <div style={{
              padding: '8px 12px', borderRadius: 10,
              background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
              fontSize: 11, color: '#FCD34D', textAlign: 'center', maxWidth: 90,
            }}>
              <div style={{ fontSize: 16, marginBottom: 2 }}>⏳</div>
              Results pending
            </div>
          )}
        </div>

        {/* Meta grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 10, marginBottom: 16,
        }}>
          {[
            {
              icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
              label: 'Duration',
              value: `${test.duration_minutes} min`,
            },
            {
              icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
              label: 'Opens',
              value: new Date(test.start_time).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }),
            },
            {
              icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
              label: 'Closes',
              value: new Date(test.end_time).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }),
            },
          ].map((m, i) => (
            <div key={i} style={{
              background: 'var(--s3)', borderRadius: 10, padding: '10px 12px',
              border: '1px solid var(--border-1)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-3)', marginBottom: 4 }}>
                {m.icon}
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{m.label}</span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)' }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Proctoring pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          <ProctoringPill enabled={test.enable_webcam}            label="Webcam"   icon="🎥" />
          <ProctoringPill enabled={test.enable_second_camera}     label="2nd Cam"  icon="📱" />
          <ProctoringPill enabled={test.enable_location_tracking} label="GPS"      icon="📍" />
          <ProctoringPill enabled={test.enable_tab_monitoring}    label="Tab Watch"icon="👁️" />
        </div>

        {/* Countdown for upcoming */}
        {isUpcoming && (
          <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: 'var(--s3)', border: '1px solid rgba(139,92,246,0.15)' }}>
            <Countdown targetDate={test.start_time} label="Test starts in" color="#8B5CF6" />
          </div>
        )}

        {/* Countdown for active (not joined) */}
        {isActive && !test.started_at && (
          <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 12, background: 'var(--s3)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <Countdown targetDate={test.end_time} label="Window closes in" color="#10B981" />
          </div>
        )}

        {/* In-progress banner */}
        {isInProgress && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#818CF8', animation: 'glowPulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: '#A5B4FC', fontWeight: 500 }}>
              Test in progress — resume to continue where you left off
            </span>
          </div>
        )}

        {/* Time-up banner */}
        {status === 'time-up' && (
          <div style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>⏰</span>
            <span style={{ fontSize: 12.5, color: '#FCA5A5' }}>
              Time expired — your answers were submitted automatically.
            </span>
          </div>
        )}

        {/* Action row */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
          {/* Pending invite actions */}
          {isPending && (
            <>
              <button
                onClick={() => onAccept(test.test_id)}
                disabled={responding === test.test_id}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 700,
                  background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none', color: 'white', cursor: responding === test.test_id ? 'wait' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
                  transition: 'all 0.2s', opacity: responding === test.test_id ? 0.6 : 1,
                }}
                onMouseEnter={e => { if (responding !== test.test_id) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(16,185,129,0.4)'; }}}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(16,185,129,0.3)'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                Accept Invitation
              </button>
              <button
                onClick={() => onDecline(test.test_id)}
                disabled={responding === test.test_id}
                style={{
                  padding: '9px 16px', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                  background: 'var(--s3)', border: '1px solid var(--border-2)',
                  color: 'var(--text-2)', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#FCA5A5'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-2)'; }}
              >
                Decline
              </button>
            </>
          )}

          {/* Join / Resume */}
          {canJoin && (
            <button onClick={() => onJoin(test.test_id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 22px', borderRadius: 10, fontSize: 13.5, fontWeight: 700,
              background: isInProgress ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none', color: 'white', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif',
              boxShadow: isInProgress ? '0 4px 16px rgba(99,102,241,0.3)' : '0 4px 16px rgba(16,185,129,0.3)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
            >
              {isInProgress
                ? <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> Resume Test</>
                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg> Start Test</>
              }
            </button>
          )}

          {/* View results */}
          {isCompleted && test.show_results_immediately && (
            <button onClick={() => onViewResults(test.assignment_id)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
              background: 'var(--s3)', border: `1px solid ${pass ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              color: pass ? '#34D399' : '#FCA5A5', cursor: 'pointer',
              fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              View Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Pending Banner ─────────────────────────────────────── */
function PendingBanner({ count }) {
  if (!count) return null;
  return (
    <div style={{
      padding: '14px 20px', borderRadius: 14, marginBottom: 24,
      background: 'rgba(245,158,11,0.07)',
      border: '1px solid rgba(245,158,11,0.2)',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: 'rgba(245,158,11,0.15)',
        border: '1px solid rgba(245,158,11,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
          <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#FCD34D' }}>
          You have {count} pending invitation{count > 1 ? 's' : ''}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
          Accept or decline below to confirm your participation
        </div>
      </div>
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────── */
function EmptyState({ filter }) {
  const msgs = {
    all:       { icon: '📋', title: 'No tests assigned yet', sub: 'A recruiter will send you an invitation when a test is ready.' },
    pending:   { icon: '📬', title: 'No pending invitations', sub: 'You\'re all caught up!' },
    upcoming:  { icon: '📅', title: 'No upcoming tests', sub: 'Accept an invitation to see your scheduled tests here.' },
    completed: { icon: '🏆', title: 'No completed tests', sub: 'Your completed assessments will appear here after submission.' },
  };
  const { icon, title, sub } = msgs[filter] || msgs.all;
  return (
    <div style={{ padding: '64px 24px', textAlign: 'center' }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20, background: 'var(--s3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 32, margin: '0 auto 20px',
      }}>
        {icon}
      </div>
      <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>{title}</h3>
      <p style={{ fontSize: 14, color: 'var(--text-3)', maxWidth: 340, margin: '0 auto' }}>{sub}</p>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tests, setTests]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState(null);
  const [filter, setFilter]     = useState('all');
  const [responding, setResponding] = useState(null);

  const notify = (msg, type = 'success') => setToast({ msg, type });

  const loadTests = async () => {
    try {
      setLoading(true);
      const res = await candidateApi.getMyCandidateTests();
      setTests(res.data.tests);
    } catch { notify('Failed to load tests', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTests(); }, []);

  const handleInvite = async (testId, status) => {
    setResponding(testId);
    try {
      await candidateApi.updateInvitationStatus(testId, status);
      notify(status === 'accepted' ? '🎉 Invitation accepted!' : 'Invitation declined');
      loadTests();
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to respond', 'error');
    } finally { setResponding(null); }
  };

  const filteredTests = tests.filter(t => {
    if (filter === 'all')       return true;
    if (filter === 'pending')   return t.invitation_status === 'pending';
    if (filter === 'upcoming')  return getTestStatus(t) === 'upcoming';
    if (filter === 'active')    return ['active','in-progress'].includes(getTestStatus(t));
    if (filter === 'completed') return ['completed','time-up'].includes(getTestStatus(t));
    return true;
  });

  const counts = {
    total:     tests.length,
    pending:   tests.filter(t => t.invitation_status === 'pending').length,
    upcoming:  tests.filter(t => getTestStatus(t) === 'upcoming').length,
    completed: tests.filter(t => ['completed','time-up'].includes(getTestStatus(t))).length,
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  };

  const filters = [
    { key: 'all',       label: 'All Tests',  count: counts.total },
    { key: 'pending',   label: 'Invitations', count: counts.pending },
    { key: 'upcoming',  label: 'Upcoming',   count: counts.upcoming },
    { key: 'active',    label: 'Live',        count: null },
    { key: 'completed', label: 'Completed',  count: counts.completed },
  ];

  return (
    <CandidateLayout
      title="My Tests"
      subtitle={`${getGreeting()}, ${user?.full_name?.split(' ')[0]} 👋`}
    >
      <style>{`
        @keyframes glowPulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes toastSlide { from{transform:translateX(100%);opacity:0} to{transform:translateX(0);opacity:1} }
      `}</style>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Assigned" value={counts.total} color="#6366F1" loading={loading}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z"/><polyline points="9 2 9 9 16 9"/></svg>}
        />
        <StatCard label="Invites Pending" value={counts.pending} color="#F59E0B" loading={loading}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
        />
        <StatCard label="Upcoming" value={counts.upcoming} color="#8B5CF6" loading={loading}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <StatCard label="Completed" value={counts.completed} color="#10B981" loading={loading}
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
        />
      </div>

      {/* Pending alert banner */}
      <PendingBanner count={counts.pending} />

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
            background: filter === f.key ? 'rgba(99,102,241,0.15)' : 'var(--s2)',
            color: filter === f.key ? '#818CF8' : 'var(--text-3)',
            border: `1px solid ${filter === f.key ? 'rgba(99,102,241,0.3)' : 'var(--border-1)'}`,
            transition: 'all 0.2s',
          }}>
            {f.label}
            {f.count != null && f.count > 0 && (
              <span style={{
                minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
                background: filter === f.key ? '#6366F1' : 'var(--s4)',
                color: filter === f.key ? 'white' : 'var(--text-3)',
                fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ background: 'var(--s2)', borderRadius: 18, padding: 24, border: '1px solid var(--border-1)' }}>
              <div style={{ display: 'flex', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--s4)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: 14, width: '60%', background: 'var(--s4)', borderRadius: 6, marginBottom: 8 }} />
                  <div style={{ height: 10, width: '40%', background: 'var(--s3)', borderRadius: 6 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredTests.length === 0 ? (
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border-1)', borderRadius: 18 }}>
          <EmptyState filter={filter} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredTests.map(test => (
            <TestCard
              key={test.assignment_id}
              test={test}
              responding={responding}
              onAccept={id => handleInvite(id, 'accepted')}
              onDecline={id => handleInvite(id, 'declined')}
              onJoin={id => navigate(`/candidate/tests/${id}/enrollment`)}
              onViewResults={id => navigate(`/candidate/results/${id}`)}
            />
          ))}
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </CandidateLayout>
  );
};

export default CandidateDashboard;