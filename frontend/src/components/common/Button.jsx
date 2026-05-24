/**
 * Button Component — Reusable button with variants and loading state
 * className → inline styles. Same props: variant, size, loading, fullWidth, disabled.
 */

const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  loading = false,
  fullWidth = false,
  style: extraStyle = {},
  ...props
}) => {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    border: 'none', borderRadius: 10, cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
    fontFamily: 'DM Sans, sans-serif', fontWeight: 600, letterSpacing: '0.01em',
    transition: 'all 0.2s', opacity: (disabled || loading) ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
    ...extraStyle,
  };

  const sizes = {
    sm: { padding: '5px 13px', fontSize: 12, borderRadius: 8 },
    md: { padding: '9px 18px', fontSize: 13.5 },
    lg: { padding: '12px 24px', fontSize: 15 },
  };

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, var(--brand), var(--violet))',
      color: 'white',
      boxShadow: 'var(--shadow-brand)',
    },
    secondary: {
      background: 'var(--s3)',
      border: '1px solid var(--border-2)',
      color: 'var(--text-1)',
    },
    outline: {
      background: 'transparent',
      border: '1px solid var(--border-brand)',
      color: 'var(--brand)',
    },
    success: {
      background: 'var(--accent)',
      color: 'white',
      boxShadow: 'var(--shadow-accent)',
    },
    danger: {
      background: 'var(--rose)',
      color: 'white',
    },
    link: {
      background: 'none',
      color: 'var(--brand)',
      padding: '4px 0',
    },
    ghost: {
      background: 'transparent',
      border: '1px solid var(--border-2)',
      color: 'var(--text-2)',
    },
  };

  const combinedStyle = { ...base, ...sizes[size] || sizes.md, ...variants[variant] || variants.primary };

  const handleMouseEnter = (e) => {
    if (disabled || loading) return;
    e.currentTarget.style.transform = 'translateY(-1px)';
    e.currentTarget.style.filter = 'brightness(1.07)';
  };
  const handleMouseLeave = (e) => {
    e.currentTarget.style.transform = '';
    e.currentTarget.style.filter = '';
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={combinedStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {loading ? (
        <>
          <div style={{
            width: 13, height: 13, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.25)',
            borderTopColor: 'white',
            animation: 'btn-spin 0.7s linear infinite',
            flexShrink: 0,
          }} />
          Loading…
          <style>{`@keyframes btn-spin{to{transform:rotate(360deg)}}`}</style>
        </>
      ) : children}
    </button>
  );
};

export default Button;