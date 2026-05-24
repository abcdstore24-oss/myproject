/**
 * Home.jsx — TalentProctor Landing Page
 * Route: /
 * Professional SaaS landing page for an AI-powered exam proctoring platform.
 * Works with both dark and light themes (via ThemeContext).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

/* ═══════════════════════════════════════════════════════════
   THEME TOGGLE BUTTON (reusable, used in nav)
   ═══════════════════════════════════════════════════════════ */
function ThemeToggle({ size = 36 }) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      style={{ width: size, height: size }}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      {isDark ? (
        /* Sun icon */
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        /* Moon icon */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════════════════════ */
function Counter({ end, suffix = '', duration = 2000 }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && !started) setStarted(true); },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = duration / 60;
    const inc = end / 60;
    const timer = setInterval(() => {
      start += inc;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, step);
    return () => clearInterval(timer);
  }, [started, end, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

/* ═══════════════════════════════════════════════════════════
   NAV BAR
   ═══════════════════════════════════════════════════════════ */
function NavBar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How it Works', href: '#how-it-works' },
    { label: 'For Recruiters', href: '#recruiters' },
    { label: 'For Candidates', href: '#candidates' },
  ];

  return (
    <>
    <style>{`.home-nav-links{display:flex}@media(max-width:767px){.home-nav-links{display:none!important}}`}</style>
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      borderBottom: scrolled ? '1px solid var(--border-1)' : '1px solid transparent',
      background: scrolled ? 'var(--topbar-bg)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
      transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 66 }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: 'linear-gradient(135deg, var(--brand), var(--violet))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 22px var(--brand-glow)',
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 19, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
              TalentProctor
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="home-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {navLinks.map(link => (
              <a key={link.href} href={link.href} style={{
                padding: '7px 14px', borderRadius: 9,
                fontSize: 14, fontWeight: 500,
                color: 'var(--text-2)',
                textDecoration: 'none',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.background = 'var(--s3)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.background = 'transparent'; }}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right: Theme toggle + CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThemeToggle />
            <Link to="/login" style={{
              padding: '8px 16px', borderRadius: 10,
              fontSize: 14, fontWeight: 600,
              color: 'var(--text-2)',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-2)'}
            >
              Sign In
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════════════════════════ */
function Hero() {
  const { isDark } = useTheme();
  const [typed, setTyped] = useState('');
  const words = ['Fair Assessments.', 'Secure Exams.', 'Real Talent.'];
  const [wordIdx, setWordIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef();

  useEffect(() => {
    const current = words[wordIdx];
    const speed = deleting ? 40 : 80;
    timerRef.current = setTimeout(() => {
      if (!deleting) {
        setTyped(current.slice(0, typed.length + 1));
        if (typed.length + 1 === current.length) {
          setTimeout(() => setDeleting(true), 1800);
        }
      } else {
        setTyped(current.slice(0, typed.length - 1));
        if (typed.length - 1 === 0) {
          setDeleting(false);
          setWordIdx(i => (i + 1) % words.length);
        }
      }
    }, speed);
    return () => clearTimeout(timerRef.current);
  }, [typed, deleting, wordIdx]);

  return (
    <section style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', alignItems: 'center',
      overflow: 'hidden',
      paddingTop: 80,
    }}>
      {/* Background effects */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: isDark
            ? 'linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)'
            : 'linear-gradient(rgba(79,82,232,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(79,82,232,0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          mask: 'radial-gradient(ellipse 80% 80% at 50% 50%, black, transparent)',
        }} />
        {/* Glow blobs */}
        <div className="glow-orb" style={{
          width: 600, height: 600,
          background: 'var(--brand)',
          top: '-10%', left: '-10%',
          opacity: isDark ? 0.12 : 0.08,
          animationDelay: '0s',
        }} />
        <div className="glow-orb" style={{
          width: 500, height: 500,
          background: 'var(--violet)',
          top: '20%', right: '-12%',
          opacity: isDark ? 0.10 : 0.07,
          animationDelay: '2s',
        }} />
        <div className="glow-orb" style={{
          width: 400, height: 400,
          background: 'var(--accent)',
          bottom: '0%', left: '30%',
          opacity: isDark ? 0.08 : 0.06,
          animationDelay: '4s',
        }} />
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px', position: 'relative', zIndex: 1, width: '100%' }}>
        <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>

          {/* Announcement chip */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 16px 6px 8px',
            background: 'var(--brand-subtle)',
            border: '1px solid var(--border-brand)',
            borderRadius: 99,
            marginBottom: 36,
            animation: 'fade-in 0.6s var(--ease-out) both',
          }}>
            <span style={{
              background: 'var(--brand)',
              color: 'white',
              fontSize: 10, fontWeight: 700,
              padding: '2px 8px', borderRadius: 99,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>New</span>
            <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>
              AI-powered proctoring with 99.4% detection accuracy
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand-light)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 'clamp(40px, 6vw, 72px)',
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.035em',
            color: 'var(--text-1)',
            marginBottom: 12,
            animation: 'fade-in 0.7s 0.1s var(--ease-out) both',
          }}>
            Hire With Confidence.
          </h1>
          <h1 style={{
            fontFamily: 'Syne, sans-serif',
            fontSize: 'clamp(40px, 6vw, 72px)',
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.035em',
            marginBottom: 32,
            animation: 'fade-in 0.7s 0.2s var(--ease-out) both',
            minHeight: '1.1em',
          }}>
            <span style={{
              background: 'linear-gradient(135deg, var(--brand-light), var(--violet-light))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {typed}
            </span>
            <span style={{ 
              color: 'var(--brand)',
              animation: 'fade-in 0.1s ease infinite alternate',
              marginLeft: 2,
            }}>|</span>
          </h1>

          {/* Subheadline */}
          <p style={{
            fontSize: 'clamp(16px, 2vw, 20px)',
            color: 'var(--text-2)',
            lineHeight: 1.7,
            maxWidth: 580,
            margin: '0 auto 44px',
            animation: 'fade-in 0.7s 0.3s var(--ease-out) both',
          }}>
            TalentProctor is the complete online assessment platform — create tests,
            proctor remotely with AI, and get deep analytics to identify real talent,
            not just good test-takers.
          </p>

          {/* CTA buttons */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 12, flexWrap: 'wrap',
            animation: 'fade-in 0.7s 0.4s var(--ease-out) both',
          }}>
            <Link to="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px',
              background: 'var(--brand)',
              color: 'white',
              borderRadius: 14,
              fontSize: 15, fontWeight: 700,
              textDecoration: 'none',
              boxShadow: 'var(--shadow-brand)',
              transition: 'all 0.2s var(--ease-out)',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-light)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--brand)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Start for Free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <Link to="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px',
              background: 'transparent',
              color: 'var(--text-1)',
              borderRadius: 14,
              fontSize: 15, fontWeight: 600,
              textDecoration: 'none',
              border: '1px solid var(--border-3)',
              transition: 'all 0.2s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--s3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Sign In
            </Link>
          </div>

          {/* Social proof strip */}
          <div style={{
            marginTop: 52,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8,
            animation: 'fade-in 0.7s 0.5s var(--ease-out) both',
          }}>
            <div style={{ display: 'flex' }}>
              {['#6366F1','#8B5CF6','#10B981','#F59E0B','#F43F5E'].map((c, i) => (
                <div key={i} style={{
                  width: 30, height: 30,
                  borderRadius: '50%',
                  background: c,
                  border: '2px solid var(--s0)',
                  marginLeft: i > 0 ? -8 : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'white',
                }}>
                  {['A','R','C','E','M'][i]}
                </div>
              ))}
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-2)', marginLeft: 4 }}>
              Trusted by <strong style={{ color: 'var(--text-1)' }}>10,000+</strong> hiring teams worldwide
            </span>
          </div>
        </div>

        {/* Dashboard preview card */}
        <div style={{
          marginTop: 72,
          position: 'relative',
          maxWidth: 960,
          margin: '72px auto 0',
          animation: 'fade-in 0.9s 0.6s var(--ease-out) both',
        }}>
          {/* Glow behind card */}
          <div style={{
            position: 'absolute', inset: -2,
            background: 'linear-gradient(135deg, var(--brand), var(--violet), var(--accent))',
            borderRadius: 22,
            filter: 'blur(20px)',
            opacity: isDark ? 0.18 : 0.12,
            zIndex: 0,
          }} />
          <div style={{
            position: 'relative', zIndex: 1,
            background: isDark ? 'var(--s2)' : '#FFFFFF',
            border: '1px solid var(--border-2)',
            borderRadius: 20,
            overflow: 'hidden',
            boxShadow: 'var(--shadow-xl)',
          }}>
            {/* Fake browser bar */}
            <div style={{
              padding: '12px 16px',
              background: isDark ? 'var(--s1)' : '#F5F5FB',
              borderBottom: '1px solid var(--border-1)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['#F43F5E','#F59E0B','#10B981'].map(c => (
                  <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c, opacity: 0.8 }} />
                ))}
              </div>
              <div style={{
                flex: 1, maxWidth: 320, margin: '0 auto',
                background: isDark ? 'var(--s3)' : '#EAEAF5',
                border: '1px solid var(--border-1)',
                borderRadius: 6, padding: '4px 12px',
                fontSize: 12, color: 'var(--text-3)', textAlign: 'center',
              }}>
                app.talentproctor.com/recruiter/dashboard
              </div>
            </div>

            {/* Dashboard mock */}
            <div style={{ display: 'flex', height: 380 }}>
              {/* Sidebar mock */}
              <div style={{
                width: 56, flexShrink: 0,
                background: isDark ? 'var(--s1)' : '#F8F8FD',
                borderRight: '1px solid var(--border-1)',
                padding: '16px 10px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: 'linear-gradient(135deg, var(--brand), var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M9 12l2 2 4-4"/>
                  </svg>
                </div>
                {[
                  <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>,
                  <><path d="M9 2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9z"/></>,
                  <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></>,
                  <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
                ].map((paths, i) => (
                  <div key={i} style={{
                    width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i === 0 ? 'var(--brand-subtle)' : 'transparent',
                    color: i === 0 ? 'var(--brand)' : 'var(--text-3)',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
                  </div>
                ))}
              </div>

              {/* Main content mock */}
              <div style={{ flex: 1, padding: 20, overflow: 'hidden' }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ width: 140, height: 14, background: 'var(--s4)', borderRadius: 6, marginBottom: 6 }} />
                    <div style={{ width: 220, height: 10, background: 'var(--s3)', borderRadius: 6 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ width: 80, height: 30, background: 'var(--s3)', borderRadius: 8 }} />
                    <div style={{ width: 80, height: 30, background: 'var(--brand)', borderRadius: 8, opacity: 0.9 }} />
                  </div>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Total Tests', val: '24', color: 'var(--brand)' },
                    { label: 'Candidates', val: '312', color: 'var(--accent)' },
                    { label: 'Completed', val: '189', color: 'var(--violet)' },
                    { label: 'Avg. Score', val: '74%', color: 'var(--amber)' },
                  ].map((s, i) => (
                    <div key={i} style={{
                      background: isDark ? 'var(--s3)' : '#F8F8FD',
                      border: '1px solid var(--border-1)',
                      borderRadius: 10, padding: '10px 12px',
                    }}>
                      <div style={{ width: 50, height: 8, background: 'var(--s5)', borderRadius: 4, marginBottom: 8 }} />
                      <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontFamily: 'Syne' }}>{s.val}</div>
                    </div>
                  ))}
                </div>

                {/* Table mock */}
                <div style={{
                  background: isDark ? 'var(--s3)' : '#F8F8FD',
                  border: '1px solid var(--border-1)',
                  borderRadius: 10, overflow: 'hidden',
                }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-1)', display: 'flex', gap: 8 }}>
                    {[80, 120, 100, 60].map((w, i) => (
                      <div key={i} style={{ width: w, height: 8, background: 'var(--s5)', borderRadius: 4 }} />
                    ))}
                  </div>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{
                      padding: '9px 12px', display: 'flex', gap: 8, alignItems: 'center',
                      borderBottom: i < 4 ? '1px solid var(--border-1)' : 'none',
                    }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: ['var(--brand)','var(--accent)','var(--violet)','var(--amber)'][i-1], opacity: 0.7 }} />
                      <div style={{ width: 90, height: 8, background: 'var(--s5)', borderRadius: 4 }} />
                      <div style={{ width: 60, height: 8, background: 'var(--s4)', borderRadius: 4 }} />
                      <div style={{ flex: 1, height: 4, background: 'var(--s4)', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ width: `${[72,58,89,45][i-1]}%`, height: '100%', background: ['var(--brand)','var(--accent)','var(--violet)','var(--amber)'][i-1], borderRadius: 99 }} />
                      </div>
                      <div style={{
                        width: 48, height: 18, borderRadius: 99,
                        background: ['var(--accent-subtle)','var(--status-warning-bg)','var(--accent-subtle)','var(--status-error-bg)'][i-1],
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ width: 30, height: 6, background: ['var(--accent)','var(--amber)','var(--accent)','var(--rose)'][i-1], borderRadius: 99, opacity: 0.8 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   STATS TICKER
   ═══════════════════════════════════════════════════════════ */
function StatsTicker() {
  const stats = [
    { value: 10000, suffix: '+', label: 'Assessments Created' },
    { value: 99.4, suffix: '%', label: 'Proctoring Accuracy' },
    { value: 500, suffix: '+', label: 'Companies Trust Us' },
    { value: 2.4, suffix: 'M+', label: 'Candidates Assessed' },
    { value: 40, suffix: '%', label: 'Faster Hiring' },
    { value: 99.9, suffix: '%', label: 'Platform Uptime' },
  ];

  return (
    <div style={{
      borderTop: '1px solid var(--border-1)',
      borderBottom: '1px solid var(--border-1)',
      background: isDark => isDark ? 'var(--s1)' : 'var(--s0)',
      padding: '32px 24px',
      overflow: 'hidden',
    }}>
      <div style={{
        maxWidth: 1200, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '24px 40px',
        justifyItems: 'center',
      }}>
        {stats.map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: 'Syne, sans-serif',
              fontSize: 36, fontWeight: 800,
              color: 'var(--text-1)',
              letterSpacing: '-0.04em',
              lineHeight: 1,
              marginBottom: 6,
            }}>
              <Counter end={s.value} suffix={s.suffix} />
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FEATURES SECTION
   ═══════════════════════════════════════════════════════════ */
const features = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
        <circle cx="12" cy="13" r="4"/>
      </svg>
    ),
    color: 'var(--brand)',
    glow: 'var(--brand-glow)',
    title: 'AI Webcam Proctoring',
    desc: 'Real-time face detection, eye tracking, and behavior analysis flags suspicious activity the moment it happens — automatically.',
    tag: 'Computer Vision',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
    color: 'var(--accent)',
    glow: 'var(--accent-glow)',
    title: 'Tamper-Proof Integrity',
    desc: 'Tab-switch detection, copy-paste blocking, full-screen lock, and browser-fingerprint verification ensure a secure exam environment.',
    tag: 'Security',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    color: 'var(--violet)',
    glow: 'var(--violet-glow)',
    title: 'Live Monitoring Dashboard',
    desc: 'Watch every candidate in real-time on a single screen. Get instant alerts, annotate suspicious sessions, and intervene when needed.',
    tag: 'Real-time',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>
      </svg>
    ),
    color: 'var(--amber)',
    glow: 'var(--amber-glow)',
    title: 'Multi-Format Questions',
    desc: 'MCQs, multi-select, coding challenges with live execution, long-form answers, and file uploads — all in one flexible builder.',
    tag: 'Question Bank',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
        <path d="M2 20h20"/>
      </svg>
    ),
    color: 'var(--rose)',
    glow: 'var(--rose-glow)',
    title: 'Deep Analytics & Reports',
    desc: 'Score distributions, per-question analytics, time-spent heatmaps, integrity scores, and PDF-export candidate reports.',
    tag: 'Analytics',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    color: 'var(--accent)',
    glow: 'var(--accent-glow)',
    title: 'Role-Based Access',
    desc: 'Org owners manage teams, recruiters run assessments, candidates take tests — each role gets a tailored, focused experience.',
    tag: 'Multi-role',
  },
];

