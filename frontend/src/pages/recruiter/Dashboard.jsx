/**
 * RecruiterDashboard.jsx
 * Route: /recruiter/dashboard
 * Complete test management with sidebar layout + slide-over form panel.
 */

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import RecruiterLayout from '../../components/layout/RecruiterLayout';
import * as testApi from '../../api/testApi';
import * as candidateApi from '../../api/candidateApi';

/* ─── Tiny helpers ───────────────────────────────────────── */
function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, []);
  const colors = {
    success: { bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)', text: '#6EE7B7', icon: '✓' },
    error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)',  text: '#FCA5A5', icon: '✕' },
    info:    { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.25)', text: '#A5B4FC', icon: 'i' },
  };
  const c = colors[type];
  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px', borderRadius: 12,
      background: 'var(--s3)', border: `1px solid ${c.border}`,
      boxShadow: 'var(--shadow-lg)',
      animation: 'toastSlide 0.35s var(--ease-spring)',
      maxWidth: 360,
    }}>
      <div style={{
        width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
        background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, color: c.text,
      }}>{c.icon}</div>
      <span style={{ fontSize: 13.5, color: 'var(--text-1)', flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 2, fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  );
}

const statusConfig = {
  draft:     { label: 'Draft',     color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  scheduled: { label: 'Scheduled', color: '#6366F1', bg: 'rgba(99,102,241,0.1)',  border: 'rgba(99,102,241,0.25)' },
  active:    { label: 'Live',      color: '#10B981', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
  completed: { label: 'Completed', color: '#6B7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.25)' },
  cancelled: { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
};

function StatusBadge({ status }) {
  const c = statusConfig[status] || statusConfig.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      background: c.bg, border: `1px solid ${c.border}`,
      fontSize: 11, fontWeight: 700, color: c.color, letterSpacing: '0.04em',
    }}>
      {status === 'active' && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block', animation: 'glowPulse 1.5s ease-in-out infinite' }} />
      )}
      {c.label}
    </span>
  );
}

/* ─── Stat Card ──────────────────────────────────────────── */
function StatCard({ label, value, icon, topColor, loading }) {
  return (
    <div style={{
      background: 'var(--s2)', border: '1px solid var(--border-1)',
      borderRadius: 16, padding: '22px 24px', position: 'relative', overflow: 'hidden',
      borderTop: `2px solid ${topColor}`,
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${topColor}18`, border: `1px solid ${topColor}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: topColor,
        }}>
          {icon}
        </div>
      </div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>
        {loading ? <span style={{ display: 'inline-block', width: 40, height: 28, background: 'var(--s4)', borderRadius: 6, animation: 'shimmer 1.5s linear infinite' }} /> : value ?? 0}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6, letterSpacing: '0.03em' }}>{label}</div>
    </div>
  );
}

