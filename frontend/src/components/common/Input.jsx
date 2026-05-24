/**
 * Input Component — Reusable input field with label and error
 * className → inline styles. Same props: label, type, name, value, onChange, error, placeholder, required, disabled.
 */

import { useState } from 'react';

const Input = ({
  label,
  type = 'text',
  name,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  style: extraStyle = {},
  ...props
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label htmlFor={name} style={{
          display: 'block', fontSize: 11, fontWeight: 700,
          color: error ? 'var(--status-error-text)' : 'var(--text-3)',
          letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7,
        }}>
          {label}
          {required && <span style={{ color: 'var(--rose)', marginLeft: 4 }}>*</span>}
        </label>
      )}

      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '11px 14px', borderRadius: 10,
          background: disabled ? 'var(--s3)' : 'var(--input-bg)',
          border: `1.5px solid ${error ? 'var(--rose)' : focused ? 'var(--brand)' : 'var(--input-border)'}`,
          color: 'var(--text-1)', fontSize: 14, outline: 'none',
          fontFamily: 'DM Sans, sans-serif',
          boxShadow: error
            ? '0 0 0 3px rgba(244,63,94,0.12)'
            : focused ? '0 0 0 3px var(--brand-subtle)' : 'none',
          transition: 'all 0.18s',
          cursor: disabled ? 'not-allowed' : 'text',
          opacity: disabled ? 0.6 : 1,
          ...extraStyle,
        }}
        {...props}
      />

      {error && (
        <p style={{
          marginTop: 5, fontSize: 12,
          color: 'var(--status-error-text)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;