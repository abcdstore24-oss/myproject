/**
 * Register.jsx — TalentProctor
 * Route: /register
 *
 * Two paths:
 *   "Candidate"    — self-register to take tests
 *   "Organization" — create org + org_owner account (recruiters join via invite)
 *
 * Design mirrors Login.jsx:
 *   • Sticky left panel with features list
 *   • Scoped --tp-* design tokens (dark + light)
 *   • Live password strength meter
 *   • Animated requirement checklist
 *   • Visual org-type picker
 *   • Fully responsive (mobile-first)
 *   • No shared component dependencies
 */

import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

/* ═══════════════════════════════════════════════════════════
   THEME TOGGLE
   ═══════════════════════════════════════════════════════════ */
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} title={isDark ? 'Switch to light' : 'Switch to dark'} className="theme-toggle"
      style={{
        width: 34, height: 34, borderRadius: 9,
        border: '1px solid var(--tp-border)', background: 'var(--tp-s2)',
        color: 'var(--tp-text2)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--tp-s3)'; e.currentTarget.style.color = 'var(--tp-text1)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--tp-s2)'; e.currentTarget.style.color = 'var(--tp-text2)'; }}
    >
      {isDark ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   LEFT PANEL (sticky, desktop-only)
   ═══════════════════════════════════════════════════════════ */
function LeftPanel({ isDark }) {
  const steps = [
    { n: '01', title: 'Pick your path',         sub: 'Candidate or Organization'        },
    { n: '02', title: 'Fill in your details',    sub: 'Name, email, and a strong password' },
    { n: '03', title: 'Verify & get started',    sub: 'Instantly access your dashboard'   },
  ];

  const paths = [
    { icon: '🎓', label: 'Candidates',    desc: 'Register here to take assessments sent by recruiters.' },
    { icon: '🏢', label: 'Organizations', desc: 'Create your org and invite recruiters from your dashboard.' },
    { icon: '📨', label: 'Recruiters',    desc: 'No registration needed — join via the invite link in your email.' },
  ];

  return (
    <aside style={{
      position: 'sticky', top: 0, height: '100vh',
      width: 400, flexShrink: 0, overflowY: 'auto',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: '36px 32px',
      background: isDark
        ? 'linear-gradient(160deg, #0E0F1A 0%, #12132A 100%)'
        : 'linear-gradient(160deg, #F4F4FD 0%, #ECEDFB 100%)',
      borderRight: '1px solid var(--tp-border)',
    }}>

      {/* Top */}
      <div>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 44 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 4px rgba(99,102,241,0.18)',
          }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 17, color: 'var(--tp-text1)', letterSpacing: '-0.02em' }}>
            TalentProctor
          </span>
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: "'Syne', sans-serif", fontSize: 30, fontWeight: 800,
          lineHeight: 1.15, letterSpacing: '-0.03em', color: 'var(--tp-text1)', marginBottom: 10,
        }}>
          Get started<br />
          <span style={{
            background: 'linear-gradient(130deg, #818CF8, #A78BFA)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>in minutes.</span>
        </h2>
        <p style={{ fontSize: 14, color: 'var(--tp-text2)', lineHeight: 1.75, maxWidth: 290, marginBottom: 32 }}>
          Free to start. No credit card required. Your first assessment is ready in under 10 minutes.
        </p>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 32 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 11,
                color: 'white', letterSpacing: '0.02em',
              }}>
                {s.n}
              </div>
              <div style={{ paddingTop: 4 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tp-text1)', marginBottom: 1 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: 'var(--tp-text3)' }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Who registers where */}
        <div style={{
          padding: '14px', borderRadius: 13,
          background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.65)',
          border: '1px solid var(--tp-border)',
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--tp-text3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 11 }}>
            Who registers where?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {paths.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{p.icon}</span>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--tp-text1)' }}>{p.label} — </span>
                  <span style={{ fontSize: 12, color: 'var(--tp-text3)' }}>{p.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div style={{
        marginTop: 24, padding: '11px 14px', borderRadius: 10,
        background: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.1)',
        border: '1px solid rgba(16,185,129,0.25)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: '#10B981', boxShadow: '0 0 0 3px rgba(16,185,129,0.25)',
          animation: 'tp-pulse 2s ease-in-out infinite', display: 'inline-block',
        }}/>
        <span style={{ fontSize: 13, color: '#34D399', fontWeight: 500 }}>Platform online · 99.9% uptime</span>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHARED FIELD COMPONENT
   ═══════════════════════════════════════════════════════════ */
