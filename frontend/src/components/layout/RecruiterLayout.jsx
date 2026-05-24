/**
 * RecruiterLayout.jsx — TalentProctor
 * Shared sidebar + topbar shell for all recruiter pages.
 *
 * Improvements:
 *  • Theme toggle in topbar (dark / light)
 *  • Mobile: full-screen drawer with backdrop instead of icon-only collapse
 *  • Hamburger button in topbar on mobile
 *  • Topbar uses CSS variable backgrounds (works in both themes)
 *  • Sidebar section labels
 *  • Collapsible on desktop with smooth transition
 *  • Organisation name shown under user card
 */

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

/* ═══════════════════════════════════════════════════════════
   NAV ITEMS
   ═══════════════════════════════════════════════════════════ */
const NAV = [
  {
    to: '/recruiter/dashboard', label: 'Dashboard',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    to: '/recruiter/tests', label: 'Tests',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z"/>
        <polyline points="9 2 9 9 16 9"/>
        <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/>
      </svg>
    ),
  },
  {
    to: '/recruiter/candidates', label: 'Candidates',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    to: '/recruiter/reports', label: 'Reports',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
        <path d="M2 20h20"/>
      </svg>
    ),
  },
];

/* ═══════════════════════════════════════════════════════════
   THEME TOGGLE
   ═══════════════════════════════════════════════════════════ */
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'} className="theme-toggle"
      style={{
        width: 34, height: 34, borderRadius: 9,
        border: '1px solid var(--border-2)',
        background: 'var(--s3)', color: 'var(--text-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0,
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

/* ═══════════════════════════════════════════════════════════
   SIDEBAR CONTENT (shared between desktop + mobile drawer)
   ═══════════════════════════════════════════════════════════ */
function SidebarContent({ collapsed, onClose }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();

  const isActive = to => location.pathname === to || location.pathname.startsWith(to + '/');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Logo row */}
      <div style={{
        height: 60, display: 'flex', alignItems: 'center',
        padding: collapsed ? '0 16px' : '0 18px',
        borderBottom: '1px solid var(--border-1)',
        gap: 10, flexShrink: 0,
        justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', minWidth: 0 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--brand), var(--violet))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px var(--brand-glow)',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          {!collapsed && (
            <span style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 15,
              color: 'var(--text-1)', whiteSpace: 'nowrap', letterSpacing: '-0.02em',
            }}>
              TalentProctor
            </span>
          )}
        </div>

        {/* Close button — mobile drawer */}
        {onClose && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-3)', padding: 4, borderRadius: 6,
            display: 'flex', alignItems: 'center', flexShrink: 0,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '14px 10px', display: 'flex', flexDirection: 'column', gap: 1, overflowY: 'auto' }}>

        {!collapsed && (
          <p style={{
            fontSize: 10, fontWeight: 700, color: 'var(--text-3)',
            letterSpacing: '0.09em', textTransform: 'uppercase',
            padding: '0 10px', marginBottom: 8,
          }}>
            Navigation
          </p>
        )}

        {NAV.map(item => {
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              style={{
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 10,
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '11px 0' : '9px 12px',
                borderRadius: 10, textDecoration: 'none',
                background: active ? 'var(--brand-subtle)' : 'transparent',
                border: `1px solid ${active ? 'var(--border-brand)' : 'transparent'}`,
                color: active ? 'var(--brand-light)' : 'var(--text-2)',
                fontSize: 13.5, fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--text-1)'; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; }}}
            >
              <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>{item.icon}</span>
              {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: user card + logout */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border-1)', flexShrink: 0 }}>
        {!collapsed && (
          <div style={{
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--s2)', border: '1px solid var(--border-1)',
            marginBottom: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--brand), var(--violet))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: 'white', fontFamily: 'Syne, sans-serif',
              }}>
                {user?.full_name?.[0]?.toUpperCase() || 'R'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: 'var(--text-1)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {user?.full_name}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--brand)' }} />
                  Recruiter
                </div>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign out' : undefined}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 8,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '11px 0' : '9px 12px',
            borderRadius: 10, cursor: 'pointer',
            background: 'none', border: 'none',
            color: 'var(--text-3)', fontSize: 13.5, fontWeight: 500,
            transition: 'all 0.2s', fontFamily: 'DM Sans, sans-serif',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(244,63,94,0.08)'; e.currentTarget.style.color = 'var(--rose)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TOPBAR
   ═══════════════════════════════════════════════════════════ */
function Topbar({ title, subtitle, actions, onMobileMenuOpen, onDesktopToggle }) {
  return (
    <header style={{
      height: 60, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      background: 'var(--topbar-bg)',
      borderBottom: '1px solid var(--border-1)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      position: 'sticky', top: 0, zIndex: 20,
      flexShrink: 0,
    }}>
      {/* Left: hamburger (mobile) + collapse (desktop) + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>

        {/* Mobile hamburger */}
        <button
          onClick={onMobileMenuOpen}
          className="rl-hamburger"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 6,
            color: 'var(--text-2)', borderRadius: 8, display: 'none',
            alignItems: 'center', transition: 'color 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Desktop collapse */}
        <button
          onClick={onDesktopToggle}
          className="rl-collapse"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 6,
            color: 'var(--text-3)', borderRadius: 8, display: 'flex',
            alignItems: 'center', transition: 'color 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
          title="Toggle sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        {/* Title */}
        <div style={{ minWidth: 0 }}>
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700,
            color: 'var(--text-1)', letterSpacing: '-0.02em', lineHeight: 1.2,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 1, whiteSpace: 'nowrap' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: actions + theme toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {actions}
        <ThemeToggle />
      </div>

      <style>{`
        @media (max-width: 768px) {
          .rl-hamburger { display: flex !important; }
          .rl-collapse  { display: none  !important; }
        }
      `}</style>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════
   LAYOUT SHELL
   ═══════════════════════════════════════════════════════════ */
export default function RecruiterLayout({ title, subtitle, actions, children }) {
  const [collapsed,    setCollapsed]    = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);

  /* Auto-collapse sidebar on small screens */
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setCollapsed(mq.matches);
    const handler = e => { setCollapsed(e.matches); if (e.matches) setMobileOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  /* Lock body scroll when mobile drawer is open */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const SIDEBAR_W = collapsed ? 64 : 220;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--s0)' }}>

      {/* ════ DESKTOP SIDEBAR ════ */}
      <aside
        className="rl-desktop-sidebar"
        style={{
          width: SIDEBAR_W, flexShrink: 0, height: '100vh',
          position: 'sticky', top: 0,
          background: 'var(--s1)',
          borderRight: '1px solid var(--border-1)',
          overflow: 'hidden',
          transition: 'width 0.28s cubic-bezier(0.16,1,0.3,1)',
          zIndex: 30,
        }}
      >
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* ════ MOBILE DRAWER ════ */}
      <>
        {/* Backdrop */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 990,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
              animation: 'rl-fade 0.2s both',
            }}
          />
        )}

        {/* Drawer panel */}
        <aside style={{
          position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 991,
          width: 240, background: 'var(--s1)',
          borderRight: '1px solid var(--border-1)',
          boxShadow: 'var(--shadow-xl)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <SidebarContent collapsed={false} onClose={() => setMobileOpen(false)} />
        </aside>
      </>

      {/* ════ MAIN CONTENT ════ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Topbar
          title={title}
          subtitle={subtitle}
          actions={actions}
          onMobileMenuOpen={() => setMobileOpen(true)}
          onDesktopToggle={() => setCollapsed(p => !p)}
        />
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>

      <style>{`
        @keyframes rl-fade { from{opacity:0} to{opacity:1} }
        @media (min-width: 769px) { .rl-desktop-sidebar { display:flex !important; } }
        @media (max-width: 768px) { .rl-desktop-sidebar { display:none  !important; } }
      `}</style>
    </div>
  );
}