function Features() {
  return (
    <section id="features" style={{ padding: '100px 24px', position: 'relative' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="chip chip-brand" style={{ marginBottom: 16, display: 'inline-flex' }}>
            ✦ Platform Features
          </div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>
            Everything you need to<br />
            <span style={{ background: 'linear-gradient(135deg, var(--brand-light), var(--violet-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              run fair assessments
            </span>
          </h2>
          <p style={{ fontSize: 17, color: 'var(--text-2)', maxWidth: 520, margin: '0 auto', lineHeight: 1.7 }}>
            From question creation to candidate report — TalentProctor covers the full lifecycle of technical hiring.
          </p>
        </div>

        {/* Feature grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
        }}>
          {features.map((f, i) => (
            <div key={i} className="card" style={{
              padding: '28px 28px 24px',
              cursor: 'default',
              transition: 'all 0.25s var(--ease-out)',
              animation: `fade-in 0.6s ${0.1 * i}s var(--ease-out) both`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--border-brand)';
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 16px 48px -8px ${f.glow}`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--card-border)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
            }}
            >
              {/* Icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 13,
                background: `${f.color}18`,
                border: `1px solid ${f.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: f.color,
                marginBottom: 18,
              }}>
                {f.icon}
              </div>

              {/* Tag */}
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '2px 9px', borderRadius: 99, marginBottom: 10,
                background: `${f.color}12`,
                border: `1px solid ${f.color}25`,
                fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                textTransform: 'uppercase', color: f.color,
              }}>
                {f.tag}
              </div>

              <h4 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 17, marginBottom: 10, color: 'var(--text-1)' }}>
                {f.title}
              </h4>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65 }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════════════════ */
function HowItWorks() {
  const steps = [
    {
      step: '01',
      title: 'Create Your Test',
      desc: 'Build assessments using MCQs, coding challenges, and open-ended questions. Set time limits, shuffle questions, and configure proctoring levels.',
      icon: <path d="M12 5v14M5 12h14"/>,
      color: 'var(--brand)',
    },
    {
      step: '02',
      title: 'Invite Candidates',
      desc: 'Send invite links or email candidates directly. They get a secure, one-time access link with pre-exam system checks built in.',
      icon: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
      color: 'var(--violet)',
    },
    {
      step: '03',
      title: 'Monitor Live',
      desc: 'Watch candidates in real-time. Our AI flags anomalies automatically — face absence, multiple faces, tab switches, and more.',
      icon: <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
      color: 'var(--accent)',
    },
    {
      step: '04',
      title: 'Get Insights',
      desc: 'Review detailed per-candidate reports with integrity scores, score analytics, time heatmaps, and AI-generated summaries.',
      icon: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></>,
      color: 'var(--rose)',
    },
  ];

  return (
    <section id="how-it-works" style={{
      padding: '100px 24px',
      background: 'var(--s1)',
      borderTop: '1px solid var(--border-1)',
      borderBottom: '1px solid var(--border-1)',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div className="chip chip-accent" style={{ marginBottom: 16, display: 'inline-flex' }}>
            ✦ Simple Process
          </div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16 }}>
            From zero to assessment<br />
            <span style={{ background: 'linear-gradient(135deg, var(--accent), var(--accent-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              in under 10 minutes
            </span>
          </h2>
          <p style={{ fontSize: 17, color: 'var(--text-2)', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
            No training required. If you can send an email, you can run a proctored exam.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 24,
          position: 'relative',
        }}>
          {steps.map((s, i) => (
            <div key={i} style={{
              position: 'relative',
              padding: '32px 28px',
              background: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              borderRadius: 18,
              animation: `fade-in 0.6s ${0.1 * i}s var(--ease-out) both`,
            }}>
              {/* Step number */}
              <div style={{
                fontFamily: 'Syne', fontSize: 48, fontWeight: 800,
                color: s.color, opacity: 0.12,
                position: 'absolute', top: 16, right: 20,
                lineHeight: 1, letterSpacing: '-0.04em',
              }}>
                {s.step}
              </div>

              {/* Icon */}
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: `${s.color}14`,
                border: `1px solid ${s.color}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: s.color, marginBottom: 20,
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  {s.icon}
                </svg>
              </div>

              <h4 style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: 18, marginBottom: 10, color: 'var(--text-1)' }}>
                {s.title}
              </h4>
              <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65 }}>
                {s.desc}
              </p>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div style={{
                  position: 'absolute', top: '50%', right: -14,
                  width: 28, height: 2,
                  background: 'linear-gradient(90deg, var(--border-2), transparent)',
                  display: 'none',
                }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   FOR RECRUITERS + FOR CANDIDATES SECTIONS
   ═══════════════════════════════════════════════════════════ */
function AudienceSection({ id, side, color, glow, tag, title, tagline, bullets, ctaLabel, ctaTo, illustration }) {
  const isLeft = side === 'left';
  return (
    <section id={id} style={{ padding: '100px 24px' }}>
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 64,
        alignItems: 'center',
      }}>
        {/* Text block */}
        <div style={{ order: isLeft ? 0 : 1 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '4px 12px', borderRadius: 99, marginBottom: 20,
            background: `${color}12`, border: `1px solid ${color}28`,
            fontSize: 11, fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', color,
          }}>
            {tag}
          </div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(26px, 3.5vw, 42px)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16, lineHeight: 1.12 }}>
            {title}
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 28 }}>
            {tagline}
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {bullets.map((b, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 7, flexShrink: 0,
                  background: `${color}18`, border: `1px solid ${color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 1,
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                </div>
                <span style={{ fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.55 }}>{b}</span>
              </li>
            ))}
          </ul>
          <Link to={ctaTo} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '12px 24px', borderRadius: 12,
            background: color, color: 'white',
            fontSize: 14, fontWeight: 700,
            textDecoration: 'none',
            boxShadow: `0 8px 24px -4px ${glow}`,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.filter = 'brightness(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.filter = 'brightness(1)'; }}
          >
            {ctaLabel}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
        </div>

        {/* Illustration */}
        <div style={{ order: isLeft ? 1 : 0 }}>
          {illustration}
        </div>
      </div>
    </section>
  );
}

/* Recruiter illustration — mini dashboard */
function RecruiterIllustration({ color }) {
  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-lg)',
    }}>
      {/* Header bar */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ width: 100, height: 10, background: 'var(--s4)', borderRadius: 5, marginBottom: 6 }} />
          <div style={{ width: 60, height: 7, background: 'var(--s3)', borderRadius: 5 }} />
        </div>
        <div style={{ width: 80, height: 28, background: color, borderRadius: 8, opacity: 0.9 }} />
      </div>

      {/* Live monitor grid */}
      <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { alert: false, score: 87 },
          { alert: true, score: 23 },
          { alert: false, score: 92 },
          { alert: false, score: 78 },
          { alert: true, score: 11 },
          { alert: false, score: 65 },
        ].map((c, i) => (
          <div key={i} style={{
            background: c.alert ? 'rgba(244,63,94,0.06)' : 'var(--s2)',
            border: `1px solid ${c.alert ? 'var(--rose)' : 'var(--border-1)'}`,
            borderRadius: 10,
            padding: '10px',
            position: 'relative',
          }}>
            {/* Fake webcam area */}
            <div style={{
              height: 52, borderRadius: 6, marginBottom: 8,
              background: c.alert ? 'rgba(244,63,94,0.08)' : 'var(--s3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c.alert ? 'var(--rose)' : 'var(--text-3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              {c.alert && (
                <div style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 8, height: 8, borderRadius: '50%',
                  background: 'var(--rose)',
                  animation: 'pulse-glow 1.2s ease-in-out infinite',
                }} />
              )}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: c.alert ? 'var(--rose)' : 'var(--text-3)', textAlign: 'center' }}>
              {c.alert ? '⚠ Alert' : `Score: ${c.score}%`}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-1)', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>6 candidates live</span>
        <div style={{ flex: 1 }} />
        <div style={{ padding: '3px 10px', background: 'var(--status-error-bg)', border: '1px solid var(--status-error-border)', borderRadius: 99, fontSize: 11, color: 'var(--status-error-text)', fontWeight: 600 }}>
          2 Alerts
        </div>
      </div>
    </div>
  );
}

