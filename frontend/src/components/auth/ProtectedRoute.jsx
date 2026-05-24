/**
 * ProtectedRoute Component
 * Guards routes by auth status and role.
 * className → inline styles. All auth/role logic unchanged.
 */

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();

  /* ── Loading — identical to original ──────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--s0)', fontFamily: 'DM Sans, system-ui, sans-serif',
      }}>
        <style>{`@keyframes pr-spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid var(--s4)',
            borderTopColor: 'var(--brand)',
            animation: 'pr-spin 0.9s linear infinite',
            margin: '0 auto 14px',
          }} />
          <p style={{ fontSize: 14, color: 'var(--text-2)' }}>Loading…</p>
        </div>
      </div>
    );
  }

  /* ── Not authenticated — identical redirect to original ────────────────────── */
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  /* ── Role check — identical to original ───────────────────────────────────── */
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--s0)', padding: 24,
        fontFamily: 'DM Sans, system-ui, sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          {/* Icon */}
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--status-error-bg)',
            border: '2px solid var(--status-error-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="28" height="28" viewBox="0 0 20 20" fill="var(--status-error-text)">
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
            </svg>
          </div>

          <h2 style={{
            fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 800,
            color: 'var(--text-1)', marginBottom: 10, letterSpacing: '-0.02em',
          }}>
            Access Denied
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 16 }}>
            You don't have permission to access this page.
          </p>
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: 'var(--s2)', border: '1px solid var(--border-1)',
            fontSize: 13, color: 'var(--text-3)', lineHeight: 1.7,
          }}>
            <div>Required: <strong style={{ color: 'var(--text-1)' }}>{allowedRoles.join(' or ')}</strong></div>
            <div>Your role: <strong style={{ color: 'var(--text-1)' }}>{user.role}</strong></div>
          </div>

          <button
            onClick={() => window.history.back()}
            style={{
              marginTop: 20, padding: '10px 24px', borderRadius: 10,
              background: 'var(--s3)', border: '1px solid var(--border-2)',
              color: 'var(--text-1)', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--s4)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--s3)'}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  /* ── Authorized — identical to original ───────────────────────────────────── */
  return children;
};

export default ProtectedRoute;