/* ─── Row Action Menu ────────────────────────────────────── */
function ActionMenu({ test, onEdit, onDelete, onCandidates, onMonitor, onPublish, onReleaseResults, onReport }) {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState({});
  const btnRef = useRef();
  const menuRef = useRef();

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (btnRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', close);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const handleOpen = () => {
    if (open) { setOpen(false); return; }
    requestAnimationFrame(() => {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      const MENU_W = 188;
      const MENU_H = 260;
      const spaceBelow = window.innerHeight - rect.bottom;
      setMenuStyle({
        position: 'fixed',
        top: spaceBelow >= MENU_H ? rect.bottom + 4 : rect.top - MENU_H - 4,
        left: Math.max(8, Math.min(rect.right - MENU_W, window.innerWidth - MENU_W - 8)),
        width: MENU_W,
        zIndex: 99999,
      });
      setOpen(true);
    });
  };

  const items = [
    {
      label: 'Edit Test', action: onEdit, always: true,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      ),
    },
    {
      label: 'Questions', action: () => onReport('q'), always: true,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
      ),
    },
    {
      label: 'Candidates', action: onCandidates, always: true,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      label: 'View Report', action: onReport, always: true,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6"  y1="20" x2="6"  y2="14"/>
        </svg>
      ),
    },
    {
      label: 'Publish', action: onPublish, show: test.status === 'draft',
      color: '#34D399',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/>
          <polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      ),
    },
    {
      label: 'Monitor Live', action: onMonitor, show: ['scheduled', 'active'].includes(test.status),
      color: '#F87171',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
      ),
    },
    {
      label: 'Release Results', action: onReleaseResults,
      show: test.status === 'completed' && !test.show_results_immediately,
      color: '#A78BFA',
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
        </svg>
      ),
    },
    {
      label: 'Delete', action: onDelete, always: true, danger: true,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      ),
    },
  ].filter(i => i.always || i.show);

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        style={{
          background: open ? 'rgba(99,102,241,0.15)' : 'var(--s3)',
          border: `1px solid ${open ? 'rgba(99,102,241,0.35)' : 'var(--border-2)'}`,
          borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
          color: open ? '#818CF8' : 'var(--text-2)',
          fontSize: 13, transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          if (!open) {
            e.currentTarget.style.background = 'rgba(99,102,241,0.1)';
            e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)';
            e.currentTarget.style.color = '#818CF8';
          }
        }}
        onMouseLeave={e => {
          if (!open) {
            e.currentTarget.style.background = 'var(--s3)';
            e.currentTarget.style.borderColor = 'var(--border-2)';
            e.currentTarget.style.color = 'var(--text-2)';
          }
        }}
      >
        Actions
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && createPortal(
        <>
          {/* invisible full-screen click trap */}
          <div
            onClick={() => setOpen(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
          />

          <div ref={menuRef} style={{
            ...menuStyle,
            background: 'var(--s2)',
            border: '1px solid var(--border-2)',
            borderRadius: 12,
            padding: '5px',
            boxShadow: 'var(--shadow-lg)',
            animation: 'dropIn 0.15s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <style>{`
              @keyframes dropIn {
                from { opacity:0; transform:translateY(-4px) scale(0.98); }
                to   { opacity:1; transform:translateY(0) scale(1); }
              }
            `}</style>

            {items.map((item, i) => {
              const isDivider = item.danger && items.slice(0, i).some(x => !x.danger);
              return (
                <div key={i}>
                  {isDivider && (
                    <div style={{ height: 1, background: 'var(--border-1)', margin: '4px 0' }} />
                  )}
                  <button
                    onClick={() => { item.action(test); setOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      width: '100%', padding: '8px 10px', borderRadius: 8,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: item.danger ? '#F87171' : item.color || 'var(--text-2)',
                      fontSize: 13, textAlign: 'left',
                      fontFamily: 'DM Sans, sans-serif', fontWeight: 500,
                      transition: 'background 0.1s, color 0.1s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = item.danger
                        ? 'rgba(248,113,113,0.1)'
                        : item.color
                          ? `${item.color}15`
                          : 'var(--s3)';
                      e.currentTarget.style.color = item.danger
                        ? '#F87171'
                        : item.color || 'var(--text-1)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'none';
                      e.currentTarget.style.color = item.danger
                        ? '#F87171'
                        : item.color || 'var(--text-2)';
                    }}
                  >
                    <span style={{
                      width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: item.danger
                        ? 'rgba(248,113,113,0.12)'
                        : item.color
                          ? `${item.color}18`
                          : 'var(--s3)',
                      color: item.danger ? '#F87171' : item.color || 'var(--text-3)',
                    }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                </div>
              );
            })}
          </div>
        </>,
        document.body
      )}
    </>
  );
}

/* ─── Toggle Switch ──────────────────────────────────────── */
function Toggle({ checked, onChange, label, sub }) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', padding: '10px 0' }}>
      <div onClick={onChange} style={{
        width: 40, height: 22, borderRadius: 11, flexShrink: 0,
        background: checked ? 'var(--brand)' : 'var(--s5)',
        border: `1px solid ${checked ? 'var(--border-brand)' : 'var(--border-2)'}`,
        position: 'relative', cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: checked ? '0 0 10px rgba(99,102,241,0.3)' : 'none',
        marginTop: 1,
      }}>
        <div style={{
          width: 16, height: 16, borderRadius: '50%', background: 'white',
          position: 'absolute', top: 2, left: checked ? 20 : 2,
          transition: 'left 0.2s var(--ease-spring)',
          boxShadow: 'var(--shadow-sm)',
        }} />
      </div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-1)' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>}
      </div>
    </label>
  );
}

/* ─── Slide-Over Panel ───────────────────────────────────── */
function SlideOver({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'fadeIn 0.2s both',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 201,
        width: '100%', maxWidth: 540,
        background: 'var(--s2)',
        borderLeft: '1px solid var(--border-1)',
        display: 'flex', flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)',
        animation: 'slideOverIn 0.35s var(--ease-spring)',
      }}>
        <style>{`
          @keyframes slideOverIn {
            from { transform: translateX(100%); opacity: 0.5; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '22px 28px', borderBottom: '1px solid var(--border-1)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>{title}</h2>
            </div>
            {subtitle && <p style={{ fontSize: 12.5, color: 'var(--text-3)', marginLeft: 38 }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{
            background: 'var(--s3)', border: '1px solid var(--border-1)',
            borderRadius: 8, padding: 6, cursor: 'pointer',
            color: 'var(--text-2)', display: 'flex', alignItems: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)'; e.currentTarget.style.color = 'var(--text-1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }} className="custom-scrollbar">
          {children}
        </div>
      </div>
    </>
  );
}

/* ─── Form Field ─────────────────────────────────────────── */
function FormField({ label, hint, error, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      {label && (
        <label style={{
          display: 'block', fontSize: 11, fontWeight: 600,
          color: error ? '#FCA5A5' : 'var(--text-3)',
          letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 7,
        }}>
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 5 }}>{hint}</p>}
      {error && <p style={{ fontSize: 12, color: '#FCA5A5', marginTop: 5 }}>{error}</p>}
    </div>
  );
}

function FInput({ type = 'text', value, onChange, placeholder, min, max, required, disabled }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type} value={value} onChange={onChange}
      placeholder={placeholder} min={min} max={max}
      required={required} disabled={disabled}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10,
        background: 'var(--input-bg)',
        border: `1px solid ${focused ? 'var(--brand)' : 'var(--input-border)'}`,
        color: 'var(--text-1)', fontSize: 14, outline: 'none',
        boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none',
        transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif',
        opacity: disabled ? 0.5 : 1,
      }}
    />
  );
}

/* ─── Test Form (Create + Edit) ──────────────────────────── */
const defaultForm = {
  title: '', duration_minutes: 60, questions_per_candidate: '',
  start_time: '', end_time: '',
  enable_webcam: true, enable_second_camera: false, enable_location_tracking: false,
  allowed_latitude: '', allowed_longitude: '', allowed_radius: 500,
  enable_tab_switch_detection: true, max_tab_switches: 3,
  show_results_immediately: false,
};

function TestForm({ form, setForm, onSubmit, loading, isEdit }) {
  const [fetchingLoc, setFetchingLoc] = useState(false);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setFetchingLoc(true);
    navigator.geolocation.getCurrentPosition(
      p => {
        setForm(prev => ({ ...prev, allowed_latitude: p.coords.latitude.toFixed(6), allowed_longitude: p.coords.longitude.toFixed(6) }));
        setFetchingLoc(false);
      },
      () => setFetchingLoc(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const section = (label) => (
    <div style={{ marginTop: 28, marginBottom: 16, paddingBottom: 8, borderBottom: '1px solid var(--border-1)' }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{label}</p>
    </div>
  );

  return (
    <form onSubmit={onSubmit}>
      {/* Basics */}
      <FormField label="Test Title">
        <FInput value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. JavaScript Developer Assessment" required />
      </FormField>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <FormField label="Duration (minutes)">
          <FInput type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: +e.target.value }))} min={1} max={600} required />
        </FormField>
        <FormField label="Questions/Candidate" hint="Blank = show all">
          <FInput type="number" value={form.questions_per_candidate} onChange={e => setForm(p => ({ ...p, questions_per_candidate: e.target.value === '' ? '' : +e.target.value }))} placeholder="All" min={1} />
        </FormField>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <FormField label="Start Time">
          <FInput type="datetime-local" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} required />
        </FormField>
        <FormField label="End Time">
          <FInput type="datetime-local" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} required />
        </FormField>
      </div>

      {/* Proctoring */}
      {section('Proctoring Settings')}
      <div style={{ background: 'var(--s3)', border: '1px solid var(--border-1)', borderRadius: 12, padding: '4px 16px', marginBottom: 16 }}>
        <Toggle checked={form.enable_webcam} onChange={() => setForm(p => ({ ...p, enable_webcam: !p.enable_webcam }))}
          label="Webcam Monitoring" sub="Periodic snapshots + face detection" />
        <div style={{ height: 1, background: 'var(--border-1)' }} />
        <Toggle checked={form.enable_second_camera} onChange={() => setForm(p => ({ ...p, enable_second_camera: !p.enable_second_camera }))}
          label="Secondary Camera (Mobile)" sub="Candidate scans a QR code to connect phone" />
        <div style={{ height: 1, background: 'var(--border-1)' }} />
        <Toggle checked={form.enable_tab_switch_detection} onChange={() => setForm(p => ({ ...p, enable_tab_switch_detection: !p.enable_tab_switch_detection }))}
          label="Tab Switch Detection" sub="Log every time candidate leaves the exam tab" />
      </div>

      {form.enable_tab_switch_detection && (
        <FormField label="Max Tab Switches Allowed" hint="Exam auto-submits after this many violations">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="range" min={1} max={20} value={form.max_tab_switches}
              onChange={e => setForm(p => ({ ...p, max_tab_switches: +e.target.value }))}
              style={{ flex: 1, accentColor: 'var(--brand)' }}
            />
            <div style={{
              width: 40, height: 36, borderRadius: 8, background: 'var(--s3)',
              border: '1px solid var(--border-2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--brand-light)',
            }}>
              {form.max_tab_switches}
            </div>
          </div>
        </FormField>
      )}

      {/* Location */}
      <div style={{ background: 'var(--s3)', border: '1px solid var(--border-1)', borderRadius: 12, padding: '4px 16px', marginBottom: 16 }}>
        <Toggle checked={form.enable_location_tracking} onChange={() => setForm(p => ({ ...p, enable_location_tracking: !p.enable_location_tracking }))}
          label="Location Verification" sub="GPS geofence — candidate must be within allowed radius" />
      </div>

      {form.enable_location_tracking && (
        <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#A5B4FC' }}>📍 Allowed Location</span>
            <button type="button" onClick={useCurrentLocation} disabled={fetchingLoc} style={{
              padding: '5px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
              background: fetchingLoc ? 'var(--s4)' : 'rgba(99,102,241,0.2)',
              border: '1px solid rgba(99,102,241,0.3)', color: '#A5B4FC',
              cursor: fetchingLoc ? 'wait' : 'pointer', transition: 'all 0.2s',
            }}>
              {fetchingLoc ? '⏳ Fetching…' : '📡 Use My Location'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <FormField label="Latitude">
              <FInput type="number" value={form.allowed_latitude} onChange={e => setForm(p => ({ ...p, allowed_latitude: e.target.value }))} placeholder="26.712345" />
            </FormField>
            <FormField label="Longitude">
              <FInput type="number" value={form.allowed_longitude} onChange={e => setForm(p => ({ ...p, allowed_longitude: e.target.value }))} placeholder="88.123456" />
            </FormField>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#A5B4FC' }}>Allowed Radius</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#818CF8', fontFamily: 'Syne, sans-serif' }}>{form.allowed_radius}m</span>
            </div>
            <input type="range" min={100} max={5000} step={100} value={form.allowed_radius}
              onChange={e => setForm(p => ({ ...p, allowed_radius: +e.target.value }))}
              style={{ width: '100%', accentColor: '#6366F1' }}
            />
          </div>
        </div>
      )}

      {/* Results */}
      {section('Result Settings')}
      <div style={{ background: 'var(--s3)', border: '1px solid var(--border-1)', borderRadius: 12, padding: '4px 16px', marginBottom: 28 }}>
        <Toggle checked={form.show_results_immediately} onChange={() => setForm(p => ({ ...p, show_results_immediately: !p.show_results_immediately }))}
          label="Show Results Immediately"
          sub={form.show_results_immediately ? 'Candidates see score right after submitting' : 'Results hidden until you manually release them'} />
      </div>

      {/* Submit */}
      <button type="submit" disabled={loading} style={{
        width: '100%', padding: '14px', borderRadius: 12,
        background: loading ? 'var(--s4)' : 'linear-gradient(135deg, #6366F1, #8B5CF6)',
        border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
        color: 'white', fontWeight: 700, fontSize: 15,
        fontFamily: 'Syne, sans-serif', letterSpacing: '0.01em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: loading ? 'none' : '0 4px 20px rgba(99,102,241,0.35)',
        transition: 'all 0.25s',
      }}>
        {loading
          ? <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} /> Saving…</>
          : isEdit ? '✓ Save Changes' : '+ Create Test'
        }
      </button>
    </form>
  );
}

