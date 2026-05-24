/**
 * Login.jsx — TalentProctor
 * Route: /login
 * Redesigned: split-panel layout, full dark/light theme,
 * mobile-first responsive, animated form, demo quick-fill.
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

/* ═══════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════ */
const Ico = ({ d, w = 16, h = 16, sw = 2, fill = 'none', children }) => (
  <svg width={w} height={h} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d} /> : children}
  </svg>
);

/* ═══════════════════════════════════════════════════════════
   THEME TOGGLE
   ═══════════════════════════════════════════════════════════ */
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} title={isDark ? 'Light mode' : 'Dark mode'} className="theme-toggle"
      style={{
        width: 36, height: 36, borderRadius: 10, border: '1px solid var(--border-2)',
        background: 'var(--s3)', color: 'var(--text-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)'; e.currentTarget.style.color = 'var(--text-1)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--text-2)'; }}
    >
      {isDark ? (
        /* Sun */
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        /* Moon */
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROLE CONFIG + DEMO CREDENTIALS
   ═══════════════════════════════════════════════════════════ */
const ROLES = {
  admin:     { label: 'Admin',      color: '#EC4899', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', desc: 'Platform admin' },
  org_owner: { label: 'Org Owner',  color: '#F59E0B', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', desc: 'Manage your org' },
  recruiter: { label: 'Recruiter',  color: '#6366F1', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2', desc: 'Run assessments' },
  candidate: { label: 'Candidate',  color: '#10B981', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', desc: 'Take your test' },
};

const DEMO = [
  { role: 'admin',     email: 'admin@talentproctor.com',  password: 'Admin@123'     },
  { role: 'org_owner', email: 'owner@techcorp.com',       password: 'Owner@123'     },
  { role: 'recruiter', email: 'recruiter@techcorp.com',   password: 'Recruiter@123' },
  { role: 'candidate', email: 'candidate1@test.com',      password: 'Candidate@123' },
];

/* ═══════════════════════════════════════════════════════════
   INPUT FIELD COMPONENT
   ═══════════════════════════════════════════════════════════ */
function Field({ label, type = 'text', value, onChange, error, placeholder, icon, rightSlot, autoComplete, animDelay = '0ms' }) {
  const [focused, setFocused] = useState(false);
  const { isDark } = useTheme();

  return (
    <div style={{ animation: `fadeUp 0.5s ${animDelay} both` }}>
      <label style={{
        display: 'block', fontSize: 11, fontWeight: 700,
        color: 'var(--text-3)', letterSpacing: '0.07em',
        textTransform: 'uppercase', marginBottom: 7,
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {/* Left icon */}
        <div style={{
          position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
          color: focused ? 'var(--brand)' : 'var(--text-3)',
          transition: 'color 0.2s', pointerEvents: 'none', zIndex: 1,
        }}>
          {icon}
        </div>

        <input
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            width: '100%',
            padding: rightSlot ? '13px 44px 13px 42px' : '13px 16px 13px 42px',
            background: 'var(--input-bg)',
            border: `1.5px solid ${error ? 'var(--rose)' : focused ? 'var(--brand)' : 'var(--input-border)'}`,
            borderRadius: 12,
            color: 'var(--text-1)', fontSize: 14, outline: 'none',
            fontFamily: 'DM Sans, sans-serif',
            transition: 'all 0.2s',
            boxShadow: error
              ? '0 0 0 3px rgba(244,63,94,0.10)'
              : focused
              ? '0 0 0 3px var(--brand-subtle)'
              : 'none',
          }}
        />

        {/* Right slot */}
        {rightSlot && (
          <div style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          }}>
            {rightSlot}
          </div>
        )}
      </div>

      {error && (
        <p style={{
          marginTop: 6, fontSize: 12,
          color: 'var(--status-error-text)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
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
   CHECKBOX
   ═══════════════════════════════════════════════════════════ */
function Checkbox({ checked, onChange, label }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <div
        onClick={onChange}
        style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0,
          border: `1.5px solid ${checked ? 'var(--brand)' : 'var(--border-3)'}`,
          background: checked ? 'var(--brand)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
          cursor: 'pointer',
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        )}
      </div>
      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</span>
    </label>
  );
}

/* ═══════════════════════════════════════════════════════════
   LEFT DECORATIVE PANEL
   ═══════════════════════════════════════════════════════════ */
function LeftPanel() {
  const { isDark } = useTheme();

  const features = [
    { icon: '🎥', title: 'AI Webcam Proctoring', sub: 'Face detection, eye tracking & snapshots' },
    { icon: '⚡', title: 'Live Violation Alerts', sub: 'Tab switch, blur & copy-paste detection' },
    { icon: '📊', title: 'Rich Analytics Reports', sub: 'Per-candidate score breakdown & exports' },
    { icon: '🔐', title: 'Role-Based Access', sub: 'Admin → Org → Recruiter → Candidate' },
  ];

  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      background: isDark ? 'var(--s1)' : '#F0F0FB',
      borderRight: '1px solid var(--border-1)',
      display: 'flex', flexDirection: 'column',
      justifyContent: 'space-between',
      padding: '40px 36px',
    }}>
      {/* Ambient blobs */}
      <div style={{
        position: 'absolute', width: 400, height: 400,
        top: -120, left: -120, borderRadius: '50%',
        background: 'var(--brand)', filter: 'blur(120px)',
        opacity: isDark ? 0.10 : 0.07, pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', width: 300, height: 300,
        bottom: -80, right: -80, borderRadius: '50%',
        background: 'var(--violet)', filter: 'blur(100px)',
        opacity: isDark ? 0.08 : 0.06, pointerEvents: 'none',
      }} />

      {/* Top: Logo + headline */}
      <div style={{ position: 'relative' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 44 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--brand), var(--violet))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 22px var(--brand-glow)',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 18, color: 'var(--text-1)', letterSpacing: '-0.025em' }}>
            TalentProctor
          </span>
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: 'Syne', fontSize: 30, fontWeight: 800,
          lineHeight: 1.18, letterSpacing: '-0.03em', marginBottom: 14, color: 'var(--text-1)',
        }}>
          Assessment,<br />
          <span style={{
            background: 'linear-gradient(135deg, var(--brand-light), var(--violet-light))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>
            Redefined.
          </span>
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, maxWidth: 300 }}>
          AI-powered proctoring, live monitoring, and deep analytics — all in one platform built for fair, scalable hiring.
        </p>
      </div>

      {/* Middle: Feature list */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, margin: '36px 0' }}>
        {features.map((f, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 13,
            padding: '13px 15px', borderRadius: 12,
            background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.60)',
            border: '1px solid var(--border-1)',
            backdropFilter: 'blur(8px)',
            animation: `fadeUp 0.5s ${120 * i}ms both`,
          }}>
            <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{f.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{f.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{f.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom: live status badge */}
      <div style={{
        padding: '11px 15px', borderRadius: 10,
        background: 'var(--status-success-bg)',
        border: '1px solid var(--status-success-border)',
        display: 'flex', alignItems: 'center', gap: 10,
        position: 'relative',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--accent)',
          boxShadow: '0 0 8px var(--accent-glow)',
          animation: 'pulse-glow 2s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <span style={{ fontSize: 13, color: 'var(--status-success-text)', fontWeight: 500 }}>
          Platform is online · 99.9% uptime this month
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN LOGIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function Login() {
  const navigate  = useNavigate();
  const { login } = useAuth();
  const { isDark } = useTheme();

  const [formData,     setFormData]     = useState({ email: '', password: '' });
  const [errors,       setErrors]       = useState({});
  const [loading,      setLoading]      = useState(false);
  const [serverError,  setServerError]  = useState('');
  const [showPass,     setShowPass]     = useState(false);
  const [remember,     setRemember]     = useState(false);
  const [activeRole,   setActiveRole]   = useState(null);
  const [success,      setSuccess]      = useState(false);

  /* ── Demo quick-fill ── */
  const fillDemo = (cred) => {
    setFormData({ email: cred.email, password: cred.password });
    setActiveRole(cred.role);
    setErrors({});
    setServerError('');
  };

  /* ── Validation ── */
  const validate = () => {
    const e = {};
    if (!formData.email)                            e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email    = 'Enter a valid email';
    if (!formData.password)                         e.password = 'Password is required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          const role = result.user.role;
          if      (role === 'admin')     navigate('/admin/dashboard');
          else if (role === 'recruiter') navigate('/recruiter/dashboard');
          else if (role === 'org_owner') navigate('/org/dashboard');
          else                           navigate('/candidate/dashboard');
        }, 800);
      } else {
        setServerError(result.message || 'Invalid credentials. Please try again.');
      }
    } catch {
      setServerError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────────────────── */
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--s0)',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Scoped styles ── */}
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes successBounce {
          0%   { transform: scale(0.85); opacity: 0; }
          60%  { transform: scale(1.05); }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Left panel — hidden on mobile, shown on lg */
        .lp-left  { display: none; }
        @media (min-width: 1024px) {
          .lp-left { display: flex; flex-direction: column; width: 420px; flex-shrink: 0; }
        }

        /* Top bar on mobile */
        .lp-mobile-topbar { display: flex; }
        @media (min-width: 1024px) { .lp-mobile-topbar { display: none; } }

        /* Responsive adjustments */
        @media (max-width: 480px) {
          .lp-card { padding: 24px 20px !important; }
          .lp-form-wrap { padding: 28px 16px !important; }
        }

        input::placeholder { color: var(--text-3) !important; opacity: 1; }
      `}</style>

      {/* ════════ LEFT PANEL (desktop) ════════ */}
      <div className="lp-left">
        <LeftPanel />
      </div>

      {/* ════════ RIGHT — FORM PANEL ════════ */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto',
        position: 'relative',
      }}>

        {/* Background mesh */}
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `
            radial-gradient(at 20% 20%, ${isDark ? 'rgba(99,102,241,0.05)' : 'rgba(79,82,232,0.04)'} 0px, transparent 55%),
            radial-gradient(at 80% 80%, ${isDark ? 'rgba(139,92,246,0.04)' : 'rgba(124,58,237,0.03)'} 0px, transparent 55%)
          `,
        }} />

        {/* ── Mobile top bar (logo + theme toggle) ── */}
        <div className="lp-mobile-topbar" style={{
          alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px',
          borderBottom: '1px solid var(--border-1)',
          position: 'relative', zIndex: 2,
          background: 'var(--topbar-bg)',
          backdropFilter: 'blur(20px)',
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: 'linear-gradient(135deg, var(--brand), var(--violet))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px var(--brand-glow)',
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16, color: 'var(--text-1)', letterSpacing: '-0.025em' }}>
              TalentProctor
            </span>
          </Link>
          <ThemeToggle />
        </div>

        {/* ── Desktop: theme toggle floating ── */}
        <div style={{
          position: 'absolute', top: 20, right: 24,
          zIndex: 10, display: 'none',
        }} className="lp-desktop-toggle">
          <style>{`.lp-desktop-toggle { display: none !important; } @media(min-width:1024px){.lp-desktop-toggle{display:flex !important;}}`}</style>
          <ThemeToggle />
        </div>

        {/* ── Main form area ── */}
        <div className="lp-form-wrap" style={{
          flex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '40px 24px',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ width: '100%', maxWidth: 440 }}>

            {/* ── Page header ── */}
            <div style={{ marginBottom: 28, animation: 'fadeUp 0.5s both' }}>
              <h1 style={{
                fontFamily: 'Syne', fontSize: 28, fontWeight: 800,
                letterSpacing: '-0.03em', color: 'var(--text-1)',
                marginBottom: 6, lineHeight: 1.15,
              }}>
                Welcome back
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
                Sign in to your TalentProctor account to continue.
              </p>
            </div>

            {/* ── Demo quick-fill ── */}
            <div style={{
              marginBottom: 24,
              padding: '16px',
              background: isDark ? 'var(--s2)' : 'var(--s1)',
              border: '1px solid var(--border-1)',
              borderRadius: 14,
              animation: 'fadeUp 0.5s 60ms both',
            }}>
              <p style={{
                fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                Quick demo — pick a role
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 8,
              }}>
                {DEMO.map(cred => {
                  const cfg  = ROLES[cred.role];
                  const isOn = activeRole === cred.role;
                  return (
                    <button key={cred.role} onClick={() => fillDemo(cred)} style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: '10px 12px', borderRadius: 10,
                      background: isOn ? `${cfg.color}14` : (isDark ? 'var(--s3)' : '#F5F5FC'),
                      border: `1.5px solid ${isOn ? cfg.color + '55' : 'var(--border-2)'}`,
                      cursor: 'pointer', transition: 'all 0.18s',
                      boxShadow: isOn ? `0 4px 16px ${cfg.color}22` : 'none',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => { if (!isOn) { e.currentTarget.style.borderColor = 'var(--border-3)'; e.currentTarget.style.background = isDark ? 'var(--s4)' : '#EDEDF8'; } }}
                    onMouseLeave={e => { if (!isOn) { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.background = isDark ? 'var(--s3)' : '#F5F5FC'; } }}
                    >
                      {/* Role icon */}
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                        background: isOn ? cfg.color : `${cfg.color}20`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.18s',
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                          stroke={isOn ? '#fff' : cfg.color}
                          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={cfg.icon}/>
                          {cred.role === 'recruiter' && <circle cx="9" cy="7" r="4"/>}
                          {cred.role === 'candidate' && <circle cx="12" cy="7" r="4"/>}
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: isOn ? cfg.color : 'var(--text-1)', lineHeight: 1.2 }}>{cfg.label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{cfg.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Form card ── */}
            <div className="lp-card" style={{
              background: isDark ? 'var(--s2)' : '#FFFFFF',
              border: '1px solid var(--border-2)',
              borderRadius: 18,
              padding: '28px 28px 24px',
              boxShadow: isDark
                ? '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)'
                : '0 4px 24px rgba(0,0,0,0.07)',
              position: 'relative', overflow: 'hidden',
              animation: 'fadeUp 0.5s 120ms both',
            }}>

              {/* Accent top line */}
              <div style={{
                position: 'absolute', top: 0, left: '8%', right: '8%', height: 1,
                background: 'linear-gradient(90deg, transparent, var(--brand-glow), transparent)',
              }} />

              {/* Success overlay */}
              {success && (
                <div style={{
                  position: 'absolute', inset: 0, zIndex: 20, borderRadius: 18,
                  background: isDark ? 'rgba(16,185,129,0.07)' : 'rgba(5,150,105,0.06)',
                  border: '1px solid var(--border-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(8px)',
                }}>
                  <div style={{ textAlign: 'center', animation: 'successBounce 0.5s var(--ease-spring) both' }}>
                    <div style={{
                      width: 60, height: 60, borderRadius: '50%',
                      background: 'var(--status-success-bg)',
                      border: '2px solid var(--status-success-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 14px',
                    }}>
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--status-success-text)' }}>
                      Signed in! Redirecting…
                    </p>
                  </div>
                </div>
              )}

              {/* Server error */}
              {serverError && (
                <div style={{
                  marginBottom: 20, padding: '11px 14px', borderRadius: 10,
                  background: 'var(--status-error-bg)',
                  border: '1px solid var(--status-error-border)',
                  display: 'flex', alignItems: 'flex-start', gap: 9,
                  animation: 'fadeUp 0.3s both',
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--status-error-text)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span style={{ fontSize: 13, color: 'var(--status-error-text)', lineHeight: 1.5 }}>{serverError}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                  {/* Email */}
                  <Field
                    label="Email Address"
                    type="email"
                    value={formData.email}
                    onChange={e => {
                      setFormData(p => ({ ...p, email: e.target.value }));
                      if (errors.email) setErrors(p => ({ ...p, email: '' }));
                      setActiveRole(null);
                    }}
                    error={errors.email}
                    placeholder="you@company.com"
                    autoComplete="email"
                    animDelay="80ms"
                    icon={
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                      </svg>
                    }
                  />

                  {/* Password */}
                  <Field
                    label="Password"
                    type={showPass ? 'text' : 'password'}
                    value={formData.password}
                    onChange={e => {
                      setFormData(p => ({ ...p, password: e.target.value }));
                      if (errors.password) setErrors(p => ({ ...p, password: '' }));
                    }}
                    error={errors.password}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    animDelay="140ms"
                    icon={
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    }
                    rightSlot={
                      <button type="button" onClick={() => setShowPass(p => !p)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                        color: 'var(--text-3)', display: 'flex', alignItems: 'center',
                        borderRadius: 6, transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                      title={showPass ? 'Hide password' : 'Show password'}
                      >
                        {showPass ? (
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
                </div>

                {/* Options row */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginTop: 16, marginBottom: 22,
                  animation: 'fadeUp 0.5s 200ms both',
                  flexWrap: 'wrap', gap: 8,
                }}>
                  <Checkbox checked={remember} onChange={() => setRemember(p => !p)} label="Remember me" />
                  <button type="button" onClick={() => notify && notify('Password reset is not yet available. Please contact your administrator.', 'info')} style={{
                    fontSize: 13, color: 'var(--brand)', fontWeight: 600,
                    textDecoration: 'none', background: 'none', border: 'none',
                    cursor: 'pointer', padding: 0, fontFamily: 'inherit', transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--brand-light)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--brand)'}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || success}
                  style={{
                    width: '100%', padding: '14px',
                    borderRadius: 12, border: 'none',
                    background: loading
                      ? 'var(--s4)'
                      : 'linear-gradient(135deg, var(--brand), var(--violet))',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    color: 'white', fontWeight: 700, fontSize: 15,
                    fontFamily: 'Syne, sans-serif', letterSpacing: '0.01em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.25s var(--ease-spring)',
                    boxShadow: loading ? 'none' : 'var(--shadow-brand)',
                    animation: 'fadeUp 0.5s 260ms both',
                  }}
                  onMouseEnter={e => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.filter = 'brightness(1.08)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.filter = '';
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%',
                        border: '2px solid rgba(255,255,255,0.25)',
                        borderTopColor: 'white',
                        animation: 'spin 0.65s linear infinite',
                      }} />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign In
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* ── Register + back links ── */}
            <div style={{
              marginTop: 22, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 10,
              animation: 'fadeUp 0.5s 300ms both',
            }}>
              <p style={{ fontSize: 14, color: 'var(--text-2)', textAlign: 'center' }}>
                New to TalentProctor?{' '}
                <Link to="/register" style={{
                  color: 'var(--brand)', fontWeight: 700, textDecoration: 'none',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--brand-light)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--brand)'}
                >
                  Create an account →
                </Link>
              </p>

              <Link to="/" style={{
                fontSize: 13, color: 'var(--text-3)', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 5,
                transition: 'color 0.15s', padding: '4px 0',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 19l-7-7 7-7"/>
                </svg>
                Back to home
              </Link>
            </div>

          </div>
        </div>

        {/* ── Footer strip ── */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 16,
          position: 'relative', zIndex: 1,
        }}>
          {['Privacy Policy', 'Terms of Service', 'Help'].map(l => (
            <a key={l} href="#" style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
            >
              {l}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}