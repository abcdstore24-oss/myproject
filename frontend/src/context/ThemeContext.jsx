/**
 * ThemeContext.jsx — TalentProctor
 * Global dark / light theme toggle with localStorage persistence.
 *
 * Animation: during toggleTheme(), the class `tp-theme-transition`
 * is temporarily added to <html>. index.css uses that class to enable
 * smooth transitions on ALL elements for 400ms, then removes it —
 * so hover/active animations are never affected outside of the switch.
 *
 * Usage:
 *   const { theme, toggleTheme, isDark } = useTheme();
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('tp-theme') || 'dark'; }
    catch { return 'dark'; }
  });

  /* Sync data-theme attribute on every change */
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    try { localStorage.setItem('tp-theme', theme); } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;

    /* 1. Enable smooth cross-element transitions for 400ms */
    root.classList.add('tp-theme-transition');

    /* 2. Flip the theme */
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));

    /* 3. Remove the class once the transition has finished */
    window.setTimeout(() => root.classList.remove('tp-theme-transition'), 400);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}