/* ─── Candidates Slide-Over ──────────────────────────────── */
function CandidatesPanel({ open, onClose, test, onToast }) {
  const [available, setAvailable]   = useState([]);
  const [assigned, setAssigned]     = useState([]);
  const [selected, setSelected]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [assigning, setAssigning]   = useState(false);
  const [search, setSearch]         = useState('');

  useEffect(() => {
    if (!open || !test) return;
    setLoading(true);
    Promise.all([
      candidateApi.getAvailableCandidates(),
      candidateApi.getTestCandidates(test.test_id),
    ]).then(([avRes, asRes]) => {
      setAvailable(avRes.data.candidates);
      setAssigned(asRes.data.candidates);
      setSelected([]);
    }).catch(() => onToast('Failed to load candidates', 'error'))
      .finally(() => setLoading(false));
  }, [open, test]);

  const unassigned = available.filter(c =>
    !assigned.find(a => a.candidate_id === c.user_id) &&
    (c.full_name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const toggle = (id) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleAssign = async () => {
    if (!selected.length) return;
    setAssigning(true);
    try {
      await candidateApi.assignCandidatesToTest(test.test_id, selected);
      onToast(`${selected.length} candidate(s) assigned!`, 'success');
      const res = await candidateApi.getTestCandidates(test.test_id);
      setAssigned(res.data.candidates);
      setSelected([]);
    } catch { onToast('Failed to assign', 'error'); }
    finally { setAssigning(false); }
  };

  const handleRemove = async (candidateId) => {
    try {
      await candidateApi.removeCandidateFromTest(test.test_id, candidateId);
      setAssigned(p => p.filter(c => c.candidate_id !== candidateId));
      onToast('Candidate removed', 'info');
    } catch { onToast('Failed to remove', 'error'); }
  };

  return (
    <SlideOver open={open} onClose={onClose} title="Manage Candidates" subtitle={test?.title}>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--text-3)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--s5)', borderTopColor: 'var(--brand)', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Loading candidates…
          </div>
        </div>
      ) : (
        <>
          {/* Assigned */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                Assigned ({assigned.length})
              </p>
            </div>
            {assigned.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', borderRadius: 10, background: 'var(--s3)', color: 'var(--text-3)', fontSize: 13 }}>
                No candidates assigned yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {assigned.map(c => (
                  <div key={c.candidate_id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 10,
                    background: 'var(--s3)', border: '1px solid var(--border-1)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'rgba(16,185,129,0.15)',
                        border: '1px solid rgba(16,185,129,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: '#34D399', fontFamily: 'Syne, sans-serif',
                      }}>
                        {c.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)' }}>{c.full_name}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{c.email}</div>
                      </div>
                    </div>
                    {!c.started_at && (
                      <button onClick={() => handleRemove(c.candidate_id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-3)', fontSize: 12, padding: '4px 8px', borderRadius: 6,
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#FCA5A5'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)'; }}
                      >
                        Remove
                      </button>
                    )}
                    {c.started_at && (
                      <span style={{ fontSize: 11, color: '#F59E0B', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', padding: '2px 8px', borderRadius: 20 }}>
                        In Progress
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ height: 1, background: 'var(--s3)', marginBottom: 24 }} />

          {/* Assign new */}
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 12 }}>
              Add Candidates
            </p>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search candidates…"
                style={{
                  width: '100%', padding: '10px 14px 10px 36px',
                  background: 'var(--s3)', border: '1px solid var(--border-2)',
                  borderRadius: 10, color: 'var(--text-1)', fontSize: 13.5, outline: 'none',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 280, overflowY: 'auto' }} className="custom-scrollbar">
              {unassigned.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-3)', fontSize: 13, background: 'var(--s3)', borderRadius: 10 }}>
                  No candidates available
                </div>
              ) : unassigned.map(c => {
                const checked = selected.includes(c.user_id);
                return (
                  <div key={c.user_id} onClick={() => toggle(c.user_id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 14px', borderRadius: 10,
                    background: checked ? 'rgba(99,102,241,0.08)' : 'var(--s3)',
                    border: `1px solid ${checked ? 'rgba(99,102,241,0.25)' : 'var(--s3)'}`,
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      background: checked ? 'var(--brand)' : 'var(--s5)',
                      border: `1px solid ${checked ? 'transparent' : 'var(--border-2)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {checked && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>}
                    </div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-1)' }}>{c.full_name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{c.email}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {selected.length > 0 && (
              <button onClick={handleAssign} disabled={assigning} style={{
                marginTop: 16, width: '100%', padding: '12px', borderRadius: 11,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                border: 'none', color: 'white', fontWeight: 700, fontSize: 14,
                fontFamily: 'Syne, sans-serif', cursor: assigning ? 'wait' : 'pointer',
                boxShadow: '0 4px 20px rgba(99,102,241,0.3)', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {assigning
                  ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} /> Assigning…</>
                  : `Assign ${selected.length} Candidate${selected.length > 1 ? 's' : ''} →`
                }
              </button>
            )}
          </div>
        </>
      )}
    </SlideOver>
  );
}

/* ─── Delete Confirm ─────────────────────────────────────── */
function DeleteDialog({ test, onConfirm, onClose }) {
  if (!test) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', animation: 'fadeIn 0.2s both' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 201, width: '100%', maxWidth: 420,
        background: 'var(--s2)', border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: 18, padding: '28px 28px 24px',
        boxShadow: 'var(--shadow-xl)',
        animation: 'fadeUp 0.25s both',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6"/><path d="M14 11v6"/>
          </svg>
        </div>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>Delete Test</h3>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
          Are you sure you want to delete <strong style={{ color: 'var(--text-1)' }}>"{test.title}"</strong>?
          This will remove all questions, candidates, and answers permanently.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px', borderRadius: 10,
            background: 'var(--s3)', border: '1px solid var(--border-2)',
            color: 'var(--text-1)', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}>
            Cancel
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '11px', borderRadius: 10,
            background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
            color: '#FCA5A5', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
          >
            Delete
          </button>
        </div>
      </div>
    </>
  );
}

/* ─── MAIN DASHBOARD ─────────────────────────────────────── */
const RecruiterDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tests, setTests]     = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Panels
  const [showCreate, setShowCreate]   = useState(false);
  const [showEdit, setShowEdit]       = useState(false);
  const [showCands, setShowCands]     = useState(false);
  const [showDelete, setShowDelete]   = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);

  const [form, setForm]       = useState(defaultForm);
  const [saving, setSaving]   = useState(false);

  const notify = (msg, type = 'success') => setToast({ msg, type });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [testsRes, statsRes] = await Promise.all([testApi.getAllTests(), testApi.getTestStats()]);
      setTests(testsRes.data.tests);
      setStats(statsRes.data.stats);
    } catch { notify('Failed to load data', 'error'); }
    finally { setLoading(false); }
  };

  const filtered = tests.filter(t => {
    const s = t.title?.toLowerCase().includes(search.toLowerCase());
    const f = statusFilter === 'all' || t.status === statusFilter;
    return s && f;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await testApi.createTest(form);
      notify('Test created!');
      setShowCreate(false);
      setForm(defaultForm);
      loadData();
    } catch (err) { notify(err.response?.data?.message || 'Failed to create', 'error'); }
    finally { setSaving(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await testApi.updateTest(selectedTest.test_id, form);
      notify('Test updated!');
      setShowEdit(false);
      loadData();
    } catch (err) { notify(err.response?.data?.message || 'Failed to update', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await testApi.deleteTest(selectedTest.test_id);
      notify('Test deleted');
      setShowDelete(false);
      loadData();
    } catch { notify('Failed to delete', 'error'); }
  };

  const handlePublish = async (test) => {
    try {
      await testApi.publishTest(test.test_id);
      notify('Test published!');
      loadData();
    } catch { notify('Failed to publish', 'error'); }
  };

  const handleReleaseResults = async (test) => {
    try {
      await testApi.updateTest(test.test_id, { show_results_immediately: true });
      notify('Results released! Candidates can now view their scores.');
      loadData();
    } catch { notify('Failed to release results', 'error'); }
  };

  const openEdit = (test) => {
    setSelectedTest(test);
    setForm({
      title: test.title ?? '', duration_minutes: test.duration_minutes ?? 60,
      questions_per_candidate: test.questions_per_candidate ?? '',
      start_time: test.start_time?.slice(0, 16) ?? '',
      end_time:   test.end_time?.slice(0, 16) ?? '',
      enable_webcam: test.enable_webcam ?? true,
      enable_second_camera: test.enable_second_camera ?? false,
      enable_location_tracking: test.enable_location_tracking ?? false,
      allowed_latitude: test.allowed_latitude ?? '',
      allowed_longitude: test.allowed_longitude ?? '',
      allowed_radius: test.allowed_radius ?? 500,
      enable_tab_switch_detection: test.enable_tab_switch_detection ?? true,
      max_tab_switches: test.max_tab_switches ?? 3,
      show_results_immediately: test.show_results_immediately ?? false,
    });
    setShowEdit(true);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const now = new Date();
  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <RecruiterLayout
      title="Dashboard"
      subtitle={`${getGreeting()}, ${user?.full_name?.split(' ')[0]} 👋`}
      actions={
        <button onClick={() => { setForm(defaultForm); setShowCreate(true); }} style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '8px 18px', borderRadius: 10, fontSize: 13.5, fontWeight: 600,
          background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
          border: 'none', color: 'white', cursor: 'pointer',
          boxShadow: '0 0 20px rgba(99,102,241,0.3)',
          fontFamily: 'DM Sans, sans-serif', transition: 'all 0.2s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(99,102,241,0.45)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 0 20px rgba(99,102,241,0.3)'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Test
        </button>
      }
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes glowPulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* ── Stats row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Total Tests" value={stats?.total} loading={loading} topColor="#6366F1"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z"/><polyline points="9 2 9 9 16 9"/></svg>}
        />
        <StatCard label="Draft" value={stats?.draft} loading={loading} topColor="#F59E0B"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
        />
        <StatCard label="Scheduled" value={stats?.scheduled} loading={loading} topColor="#8B5CF6"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
        />
        <StatCard label="Live Now" value={stats?.active} loading={loading} topColor="#10B981"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M1 6l4 4 4-4M1 18l4-4 4 4M9 12h14"/></svg>}
        />
        <StatCard label="Completed" value={stats?.completed} loading={loading} topColor="#6B7280"
          icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
        />
      </div>

      {/* ── Test table card ── */}
      <div style={{
        background: 'var(--s2)', border: '1px solid var(--border-1)',
        borderRadius: 18, overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
      }}>
        {/* Table toolbar */}
        <div style={{
          padding: '18px 24px', display: 'flex', alignItems: 'center',
          gap: 12, flexWrap: 'wrap',
          borderBottom: '1px solid var(--border-1)',
          background: 'var(--s1)',
        }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginRight: 8 }}>
            My Tests
          </h2>
          <div style={{ flex: 1, position: 'relative', maxWidth: 300 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tests…"
              style={{
                width: '100%', padding: '8px 12px 8px 32px',
                background: 'var(--s3)', border: '1px solid var(--border-2)',
                borderRadius: 9, color: 'var(--text-1)', fontSize: 13.5, outline: 'none',
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['all','draft','scheduled','active','completed'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                background: statusFilter === s ? 'rgba(99,102,241,0.15)' : 'var(--s3)',
                color: statusFilter === s ? '#818CF8' : 'var(--text-3)',
                border: `1px solid ${statusFilter === s ? 'rgba(99,102,241,0.3)' : 'var(--s3)'}`,
                transition: 'all 0.2s', textTransform: 'capitalize',
              }}>
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr>
                {['Test Name','Status','Duration','Questions','Candidates','Scheduled','Actions'].map(h => (
                  <th key={h} style={{
                    padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                    color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase',
                    borderBottom: '1px solid var(--border-1)',
                    background: 'var(--s1)',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-1)' }}>
                        <div style={{ height: 12, borderRadius: 6, background: 'var(--s3)', width: j === 0 ? '80%' : '50%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '56px 24px', textAlign: 'center' }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 16, background: 'var(--s3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                    }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z"/><polyline points="9 2 9 9 16 9"/>
                      </svg>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>No tests found</p>
                    <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Create your first test to get started</p>
                  </td>
                </tr>
              ) : filtered.map((test, i) => (
                <tr key={test.test_id} style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--s2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-1)' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{test.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>ID #{test.test_id}</div>
                  </td>
                  <td style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-1)' }}>
                    <StatusBadge status={test.status} />
                  </td>
                  <td style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-1)', fontSize: 13.5, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                    {test.duration_minutes} min
                  </td>
                  <td style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-1)', fontSize: 13.5, color: 'var(--text-2)' }}>
                    {test.question_count ?? 0}
                  </td>
                  <td style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-1)', fontSize: 13.5, color: 'var(--text-2)' }}>
                    {test.candidate_count ?? 0}
                  </td>
                  <td style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-1)', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {formatDate(test.start_time)}
                  </td>
                  <td style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-1)' }}>
                    <ActionMenu
                      test={test}
                      onEdit={openEdit}
                      onDelete={t => { setSelectedTest(t); setShowDelete(true); }}
                      onCandidates={t => { setSelectedTest(t); setShowCands(true); }}
                      onMonitor={t => navigate(`/recruiter/tests/${t.test_id}/monitor`)}
                      onPublish={handlePublish}
                      onReleaseResults={handleReleaseResults}
                      onReport={t => {
                        if (t === 'q') navigate(`/recruiter/tests/${test.test_id}/questions`);
                        else navigate(`/recruiter/reports/${test.test_id}`);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        {!loading && filtered.length > 0 && (
          <div style={{
            padding: '12px 24px', borderTop: '1px solid var(--border-1)',
            background: 'var(--s1)', fontSize: 12, color: 'var(--text-3)',
          }}>
            Showing {filtered.length} of {tests.length} test{tests.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* ── Slide-overs & dialogs ── */}
      <SlideOver open={showCreate} onClose={() => setShowCreate(false)} title="Create New Test" subtitle="Configure your assessment settings">
        <TestForm form={form} setForm={setForm} onSubmit={handleCreate} loading={saving} isEdit={false} />
      </SlideOver>

      <SlideOver open={showEdit} onClose={() => setShowEdit(false)} title="Edit Test" subtitle={selectedTest?.title}>
        <TestForm form={form} setForm={setForm} onSubmit={handleEdit} loading={saving} isEdit={true} />
      </SlideOver>

      <CandidatesPanel
        open={showCands}
        onClose={() => setShowCands(false)}
        test={selectedTest}
        onToast={notify}
      />

      {showDelete && <DeleteDialog test={selectedTest} onConfirm={handleDelete} onClose={() => setShowDelete(false)} />}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </RecruiterLayout>
  );
};

export default RecruiterDashboard;