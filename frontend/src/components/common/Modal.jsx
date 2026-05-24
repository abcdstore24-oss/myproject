/**
 * Modal Component
 * Reusable modal dialog.
 * className → inline styles. Escape key + scroll lock logic unchanged.
 */

import { useEffect } from 'react';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}) => {
  /* ── Escape to close — identical to original ──────────────────────────────── */
  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape' && isOpen) onClose(); };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  /* ── Body scroll lock — identical to original ─────────────────────────────── */
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidths = { sm: 448, md: 512, lg: 672, xl: 896 };
  const maxW = maxWidths[size] || 512;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, overflowY: 'auto' }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          animation: 'modal-fade 0.2s both',
        }}
      />

      {/* Centering wrapper */}
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%', maxWidth: maxW,
            background: 'var(--card-bg)',
            border: '1px solid var(--border-2)',
            borderRadius: 18,
            boxShadow: 'var(--shadow-xl)',
            animation: 'modal-pop 0.25s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-1)',
          }}>
            <h3 style={{
              fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700,
              color: 'var(--text-1)', letterSpacing: '-0.01em',
            }}>
              {title}
            </h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                style={{
                  background: 'var(--s3)', border: '1px solid var(--border-2)',
                  borderRadius: 8, padding: 6, cursor: 'pointer',
                  color: 'var(--text-2)', display: 'flex', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--s4)'; e.currentTarget.style.color = 'var(--text-1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--text-2)'; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Body */}
          <div style={{ padding: '20px 24px' }}>
            {children}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes modal-fade { from{opacity:0} to{opacity:1} }
        @keyframes modal-pop  { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  );
};

export default Modal;