/**
 * InviteAccept.jsx
 * Loaded from /invite/accept?token=xxx
 * Validates token, then lets the recruiter set their name + password.
 *
 * STYLING ONLY CHANGE: className → inline styles.
 * All API calls, auth hooks, payload shape, and navigation are unchanged.
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import * as authApi from '../../api/authApi';

/* ─── Password validator — identical to original ─────────── */
const validatePassword = (pw) => {
  if (!pw)                return 'Password is required';
  if (pw.length < 8)      return 'At least 8 characters';
  if (!/[A-Z]/.test(pw)) return 'Must contain an uppercase letter';
  if (!/[a-z]/.test(pw)) return 'Must contain a lowercase letter';
  if (!/[0-9]/.test(pw)) return 'Must contain a number';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw))
    return 'Must contain a special character';
  return '';
};

/* ─── Theme Toggle ───────────────────────────────────────── */
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} title={isDark ? 'Switch to light' : 'Switch to dark'} className="theme-toggle"
      style={{
        width: 34, height: 34, borderRadius: 9,
        border: '1px solid var(--border-2)', background: 'var(--s3)',
        color: 'var(--text-2)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', transition: 'all 0.18s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)'; e.currentTarget.style.color = 'var(--text-1)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--text-2)'; }}
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

/* ─── Inline Input ───────────────────────────────────────── */
function Field({ label, type = 'text', value, onChange, error, placeholder, autoComplete, required }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 2 }}>
      {label && (
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
          {label}
        </label>
      )}
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} autoComplete={autoComplete} required={required}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box', padding: '11px 14px',
          background: 'var(--input-bg)',
          border: `1.5px solid ${error ? 'var(--rose)' : focused ? 'var(--brand)' : 'var(--input-border)'}`,
          borderRadius: 10, color: 'var(--text-1)', fontSize: 14, outline: 'none',
          fontFamily: 'DM Sans, sans-serif',
          boxShadow: error ? '0 0 0 3px rgba(244,63,94,0.12)' : focused ? '0 0 0 3px var(--brand-subtle)' : 'none',
          transition: 'all 0.18s',
        }}
      />
      {error && (
        <p style={{ marginTop: 5, fontSize: 12, color: 'var(--status-error-text)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
        </p>
      )}
    </div>
  );
}