function Field({ label, type = 'text', value, onChange, error, placeholder, icon, rightSlot, autoComplete, optional = false }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 11, fontWeight: 700, color: 'var(--tp-text3)',
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7,
      }}>
        <span>{label}</span>
        {optional && <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'none', letterSpacing: 0, color: 'var(--tp-text3)', opacity: 0.7 }}>Optional</span>}
      </label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{
            position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
            color: focused ? '#6366F1' : 'var(--tp-text3)',
            transition: 'color 0.2s', pointerEvents: 'none', zIndex: 1, display: 'flex',
          }}>
            {icon}
          </div>
        )}
        <input
          type={type} value={value} onChange={onChange} placeholder={placeholder}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: `13px ${rightSlot ? '44px' : '16px'} 13px ${icon ? '42px' : '16px'}`,
            background: 'var(--tp-input-bg)',
            border: `1.5px solid ${error ? '#F43F5E' : focused ? '#6366F1' : 'var(--tp-input-border)'}`,
            borderRadius: 11, color: 'var(--tp-text1)', fontSize: 14, outline: 'none',
            fontFamily: 'inherit', transition: 'border 0.18s, box-shadow 0.18s',
            boxShadow: error
              ? '0 0 0 3px rgba(244,63,94,0.12)'
              : focused ? '0 0 0 3px rgba(99,102,241,0.14)' : 'none',
          }}
        />
        {rightSlot && (
          <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
            {rightSlot}
          </div>
        )}
      </div>
      {error && (
        <p style={{ marginTop: 6, fontSize: 12, color: '#F87171', display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PASSWORD STRENGTH METER
   ═══════════════════════════════════════════════════════════ */
const REQUIREMENTS = [
  { id: 'len',   label: 'At least 8 characters',          test: pw => pw.length >= 8 },
  { id: 'upper', label: 'One uppercase letter (A–Z)',      test: pw => /[A-Z]/.test(pw) },
  { id: 'lower', label: 'One lowercase letter (a–z)',      test: pw => /[a-z]/.test(pw) },
  { id: 'num',   label: 'One number (0–9)',                test: pw => /[0-9]/.test(pw) },
  { id: 'sym',   label: 'One special character (!@#…)',   test: pw => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw) },
];

function getStrength(pw) {
  if (!pw) return 0;
  return REQUIREMENTS.filter(r => r.test(pw)).length;
}

function PasswordStrength({ password }) {
  const score  = getStrength(password);
  const labels = ['', 'Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  const colors = ['', '#F43F5E', '#F97316', '#F59E0B', '#10B981', '#6366F1'];
  const show   = password.length > 0;

  return (
    <div style={{ marginTop: 10 }}>
      {/* Bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 99,
            background: i <= score ? colors[score] : 'var(--tp-s4)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Label */}
      {show && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: colors[score] }}>
            {labels[score]}
          </span>
        </div>
      )}

      {/* Requirements checklist */}
      <div style={{
        padding: '11px 13px', borderRadius: 10,
        background: 'var(--tp-s2)', border: '1px solid var(--tp-border)',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px',
      }}>
        {REQUIREMENTS.map(req => {
          const met = password ? req.test(password) : false;
          return (
            <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                background: met ? '#10B981' : 'var(--tp-s4)',
                border: `1.5px solid ${met ? '#10B981' : 'var(--tp-border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.2s',
              }}>
                {met && (
                  <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 11, color: met ? 'var(--tp-text2)' : 'var(--tp-text3)', transition: 'color 0.2s' }}>
                {req.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PASSWORD FIELD with show/hide toggle
   ═══════════════════════════════════════════════════════════ */
function PasswordField({ label, value, onChange, error, placeholder, autoComplete, showStrength = false }) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <Field
        label={label}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        error={error}
        placeholder={placeholder}
        autoComplete={autoComplete}
        icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        }
        rightSlot={
          <button type="button" onClick={() => setShow(p => !p)} title={show ? 'Hide' : 'Show'}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: 'var(--tp-text3)', display: 'flex', alignItems: 'center',
              borderRadius: 5, transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--tp-text1)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--tp-text3)'}
          >
            {show ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            )}
          </button>
        }
      />
      {showStrength && <PasswordStrength password={value} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ORG TYPE PICKER
   ═══════════════════════════════════════════════════════════ */
const ORG_TYPES = [
  { value: 'company',  label: 'Company',          icon: '🏢' },
  { value: 'college',  label: 'College / Uni',    icon: '🎓' },
  { value: 'school',   label: 'School',           icon: '📚' },
  { value: 'other',    label: 'Other',            icon: '🔧' },
];

function OrgTypePicker({ value, onChange }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--tp-text3)',
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8,
      }}>
        Organization Type
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {ORG_TYPES.map(t => {
          const on = value === t.value;
          return (
            <button key={t.value} type="button" onClick={() => onChange(t.value)} style={{
              padding: '10px 6px', borderRadius: 10, cursor: 'pointer',
              border: `1.5px solid ${on ? '#6366F1' : 'var(--tp-border)'}`,
              background: on ? 'rgba(99,102,241,0.10)' : 'var(--tp-s2)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
              transition: 'all 0.18s',
              boxShadow: on ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
            }}
            onMouseEnter={e => { if (!on) e.currentTarget.style.borderColor = 'var(--tp-s4)'; }}
            onMouseLeave={e => { if (!on) e.currentTarget.style.borderColor = 'var(--tp-border)'; }}
            >
              <span style={{ fontSize: 18 }}>{t.icon}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: on ? '#818CF8' : 'var(--tp-text3)', textAlign: 'center', lineHeight: 1.3 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SECTION DIVIDER
   ═══════════════════════════════════════════════════════════ */
function SectionDivider({ label, icon }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      margin: '4px 0',
    }}>
      <div style={{ flex: 1, height: 1, background: 'var(--tp-border)' }} />
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 12px', borderRadius: 99,
        background: 'var(--tp-s2)', border: '1px solid var(--tp-border)',
        fontSize: 10, fontWeight: 700, color: 'var(--tp-text3)',
        letterSpacing: '0.07em', textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}>
        <span>{icon}</span> {label}
      </div>
      <div style={{ flex: 1, height: 1, background: 'var(--tp-border)' }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SERVER ALERT
   ═══════════════════════════════════════════════════════════ */
function Alert({ type, message, onClose }) {
  const isErr = type === 'error';
  return (
    <div style={{
      padding: '10px 13px', borderRadius: 9,
      background: isErr ? 'rgba(244,63,94,0.08)' : 'rgba(16,185,129,0.08)',
      border: `1px solid ${isErr ? 'rgba(244,63,94,0.25)' : 'rgba(16,185,129,0.25)'}`,
      display: 'flex', alignItems: 'flex-start', gap: 9,
      animation: 'tp-fadeup 0.3s both',
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke={isErr ? '#F87171' : '#34D399'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, marginTop: 1 }}
      >
        {isErr
          ? <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
          : <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
        }
      </svg>
      <span style={{ fontSize: 13, color: isErr ? '#F87171' : '#34D399', lineHeight: 1.5, flex: 1 }}>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: isErr ? '#F87171' : '#34D399', padding: 0, lineHeight: 1,
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PASSWORD VALIDATION
   ═══════════════════════════════════════════════════════════ */
function validatePassword(pw) {
  if (!pw)              return 'Password is required';
  if (pw.length < 8)   return 'At least 8 characters required';
  if (!/[A-Z]/.test(pw)) return 'Must contain an uppercase letter';
  if (!/[a-z]/.test(pw)) return 'Must contain a lowercase letter';
  if (!/[0-9]/.test(pw)) return 'Must contain a number';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw)) return 'Must contain a special character';
  return '';
}

/* ═══════════════════════════════════════════════════════════
   CANDIDATE FORM
   ═══════════════════════════════════════════════════════════ */
function CandidateForm() {
  const navigate     = useNavigate();
  const { register } = useAuth();

  const [form, setForm]     = useState({ full_name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert]   = useState(null);

  const set = field => e => {
    setForm(p => ({ ...p, [field]: e.target.value }));
    setErrors(p => ({ ...p, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Full name is required';
    if (!form.email)            e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (form.phone && !/^[0-9+\-\s()]{7,15}$/.test(form.phone)) e.phone = 'Invalid phone number';
    const pwErr = validatePassword(form.password);
    if (pwErr) e.password = pwErr;
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async ev => {
    ev.preventDefault(); setAlert(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { full_name: form.full_name, email: form.email, password: form.password };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      const res = await register(payload);
      if (res.success) {
        setAlert({ type: 'success', message: 'Account created! Redirecting to your dashboard…' });
        setTimeout(() => navigate('/candidate/dashboard'), 1200);
      } else {
        setAlert({ type: 'error', message: res.message });
      }
    } catch {
      setAlert({ type: 'error', message: 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

        {/* Name */}
        <Field
          label="Full Name" value={form.full_name} onChange={set('full_name')}
          error={errors.full_name} placeholder="Alice Smith" autoComplete="name"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            </svg>
          }
        />

        {/* Email */}
        <Field
          label="Email Address" type="email" value={form.email} onChange={set('email')}
          error={errors.email} placeholder="you@example.com" autoComplete="email"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          }
        />

        {/* Phone */}
        <Field
          label="Phone" type="tel" value={form.phone} onChange={set('phone')}
          error={errors.phone} placeholder="+91 98765 43210" autoComplete="tel"
          optional
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.88 12 19.79 19.79 0 0 1 1.87 3.4 2 2 0 0 1 3.84 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.29 6.29l.62-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          }
        />

        {/* Password with strength */}
        <PasswordField
          label="Password" value={form.password}
          onChange={set('password')} error={errors.password}
          placeholder="••••••••" autoComplete="new-password"
          showStrength
        />

        {/* Confirm password */}
        <PasswordField
          label="Confirm Password" value={form.confirmPassword}
          onChange={set('confirmPassword')} error={errors.confirmPassword}
          placeholder="••••••••" autoComplete="new-password"
        />

        {/* Submit */}
        <SubmitButton loading={loading} label="Create Candidate Account" color="#10B981" />
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════
   ORGANIZATION FORM
   ═══════════════════════════════════════════════════════════ */
function OrgForm() {
  const navigate        = useNavigate();
  const { registerOrg } = useAuth();

  const [form, setForm] = useState({
    org_name: '', org_type: 'company',
    full_name: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [alert, setAlert]    = useState(null);

  const set = field => e => {
    setForm(p => ({ ...p, [field]: e.target.value }));
    setErrors(p => ({ ...p, [field]: '' }));
  };
  const setOrgType = v => setForm(p => ({ ...p, org_type: v }));

  const validate = () => {
    const e = {};
    if (!form.org_name.trim())  e.org_name  = 'Organization name is required';
    if (!form.full_name.trim()) e.full_name  = 'Your name is required';
    if (!form.email)            e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (form.phone && !/^[0-9+\-\s()]{7,15}$/.test(form.phone)) e.phone = 'Invalid phone number';
    const pwErr = validatePassword(form.password);
    if (pwErr) e.password = pwErr;
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = async ev => {
    ev.preventDefault(); setAlert(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        org_name: form.org_name, org_type: form.org_type,
        full_name: form.full_name, email: form.email, password: form.password,
      };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      const res = await registerOrg(payload);
      if (res.success) {
        setAlert({ type: 'success', message: 'Organization registered! Redirecting to your dashboard…' });
        setTimeout(() => navigate('/org/dashboard'), 1200);
      } else {
        setAlert({ type: 'error', message: res.message });
      }
    } catch {
      setAlert({ type: 'error', message: 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

        <SectionDivider label="Organization Details" icon="🏢" />

        {/* Org name */}
        <Field
          label="Organization Name" value={form.org_name} onChange={set('org_name')}
          error={errors.org_name} placeholder="TechCorp / IIT Bombay"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          }
        />

        {/* Org type visual picker */}
        <OrgTypePicker value={form.org_type} onChange={setOrgType} />

        <SectionDivider label="Your Admin Account" icon="👤" />

        {/* Full name */}
        <Field
          label="Your Full Name" value={form.full_name} onChange={set('full_name')}
          error={errors.full_name} placeholder="John Owner" autoComplete="name"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            </svg>
          }
        />

        {/* Email */}
        <Field
          label="Work Email" type="email" value={form.email} onChange={set('email')}
          error={errors.email} placeholder="you@yourcompany.com" autoComplete="email"
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          }
        />

        {/* Phone */}
        <Field
          label="Phone" type="tel" value={form.phone} onChange={set('phone')}
          error={errors.phone} placeholder="+91 98765 43210" autoComplete="tel"
          optional
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.88 12 19.79 19.79 0 0 1 1.87 3.4 2 2 0 0 1 3.84 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9a16 16 0 0 0 6.29 6.29l.62-.95a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          }
        />

        {/* Password with strength */}
        <PasswordField
          label="Password" value={form.password}
          onChange={set('password')} error={errors.password}
          placeholder="••••••••" autoComplete="new-password"
          showStrength
        />

        {/* Confirm password */}
        <PasswordField
          label="Confirm Password" value={form.confirmPassword}
          onChange={set('confirmPassword')} error={errors.confirmPassword}
          placeholder="••••••••" autoComplete="new-password"
        />

        {/* Note */}
        <div style={{
          padding: '10px 13px', borderRadius: 9,
          background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex', alignItems: 'flex-start', gap: 9,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ fontSize: 12, color: '#818CF8', lineHeight: 1.6, margin: 0 }}>
            After registering, you can invite recruiters to your organization directly from your dashboard.
          </p>
        </div>

        {/* Submit */}
        <SubmitButton loading={loading} label="Register Organization" color="#6366F1" />
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════════════════════
   SUBMIT BUTTON (shared)
   ═══════════════════════════════════════════════════════════ */
function SubmitButton({ loading, label, color = '#6366F1' }) {
  return (
    <button type="submit" disabled={loading}
      className="tp-submit"
      style={{
        width: '100%', padding: '13px', borderRadius: 11, border: 'none',
        background: loading ? 'var(--tp-s3)' : `linear-gradient(135deg, ${color}, ${color}CC)`,
        cursor: loading ? 'not-allowed' : 'pointer',
        color: loading ? 'var(--tp-text3)' : 'white',
        fontWeight: 700, fontSize: 15,
        fontFamily: "'Syne', sans-serif", letterSpacing: '0.01em',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        boxShadow: loading ? 'none' : `0 4px 20px ${color}55`,
      }}
    >
      {loading ? (
        <>
          <div style={{
            width: 15, height: 15, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white',
            animation: 'tp-spin 0.65s linear infinite',
          }} />
          Creating account…
        </>
      ) : (
        <>
          {label}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB SWITCHER
   ═══════════════════════════════════════════════════════════ */
const TABS = [
  { key: 'candidate', label: 'Candidate',    icon: '🎓', sub: 'Take assessments' },
  { key: 'org',       label: 'Organization', icon: '🏢', sub: 'Run assessments'  },
];

function TabSwitcher({ active, onChange }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '1fr 1fr',
      gap: 8, marginBottom: 20,
    }}>
      {TABS.map(t => {
        const on = active === t.key;
        return (
          <button key={t.key} type="button" onClick={() => onChange(t.key)} style={{
            padding: '12px 10px', borderRadius: 12, cursor: 'pointer',
            border: `1.5px solid ${on ? '#6366F1' : 'var(--tp-border)'}`,
            background: on ? 'rgba(99,102,241,0.09)' : 'var(--tp-s2)',
            transition: 'all 0.18s',
            boxShadow: on ? '0 0 0 3px rgba(99,102,241,0.14)' : 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: on ? '#818CF8' : 'var(--tp-text1)' }}>{t.label}</span>
            <span style={{ fontSize: 10, color: 'var(--tp-text3)' }}>{t.sub}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN REGISTER PAGE
   ═══════════════════════════════════════════════════════════ */
export default function Register() {
  const { isDark } = useTheme();
  const [tab, setTab] = useState('candidate');

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');

        :root {
          --tp-brand:        #6366F1;
          --tp-brand-dim:    rgba(99,102,241,0.14);
          --tp-s0:           #FFFFFF;
          --tp-s1:           #F7F7FB;
          --tp-s2:           #EFEFF8;
          --tp-s3:           #E4E4F0;
          --tp-s4:           #D4D4E8;
          --tp-border:       rgba(0,0,0,0.08);
          --tp-text1:        #0F0F1A;
          --tp-text2:        #4B4B6A;
          --tp-text3:        #8888AA;
          --tp-input-bg:     #FAFAFF;
          --tp-input-border: rgba(0,0,0,0.11);
        }
        [data-theme="dark"] {
          --tp-s0:           #0B0C18;
          --tp-s1:           #10111F;
          --tp-s2:           #16172A;
          --tp-s3:           #1E1F35;
          --tp-s4:           rgba(38,39,64,0.5);
          --tp-border:       rgba(255,255,255,0.07);
          --tp-text1:        #F0F0FF;
          --tp-text2:        #9898C0;
          --tp-text3:        #5A5A80;
          --tp-input-bg:     rgba(18,19,37,0.5);
          --tp-input-border: rgba(255,255,255,0.09);
        }

        @keyframes tp-fadeup {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes tp-spin { to { transform:rotate(360deg); } }
        @keyframes tp-pulse {
          0%,100% { box-shadow:0 0 0 3px rgba(16,185,129,0.25); }
          50%      { box-shadow:0 0 0 6px rgba(16,185,129,0.10); }
        }

        .tp-left   { display:none !important; }
        @media (min-width:1024px) { .tp-left { display:flex !important; } }

        .tp-topbar { display:flex !important; }
        @media (min-width:1024px) { .tp-topbar { display:none !important; } }

        .tp-dtoggle { display:none !important; }
        @media (min-width:1024px) { .tp-dtoggle { display:flex !important; } }

        .tp-submit { transition: transform 0.18s, filter 0.18s, box-shadow 0.18s; }
        .tp-submit:not(:disabled):hover {
          transform: translateY(-2px);
          filter: brightness(1.08);
        }

        input::placeholder { color: var(--tp-text3) !important; opacity:1; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{
        display: 'flex', minHeight: '100vh',
        background: 'var(--tp-s0)',
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}>

        {/* ════ LEFT PANEL ════ */}
        <div className="tp-left">
          <LeftPanel isDark={isDark} />
        </div>

        {/* ════ RIGHT PANEL ════ */}
        <div style={{
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
          overflowY: 'auto', background: 'var(--tp-s1)', position: 'relative',
        }}>
          {/* Mesh bg */}
          <div style={{
            position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
            backgroundImage: isDark
              ? 'radial-gradient(at 20% 20%, rgba(99,102,241,0.06) 0, transparent 55%), radial-gradient(at 80% 80%, rgba(139,92,246,0.05) 0, transparent 55%)'
              : 'radial-gradient(at 20% 20%, rgba(99,102,241,0.05) 0, transparent 55%), radial-gradient(at 80% 80%, rgba(139,92,246,0.04) 0, transparent 55%)',
          }} />

          {/* Mobile topbar */}
          <div className="tp-topbar" style={{
            alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--tp-border)',
            background: isDark ? 'rgba(11,12,24,0.85)' : 'rgba(247,247,251,0.9)',
            backdropFilter: 'blur(18px)',
            position: 'sticky', top: 0, zIndex: 10,
          }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 15, color: 'var(--tp-text1)', letterSpacing: '-0.02em' }}>
                TalentProctor
              </span>
            </Link>
            <ThemeToggle />
          </div>

          {/* Desktop toggle */}
          <div className="tp-dtoggle" style={{ position: 'absolute', top: 18, right: 22, zIndex: 10 }}>
            <ThemeToggle />
          </div>

          {/* Form area */}
          <div style={{
            flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '40px 24px 48px', position: 'relative', zIndex: 1,
          }}>
            <div style={{ width: '100%', maxWidth: 460 }}>

              {/* Header */}
              <div style={{ marginBottom: 24, animation: 'tp-fadeup 0.45s both' }}>
                <h1 style={{
                  fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800,
                  letterSpacing: '-0.03em', color: 'var(--tp-text1)', marginBottom: 5, lineHeight: 1.2,
                }}>
                  Create your account
                </h1>
                <p style={{ fontSize: 14, color: 'var(--tp-text2)', lineHeight: 1.65 }}>
                  Choose your path below. Recruiters join via an invite link — no registration needed.
                </p>
              </div>

              {/* Tab switcher */}
              <div style={{ animation: 'tp-fadeup 0.45s 60ms both' }}>
                <TabSwitcher active={tab} onChange={setTab} />
              </div>

              {/* Form card */}
              <div style={{
                background: isDark ? 'var(--tp-s2)' : '#FFFFFF',
                border: '1px solid var(--tp-border)',
                borderRadius: 16,
                padding: '24px 24px 22px',
                boxShadow: isDark
                  ? '0 12px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)'
                  : '0 4px 20px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
                position: 'relative', overflow: 'hidden',
                animation: 'tp-fadeup 0.45s 120ms both',
              }}>
                {/* Accent top line */}
                <div style={{
                  position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
                  background: tab === 'candidate'
                    ? 'linear-gradient(90deg, transparent, rgba(16,185,129,0.5), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)',
                }} />

                {/* Context note */}
                <p style={{ fontSize: 13, color: 'var(--tp-text2)', lineHeight: 1.65, marginBottom: 18 }}>
                  {tab === 'candidate'
                    ? 'Create a candidate account to take assessments sent by recruiters or organizations.'
                    : 'Register your company, college, or school. You\'ll be able to create tests and invite recruiters from your dashboard.'
                  }
                </p>

                {/* Render active form */}
                {tab === 'candidate' ? <CandidateForm /> : <OrgForm />}
              </div>

              {/* Bottom links */}
              <div style={{
                marginTop: 20, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 10,
                animation: 'tp-fadeup 0.45s 200ms both',
              }}>
                <p style={{ fontSize: 14, color: 'var(--tp-text2)', textAlign: 'center' }}>
                  Already have an account?{' '}
                  <Link to="/login" style={{ color: '#6366F1', fontWeight: 700, textDecoration: 'none' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#818CF8'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6366F1'}
                  >
                    Sign in →
                  </Link>
                </p>
                <p style={{ fontSize: 12, color: 'var(--tp-text3)', textAlign: 'center', lineHeight: 1.6 }}>
                  📨 Recruiter? Check your email for an invite link.
                </p>
                <Link to="/"
                  style={{
                    fontSize: 13, color: 'var(--tp-text3)', textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    transition: 'color 0.15s', padding: '4px 0',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--tp-text2)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--tp-text3)'}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  Back to home
                </Link>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer style={{
            padding: '12px 24px', borderTop: '1px solid var(--tp-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexWrap: 'wrap', gap: 20, position: 'relative', zIndex: 1,
          }}>
            {['Privacy Policy', 'Terms of Service', 'Help'].map(l => (
              <a key={l} href="#" style={{ fontSize: 12, color: 'var(--tp-text3)', textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--tp-text2)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--tp-text3)'}
              >
                {l}
              </a>
            ))}
          </footer>
        </div>
      </div>
    </>
  );
}