/* Candidate illustration — exam screen */
function CandidateIllustration({ color }) {
  return (
    <div style={{
      background: 'var(--card-bg)',
      border: '1px solid var(--card-border)',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-lg)',
    }}>
      {/* Exam header */}
      <div style={{ padding: '14px 20px', background: 'var(--s1)', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, var(--brand), var(--violet))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="M9 12l2 2 4-4"/>
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', fontFamily: 'Syne' }}>Frontend Dev Assessment</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--status-warning-bg)', border: '1px solid var(--status-warning-border)', borderRadius: 99 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="6" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--amber)' }}>23:41 left</span>
        </div>
      </div>

      {/* Question */}
      <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 100px', gap: 16, alignItems: 'start' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Question 7 of 20
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.6, marginBottom: 16, fontWeight: 500 }}>
            Which hook would you use to run a side effect after every render in React?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['useState', 'useEffect', 'useCallback', 'useRef'].map((opt, i) => (
              <div key={i} style={{
                padding: '9px 14px',
                borderRadius: 9,
                border: `1px solid ${i === 1 ? 'var(--brand)' : 'var(--border-2)'}`,
                background: i === 1 ? 'var(--brand-subtle)' : 'transparent',
                fontSize: 13,
                color: i === 1 ? 'var(--brand-light)' : 'var(--text-2)',
                display: 'flex', alignItems: 'center', gap: 10,
                cursor: 'default',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  border: `2px solid ${i === 1 ? 'var(--brand)' : 'var(--border-3)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {i === 1 && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand)' }} />}
                </div>
                {opt}
              </div>
            ))}
          </div>
        </div>

        {/* Webcam preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{
            height: 76, borderRadius: 10,
            background: 'var(--s3)',
            border: '1px solid var(--border-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            {/* Proctoring indicator */}
            <div style={{
              position: 'absolute', bottom: 4, right: 4,
              width: 8, height: 8, borderRadius: '50%',
              background: color,
              boxShadow: `0 0 6px ${color}`,
            }} />
          </div>
          <div style={{ padding: '5px 8px', background: 'var(--accent-subtle)', border: '1px solid var(--border-accent)', borderRadius: 8, textAlign: 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700 }}>✓ Verified</span>
          </div>
          {/* Progress */}
          <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', fontWeight: 500 }}>
            7 / 20 done
          </div>
          <div className="progress-track" style={{ height: 4 }}>
            <div className="progress-fill" style={{ width: '35%' }} />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: 70, height: 28, background: 'var(--s3)', borderRadius: 8 }} />
        <div style={{ display: 'flex', gap: 6 }}>
          {[1,2,3,4,5,6,7].map(n => (
            <div key={n} style={{
              width: 22, height: 22, borderRadius: 6,
              background: n === 7 ? 'var(--brand)' : n < 7 ? 'var(--accent)' : 'var(--s4)',
              opacity: n === 7 ? 1 : 0.6,
            }} />
          ))}
        </div>
        <div style={{ width: 70, height: 28, background: 'var(--brand)', borderRadius: 8, opacity: 0.9 }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TRUST SECTION
   ═══════════════════════════════════════════════════════════ */
function Trust() {
  const items = [
    {
      icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>,
      title: 'SOC 2 Ready',
      desc: 'Enterprise-grade security with full audit logs and access controls.',
      color: 'var(--brand)',
    },
    {
      icon: <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>,
      title: 'End-to-End Encrypted',
      desc: 'All exam data and webcam footage is encrypted at rest and in transit.',
      color: 'var(--accent)',
    },
    {
      icon: <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
      title: '99.9% Uptime SLA',
      desc: 'Zero downtime during your assessment windows — guaranteed.',
      color: 'var(--violet)',
    },
    {
      icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>,
      title: 'GDPR Compliant',
      desc: 'Candidate data is handled transparently with full consent management.',
      color: 'var(--amber)',
    },
  ];

  return (
    <section style={{
      padding: '100px 24px',
      background: 'var(--s1)',
      borderTop: '1px solid var(--border-1)',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div className="chip" style={{ marginBottom: 16, display: 'inline-flex' }}>
            🔒 Trust & Security
          </div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 14 }}>
            Built for enterprise.<br />Accessible to everyone.
          </h2>
          <p style={{ fontSize: 16, color: 'var(--text-2)', maxWidth: 460, margin: '0 auto' }}>
            Trusted by startups and Fortune 500 companies alike. Serious about data protection.
          </p>
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18,
        }}>
          {items.map((item, i) => (
            <div key={i} className="card" style={{ padding: '24px', textAlign: 'center' }}>
              <div style={{
                width: 48, height: 48, borderRadius: 13, margin: '0 auto 16px',
                background: `${item.color}14`, border: `1px solid ${item.color}28`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: item.color,
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  {item.icon}
                </svg>
              </div>
              <h5 style={{ fontFamily: 'Syne', fontWeight: 700, marginBottom: 8, color: 'var(--text-1)' }}>{item.title}</h5>
              <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   TESTIMONIALS
   ═══════════════════════════════════════════════════════════ */
function Testimonials() {
  const quotes = [
    {
      name: 'Priya Sharma',
      role: 'Engineering Manager, Zeta Corp',
      avatar: 'PS',
      color: 'var(--brand)',
      text: 'TalentProctor cut our assessment fraud by 90%. The live monitoring dashboard is incredibly intuitive — even our non-technical HR team picked it up in minutes.',
      stars: 5,
    },
    {
      name: 'Arjun Mehta',
      role: 'Lead Recruiter, NovaTech',
      avatar: 'AM',
      color: 'var(--accent)',
      text: 'We used to spend 3 hours reviewing each candidate manually. Now the AI integrity score does 80% of that work. The analytics reports are beautiful and detailed.',
      stars: 5,
    },
    {
      name: 'Riya Kapoor',
      role: 'HR Director, Finova',
      avatar: 'RK',
      color: 'var(--violet)',
      text: 'The candidate experience is phenomenal — they get clear instructions, smooth webcam setup, and the exam interface is clean. We\'ve had zero complaints.',
      stars: 5,
    },
  ];

  return (
    <section style={{ padding: '100px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div className="chip chip-brand" style={{ marginBottom: 16, display: 'inline-flex' }}>
            ⭐ Customer Stories
          </div>
          <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-0.03em' }}>
            Trusted by talent teams<br />who care about quality
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {quotes.map((q, i) => (
            <div key={i} className="card" style={{
              padding: '28px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
            >
              {/* Stars */}
              <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                {Array(q.stars).fill(0).map((_, si) => (
                  <svg key={si} width="14" height="14" viewBox="0 0 24 24" fill="var(--amber)" stroke="none">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                ))}
              </div>

              <p style={{ fontSize: 14.5, color: 'var(--text-2)', lineHeight: 1.75, marginBottom: 24, fontStyle: 'italic' }}>
                "{q.text}"
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: q.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: 'white',
                  flexShrink: 0,
                }}>
                  {q.avatar}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{q.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{q.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   CTA SECTION
   ═══════════════════════════════════════════════════════════ */
function CTA() {
  const { isDark } = useTheme();
  return (
    <section style={{
      padding: '100px 24px',
      background: 'var(--s1)',
      borderTop: '1px solid var(--border-1)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background blur */}
      <div className="glow-orb" style={{
        width: 500, height: 500,
        background: 'var(--brand)',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        opacity: isDark ? 0.08 : 0.05,
        animationDelay: '1s',
      }} />
      <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 64, height: 64, borderRadius: 18, margin: '0 auto 24px',
          background: 'linear-gradient(135deg, var(--brand), var(--violet))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-brand)',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        </div>
        <h2 style={{ fontFamily: 'Syne', fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 800, letterSpacing: '-0.035em', marginBottom: 18, lineHeight: 1.1 }}>
          Ready to hire with<br />
          <span style={{ background: 'linear-gradient(135deg, var(--brand-light), var(--violet-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            complete confidence?
          </span>
        </h2>
        <p style={{ fontSize: 17, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 40, maxWidth: 480, margin: '0 auto 40px' }}>
          Join thousands of hiring teams using TalentProctor to run fair, secure, and insightful assessments.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            padding: '15px 32px',
            background: 'var(--brand)', color: 'white',
            borderRadius: 14, fontSize: 16, fontWeight: 700,
            textDecoration: 'none',
            boxShadow: 'var(--shadow-brand)',
            transition: 'all 0.2s',
            letterSpacing: '-0.01em',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'var(--brand-light)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'var(--brand)'; }}
          >
            Get Started Free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
          <Link to="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 9,
            padding: '15px 32px',
            background: 'transparent', color: 'var(--text-1)',
            borderRadius: 14, fontSize: 16, fontWeight: 600,
            textDecoration: 'none',
            border: '1px solid var(--border-3)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.background = 'var(--s3)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = 'transparent'; }}
          >
            Sign In
          </Link>
        </div>
        <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-3)' }}>
          No credit card required · Free plan available · Setup in 5 minutes
        </p>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-1)',
      background: 'var(--s0)',
      padding: '60px 24px 40px',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: '40px 60px',
          marginBottom: 48,
        }}>
          {/* Brand block */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--brand), var(--violet))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <span style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 17, color: 'var(--text-1)', letterSpacing: '-0.025em' }}>TalentProctor</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.7, maxWidth: 260 }}>
              The complete AI-powered platform for secure, fair, and insightful online assessments.
            </p>
          </div>

          {/* Links */}
          {[
            {
              title: 'Product',
              links: ['Features', 'Pricing', 'Security', 'Changelog'],
            },
            {
              title: 'Roles',
              links: ['For Recruiters', 'For Candidates', 'For Admins', 'For Org Owners'],
            },
            {
              title: 'Company',
              links: ['About', 'Blog', 'Careers', 'Contact'],
            },
          ].map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 16 }}>
                {col.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map(link => (
                  <a key={link} href="#" style={{ fontSize: 14, color: 'var(--text-3)', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
                  >
                    {link}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          paddingTop: 24,
          borderTop: '1px solid var(--border-1)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 16,
        }}>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
            © {new Date().getFullYear()} TalentProctor. All rights reserved.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            {['Privacy Policy', 'Terms of Service', 'Cookie Policy'].map(l => (
              <a key={l} href="#" style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROOT EXPORT
   ═══════════════════════════════════════════════════════════ */
export default function Home() {
  const { isDark } = useTheme();

  return (
    <div style={{ background: 'var(--s0)', color: 'var(--text-1)', minHeight: '100vh' }}>
      <NavBar />
      <Hero />

      {/* Stats band */}
      <section style={{
        borderTop: '1px solid var(--border-1)',
        borderBottom: '1px solid var(--border-1)',
        background: 'var(--s1)',
        padding: '36px 24px',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '20px 40px',
          justifyItems: 'center',
        }}>
          {[
            { label: 'Assessments Created', val: 10000, suf: '+' },
            { label: 'Proctoring Accuracy', val: 99.4, suf: '%' },
            { label: 'Companies Trust Us', val: 500, suf: '+' },
            { label: 'Candidates Assessed', val: 2.4, suf: 'M+' },
            { label: 'Faster Hiring', val: 40, suf: '% ↑' },
            { label: 'Platform Uptime', val: 99.9, suf: '%' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'Syne', fontSize: 34, fontWeight: 800,
                color: 'var(--text-1)', letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 6,
              }}>
                <Counter end={s.val} suffix={s.suf} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <Features />
      <HowItWorks />

      <AudienceSection
        id="recruiters"
        side="left"
        color="var(--brand)"
        glow="var(--brand-glow)"
        tag="For Recruiters & HR Teams"
        title={<>The hiring dashboard<br />built for speed & precision</>}
        tagline="Create multi-format assessments, send invites to unlimited candidates, and get AI-powered integrity scores — all in one place."
        bullets={[
          'Build tests in minutes with MCQs, coding problems, and open-ended questions',
          'Invite candidates via email or shareable link with one click',
          'Monitor every session live — face detection, eye tracking, tab switches',
          'Download detailed per-candidate PDF reports instantly',
          'Integrate with your ATS or export results as CSV/Excel',
        ]}
        ctaLabel="Start as Recruiter"
        ctaTo="/register"
        illustration={<RecruiterIllustration color="var(--brand)" />}
      />

      <AudienceSection
        id="candidates"
        side="right"
        color="var(--accent)"
        glow="var(--accent-glow)"
        tag="For Candidates"
        title={<>A fair, stress-free<br />exam experience</>}
        tagline="Focus on what matters — your answers. We handle the rest transparently. No surprises, no technical headaches."
        bullets={[
          'Guided setup: system check, webcam test, and ID verification in minutes',
          'Clean, distraction-free exam interface for code, MCQs, and essays',
          'Real-time timer with question progress tracker always visible',
          'Instant results with per-question breakdown after submission',
          'Works on any modern browser — no plugins or downloads required',
        ]}
        ctaLabel="View Candidate Portal"
        ctaTo="/login"
        illustration={<CandidateIllustration color="var(--accent)" />}
      />

      <Trust />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  );
}