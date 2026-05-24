/**
 * ProctoringWarning Component
 * Toast-style violation alert. Auto-closes after 5 seconds.
 * className → inline styles. Logic unchanged.
 */

import { useEffect } from 'react';

const ProctoringWarning = ({ warning, onClose }) => {
  // Auto-close after 5 seconds — identical to original
  useEffect(() => {
    if (warning) {
      const timer = setTimeout(() => { onClose(); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [warning, onClose]);

  if (!warning) return null;

  const severityMap = {
    critical: { bg: 'rgba(239,68,68,0.10)', border: '#EF4444', text: '#FCA5A5', leftBar: '#EF4444', icon: '🚨' },
    high:     { bg: 'rgba(249,115,22,0.10)', border: '#F97316', text: '#FED7AA', leftBar: '#F97316', icon: '⚠️' },
    medium:   { bg: 'rgba(234,179,8,0.10)',  border: '#EAB308', text: '#FEF08A', leftBar: '#EAB308', icon: '⚡' },
    default:  { bg: 'rgba(99,102,241,0.10)', border: '#6366F1', text: '#C7D2FE', leftBar: '#6366F1', icon: 'ℹ️' },
  };

  const s = severityMap[warning.severity] || severityMap.default;

  return (
    <div style={{
      position: 'fixed', top: 16, left: 16, right: 16,
      maxWidth: 420, margin: '0 auto', zIndex: 50,
      animation: 'pw-slide 0.3s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <style>{`@keyframes pw-slide{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}`}</style>

      <div style={{
        borderLeft: `4px solid ${s.leftBar}`,
        borderRadius: 12,
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderLeftWidth: 4,
        padding: '12px 16px',
        boxShadow: 'var(--shadow-lg)',
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 20, flexShrink: 0, lineHeight: 1.3 }}>{s.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ fontWeight: 700, fontSize: 14, color: s.text, marginBottom: 3, fontFamily: 'Syne, sans-serif' }}>
              {warning.title}
            </h4>
            <p style={{ fontSize: 13, color: s.text, opacity: 0.9, lineHeight: 1.5 }}>{warning.message}</p>
            {warning.count && (
              <p style={{ fontSize: 12, marginTop: 5, fontWeight: 600, color: s.text }}>{warning.count}</p>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: s.text, opacity: 0.7, fontSize: 18, lineHeight: 1, padding: 2,
            flexShrink: 0, transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProctoringWarning;