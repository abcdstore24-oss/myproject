/**
 * Alert Component — Reusable alert/notification
 * className → inline styles. Same props: type, message, onClose.
 */

const Alert = ({ type = 'info', message, onClose }) => {
  if (!message) return null;

  const cfg = {
    info:    { bg: 'var(--status-info-bg)',    border: 'var(--status-info-border)',    text: 'var(--status-info-text)',    icon: 'ℹ️' },
    success: { bg: 'var(--status-success-bg)', border: 'var(--status-success-border)', text: 'var(--status-success-text)', icon: '✓'  },
    warning: { bg: 'var(--status-warning-bg)', border: 'var(--status-warning-border)', text: 'var(--status-warning-text)', icon: '⚠️' },
    danger:  { bg: 'var(--status-error-bg)',   border: 'var(--status-error-border)',   text: 'var(--status-error-text)',   icon: '✕'  },
    error:   { bg: 'var(--status-error-bg)',   border: 'var(--status-error-border)',   text: 'var(--status-error-text)',   icon: '✕'  },
  }[type] || {};

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '11px 14px', borderRadius: 10,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      marginBottom: 12,
    }}>
      <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.4 }}>{cfg.icon}</span>
      <span style={{ flex: 1, fontSize: 13.5, color: cfg.text, lineHeight: 1.55 }}>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: cfg.text, opacity: 0.7, fontSize: 17, lineHeight: 1,
          flexShrink: 0, padding: 0, transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
        onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
        >×</button>
      )}
    </div>
  );
};

export default Alert;