/* ─── Inline Alert ───────────────────────────────────────── */
function Alert({ type, message, onClose }) {
  const isSuccess = type === 'success';
  return (
    <div style={{
      padding: '10px 13px', borderRadius: 9, marginBottom: 16,
      background: isSuccess ? 'var(--status-success-bg)' : 'var(--status-error-bg)',
      border: `1px solid ${isSuccess ? 'var(--status-success-border)' : 'var(--status-error-border)'}`,
      display: 'flex', alignItems: 'flex-start', gap: 8,
    }}>
      <span style={{ fontSize: 13, color: isSuccess ? 'var(--status-success-text)' : 'var(--status-error-text)', flex: 1, lineHeight: 1.5 }}>
        {isSuccess ? '✓ ' : '✕ '}{message}
      </span>
      {onClose && (
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isSuccess ? 'var(--status-success-text)' : 'var(--status-error-text)', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
      )}
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────── */
const InviteAccept = () => {
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();
  const { isDark }        = useTheme();
  const { acceptInvite }  = useAuth();           // ← same as original
  const token             = searchParams.get('token');

  const [inviteInfo,  setInviteInfo]  = useState(null);   // { email, orgName }
  const [tokenError,  setTokenError]  = useState('');
  const [checking,    setChecking]    = useState(true);

  const [form,    setForm]    = useState({ full_name: '', password: '', confirmPassword: '', phone: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [alert,   setAlert]   = useState(null);

  // ── Verify token on mount — same API call as original ─────────────────────
  useEffect(() => {
    if (!token) {
      setTokenError('No invitation token found. Please use the link from your email.');
      setChecking(false);
      return;
    }
    (async () => {
      try {
        const res = await authApi.verifyInviteToken(token);   // ← original call
        setInviteInfo(res.data);
      } catch (err) {
        setTokenError(err.response?.data?.message || 'Invalid or expired invitation link.');
      } finally {
        setChecking(false);
      }
    })();
  }, [token]);

  // ── Form handlers — identical to original ─────────────────────────────────
  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    setErrors((p) => ({ ...p, [field]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'Full name is required';
    const pwErr = validatePassword(form.password);
    if (pwErr) e.password = pwErr;
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (form.phone && !/^[0-9+\-\s()]{10,15}$/.test(form.phone)) e.phone = 'Invalid phone number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    if (!validate()) return;
    setLoading(true);
    try {
      // ← identical payload to original
      const payload = { token, full_name: form.full_name, password: form.password, confirmPassword: form.confirmPassword };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      const result = await acceptInvite(payload);   // ← same useAuth hook call
      if (result.success) {
        setAlert({ type: 'success', message: 'Account created! Taking you to your dashboard…' });
        setTimeout(() => navigate('/recruiter/dashboard'), 1200);   // ← same redirect
      } else {
        setAlert({ type: 'error', message: result.message });
      }
    } catch {
      setAlert({ type: 'error', message: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  // ── Checking ───────────────────────────────────────────────────────────────
  if (checking) return (
    <div style={{ minHeight: '100vh', background: 'var(--s0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@keyframes ia-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--s4)', borderTopColor: 'var(--brand)', animation: 'ia-spin 0.9s linear infinite', margin: '0 auto 14px' }} />
        <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Validating your invitation…</p>
      </div>
    </div>
  );

  // ── Token error ────────────────────────────────────────────────────────────
  if (tokenError) return (
    <div style={{ minHeight: '100vh', background: 'var(--s0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: 400, width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,var(--brand),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
          </div>
          <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--text-1)' }}>TalentProctor</span>
        </div>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--status-error-border)', borderRadius: 18, padding: '28px', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--status-error-bg)', border: '1px solid var(--status-error-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22 }}>✕</div>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 800, color: 'var(--text-1)', marginBottom: 10 }}>Invalid Invitation</h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 8 }}>{tokenError}</p>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Ask your organization admin to send a new invite.</p>
        </div>
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/login" style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>← Back to Login</Link>
        </div>
      </div>
    </div>
  );

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--s1)', display: 'flex', flexDirection: 'column', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@keyframes ia-spin{to{transform:rotate(360deg)}} input::placeholder{color:var(--text-3)!important;opacity:1} *{box-sizing:border-box}`}</style>

      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: isDark ? 'rgba(11,12,24,0.85)' : 'rgba(247,247,251,0.9)', backdropFilter: 'blur(18px)', borderBottom: '1px solid var(--border-1)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,var(--brand),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
          </div>
          <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--text-1)' }}>TalentProctor</span>
        </div>
        <ThemeToggle />
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 440 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,var(--brand),var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: 'var(--shadow-brand)' }}>
              <span style={{ color: 'white', fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: 20 }}>TP</span>
            </div>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 22, fontWeight: 800, color: 'var(--text-1)', marginBottom: 6, letterSpacing: '-0.025em' }}>Accept Invitation</h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
              You've been invited to join{' '}
              <strong style={{ color: 'var(--text-1)' }}>{inviteInfo?.orgName}</strong> as a Recruiter
            </p>
          </div>

          {/* Card */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 16, padding: '24px', boxShadow: 'var(--shadow-md)' }}>

            {/* Pre-filled email (read-only) */}
            <div style={{ marginBottom: 18, padding: '10px 14px', background: 'var(--brand-subtle)', border: '1px solid var(--border-brand)', borderRadius: 10 }}>
              <p style={{ fontSize: 11, color: 'var(--brand-light)', fontWeight: 700, marginBottom: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Invited email</p>
              <p style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 600 }}>{inviteInfo?.email}</p>
            </div>

            {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Your Full Name" value={form.full_name} onChange={set('full_name')} error={errors.full_name} placeholder="John Recruiter" required autoComplete="name" />
                <Field label="Phone (optional)" type="tel" value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="+91-9876543210" autoComplete="tel" />

                <div>
                  <Field label="Password" type="password" value={form.password} onChange={set('password')} error={errors.password} placeholder="••••••••" required autoComplete="new-password" />
                  {/* Password rules — matches original content */}
                  <div style={{ background: 'var(--s3)', border: '1px solid var(--border-1)', borderRadius: 9, padding: '10px 13px', marginTop: 8 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', marginBottom: 5 }}>Password must contain:</p>
                    <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: 'var(--text-3)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <li>At least 8 characters</li>
                      <li>Uppercase &amp; lowercase letters</li>
                      <li>A number and a special character</li>
                    </ul>
                  </div>
                </div>

                <Field label="Confirm Password" type="password" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} placeholder="••••••••" required autoComplete="new-password" />

                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '12px', borderRadius: 11, border: 'none',
                  background: loading ? 'var(--s4)' : 'linear-gradient(135deg,var(--brand),var(--violet))',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  color: loading ? 'var(--text-3)' : 'white',
                  fontWeight: 700, fontSize: 15, fontFamily: 'Syne,sans-serif',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: loading ? 'none' : 'var(--shadow-brand)', transition: 'all 0.2s',
                }}>
                  {loading
                    ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'white', animation: 'ia-spin 0.7s linear infinite' }} /> Creating account…</>
                    : 'Create My Recruiter Account'
                  }
                </button>
              </div>
            </form>
          </div>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Link to="/login" style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-2)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
            >
              Already have an account? <span style={{ color: 'var(--brand)', fontWeight: 600 }}>Sign in →</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteAccept;