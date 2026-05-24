/**
 * CandidateLayout.jsx
 * Shared sidebar + topbar shell for all candidate pages.
 * Fixed: all rgba(255,255,255,X) borders → CSS variables
 * Added: ThemeToggle in topbar, mobile drawer with backdrop
 */

import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

/* ─── Theme Toggle ───────────────────────────────────────── */
function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} title={isDark ? 'Switch to light' : 'Switch to dark'} className="theme-toggle"
      style={{
        width: 34, height: 34, borderRadius: 9,
        border: '1px solid var(--border-2)', background: 'var(--s3)',
        color: 'var(--text-2)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', cursor: 'pointer', transition: 'all 0.18s', flexShrink: 0,
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

const NAV = [
  {
    to: '/candidate/dashboard',
    label: 'My Tests',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    to: '/candidate/results',
    label: 'My Results',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    ),
  },
];

/* ─── Sidebar Content ────────────────────────────────────── */
function SidebarContent({ collapsed, onClose }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuth();
  const isActive = to => location.pathname === to || location.pathname.startsWith(to + '/');

  const handleLogout = async () => { await logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Logo */}
      <div style={{
        height: 60, display: 'flex', alignItems: 'center',
        padding: collapsed ? '0 18px' : '0 20px',
        borderBottom: '1px solid var(--border-1)',
        gap: 10, flexShrink: 0,
        justifyContent: collapsed ? 'center' : 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 16px rgba(16,185,129,0.35)',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          {!collapsed && (
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 15, color: 'var(--text-1)', whiteSpace: 'nowrap' }}>
              TalentProctor
            </span>
          )}
        </div>
        {/* Close button on mobile drawer */}
        {onClose && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            color: 'var(--text-3)', borderRadius: 6, display: 'flex', transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
        {/* Desktop collapse toggle */}
        {!collapsed && !onClose && (
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4,
            color: 'var(--text-3)', borderRadius: 6, display: 'flex', transition: 'color 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {!collapsed && (
          <div style={{
            padding: '7px 12px', borderRadius: 8, marginBottom: 10,
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#34D399', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Candidate Portal
            </span>
          </div>
        )}
        {NAV.map(item => {
          const active = isActive(item.to);
          return (
            <Link key={item.to} to={item.to} onClick={onClose} title={collapsed ? item.label : undefined} style={{
              display: 'flex', alignItems: 'center',
              gap: collapsed ? 0 : 10,
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '10px 0' : '9px 12px',
              borderRadius: 10, textDecoration: 'none',
              background: active ? 'rgba(16,185,129,0.1)' : 'transparent',
              border: `1px solid ${active ? 'rgba(16,185,129,0.2)' : 'transparent'}`,
              color: active ? '#34D399' : 'var(--text-2)',
              fontSize: 13.5, fontWeight: active ? 600 : 400,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.color = 'var(--text-1)'; }}}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; }}}
            >
              <span style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User + logout */}
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
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: 'white', fontFamily: 'Syne, sans-serif',
              }}>
                {user?.full_name?.[0]?.toUpperCase() || 'C'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.full_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10B981' }} />
                  Candidate
                </div>
              </div>
            </div>
          </div>
        )}
        <button onClick={handleLogout} title={collapsed ? 'Sign out' : undefined} style={{
          width: '100%', display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 8, justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '10px 0' : '9px 12px',
          borderRadius: 10, cursor: 'pointer',
          background: 'none', border: 'none',
          color: 'var(--text-3)', fontSize: 13.5, fontWeight: 500, transition: 'all 0.2s',
          fontFamily: 'DM Sans, sans-serif',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#FCA5A5'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-3)'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
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

/* ─── Topbar ─────────────────────────────────────────────── */
function Topbar({ title, subtitle, actions, onMobileMenuOpen }) {
  return (
    <header style={{
      height: 60, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 24px',
      background: 'var(--topbar-bg)',
      borderBottom: '1px solid var(--border-1)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      position: 'sticky', top: 0, zIndex: 20, flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        {/* Mobile hamburger */}
        <button onClick={onMobileMenuOpen} className="cl-hamburger" style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 6,
          color: 'var(--text-2)', borderRadius: 8, display: 'none', alignItems: 'center', transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-0.01em', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </h1>
          {subtitle && <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1, whiteSpace: 'nowrap' }}>{subtitle}</p>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {actions}
        <ThemeToggle />
      </div>
      <style>{`@media(max-width:768px){.cl-hamburger{display:flex !important;}}`}</style>
    </header>
  );
}

/* ─── Layout Shell ───────────────────────────────────────── */
export default function CandidateLayout({ title, subtitle, actions, children }) {
  const [collapsed,  setCollapsed]  = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setCollapsed(mq.matches);
    const handler = e => { setCollapsed(e.matches); if (e.matches) setMobileOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const W = collapsed ? 64 : 220;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--s0)' }}>

      {/* Desktop sidebar */}
      <aside className="cl-desktop-sidebar" style={{
        width: W, flexShrink: 0, height: '100vh',
        position: 'sticky', top: 0,
        background: 'var(--s1)', borderRight: '1px solid var(--border-1)',
        overflow: 'hidden', transition: 'width 0.28s cubic-bezier(0.16,1,0.3,1)', zIndex: 30,
      }}>
        <SidebarContent collapsed={collapsed} />
      </aside>

      {/* Mobile drawer */}
      <>
        {mobileOpen && (
          <div onClick={() => setMobileOpen(false)} style={{
            position: 'fixed', inset: 0, zIndex: 990,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            animation: 'cl-fade 0.2s both',
          }} />
        )}
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

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Topbar title={title} subtitle={subtitle} actions={actions} onMobileMenuOpen={() => setMobileOpen(true)} />
        <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>

      <style>{`
        @keyframes cl-fade { from{opacity:0} to{opacity:1} }
        @media(min-width:769px){.cl-desktop-sidebar{display:flex !important;}}
        @media(max-width:768px){.cl-desktop-sidebar{display:none !important;}}
      `}</style>
    </div>
  );
}