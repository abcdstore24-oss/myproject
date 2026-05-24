/**
 * CodeEditor Component
 * Simple code editor with header (language name + line count) and Tab key indentation.
 * className → inline styles. All logic unchanged.
 */

import { useEffect, useRef } from 'react';

const CodeEditor = ({ value, language, onChange, initialCode }) => {
  const textareaRef = useRef(null);

  // ── Set initial code when language changes — identical to original ──────────
  useEffect(() => {
    if (initialCode && !value) {
      onChange(initialCode);
    }
  }, [language, initialCode]);

  // ── Handlers — identical to original ───────────────────────────────────────
  const handleChange = (e) => { onChange(e.target.value); };

  const handleTab = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start    = e.target.selectionStart;
      const end      = e.target.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
      }, 0);
    }
  };

  const langLabel = language ? language.charAt(0).toUpperCase() + language.slice(1) : 'Code Editor';
  const lines     = value?.split('\n').length || 0;

  return (
    <div style={{ border: '1px solid var(--border-2)', borderRadius: 12, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        background: 'var(--s1)',
        borderBottom: '1px solid var(--border-1)',
        padding: '8px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map(c => (
            <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
          ))}
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginLeft: 6, fontFamily: 'JetBrains Mono, monospace' }}>
            {langLabel}
          </span>
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
          {lines} {lines === 1 ? 'line' : 'lines'}
        </span>
      </div>

      {/* Editor area */}
      <div style={{ position: 'relative' }}>
        <textarea
          ref={textareaRef}
          value={value || ''}
          onChange={handleChange}
          onKeyDown={handleTab}
          spellCheck={false}
          placeholder={`// Write your ${language || 'code'} here...\n// Use Tab for indentation`}
          style={{
            width: '100%', height: 384, padding: '14px 16px',
            background: '#0D0E1C',
            color: '#E2E8F0',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 13.5,
            lineHeight: 1.65, resize: 'none',
            border: 'none', outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Footer */}
      <div style={{
        background: 'var(--s1)',
        borderTop: '1px solid var(--border-1)',
        padding: '6px 14px',
      }}>
        <p style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
          Tab → indent · Ctrl+A → select all
        </p>
      </div>
    </div>
  );
};

export default CodeEditor;