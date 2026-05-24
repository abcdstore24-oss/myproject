/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core background layers
        surface: {
          0: '#08080F',
          1: '#0E0E1A',
          2: '#141420',
          3: '#1A1A28',
          4: '#20202F',
          5: '#272738',
        },
        // Primary brand — indigo/violet
        brand: {
          50:  '#EEEEFF',
          100: '#D4D4FF',
          200: '#ADADFF',
          300: '#8585FF',
          400: '#6366F1',
          500: '#4F46E5',
          600: '#4338CA',
          700: '#3730A3',
          800: '#312E81',
          900: '#1E1B4B',
        },
        // Accent — electric teal
        accent: {
          50:  '#ECFDF9',
          100: '#D1FAF0',
          200: '#A7F3E0',
          300: '#6EE7C7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        // Violet secondary
        violet: {
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
        },
        // Neutral text
        ink: {
          50:  '#F8F8FF',
          100: '#ECECF7',
          200: '#D0D0E8',
          300: '#AAAAC0',
          400: '#7878A0',
          500: '#555578',
          600: '#3A3A58',
          700: '#252540',
          800: '#181828',
        },
        // Keep backward compat
        primary: {
          50: '#EEEEFF',
          100: '#D4D4FF',
          200: '#ADADFF',
          300: '#8585FF',
          400: '#6366F1',
          500: '#4F46E5',
          600: '#4338CA',
          700: '#3730A3',
          800: '#312E81',
          900: '#1E1B4B',
        },
        secondary: {
          50: '#ECFDF9',
          100: '#D1FAF0',
          200: '#A7F3E0',
          300: '#6EE7C7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        sans:    ['DM Sans', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1rem' }],
      },
      backgroundImage: {
        'mesh-brand': `
          radial-gradient(at 40% 20%, hsla(248,89%,57%,0.15) 0px, transparent 50%),
          radial-gradient(at 80% 0%,   hsla(264,80%,60%,0.10) 0px, transparent 50%),
          radial-gradient(at 0%  50%,  hsla(221,83%,50%,0.08) 0px, transparent 50%),
          radial-gradient(at 80% 50%,  hsla(248,89%,57%,0.06) 0px, transparent 50%),
          radial-gradient(at 0%  100%, hsla(160,75%,52%,0.08) 0px, transparent 50%)
        `,
        'mesh-subtle': `
          radial-gradient(at 50% 0%,   hsla(248,89%,57%,0.08) 0px, transparent 60%),
          radial-gradient(at 100% 50%, hsla(264,80%,60%,0.06) 0px, transparent 50%)
        `,
        'glow-brand': 'radial-gradient(circle, hsla(248,89%,57%,0.2) 0%, transparent 70%)',
        'glow-accent': 'radial-gradient(circle, hsla(160,75%,52%,0.2) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-sm':   '0 0 12px -2px rgba(99,102,241,0.4)',
        'glow-md':   '0 0 24px -4px rgba(99,102,241,0.5)',
        'glow-lg':   '0 0 48px -8px rgba(99,102,241,0.6)',
        'glow-teal': '0 0 24px -4px rgba(16,185,129,0.4)',
        'card':      '0 1px 3px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)',
        'card-hover':'0 1px 3px rgba(0,0,0,0.5), 0 16px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        'input':     'inset 0 1px 3px rgba(0,0,0,0.4)',
        'nav':       '0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.4)',
      },
      animation: {
        'fade-up':     'fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in':     'fadeIn 0.4s ease forwards',
        'slide-right': 'slideRight 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'glow-pulse':  'glowPulse 3s ease-in-out infinite',
        'float':       'float 6s ease-in-out infinite',
        'scan-line':   'scanLine 3s linear infinite',
        'shimmer':     'shimmer 2s linear infinite',
        'count-up':    'countUp 1s ease-out forwards',
        'spin-slow':   'spin 8s linear infinite',
        'dash':        'dash 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideRight: {
          from: { opacity: '0', transform: 'translateX(-20px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%':      { opacity: '0.8', transform: 'scale(1.05)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        scanLine: {
          '0%':   { transform: 'translateY(-100%)', opacity: '0' },
          '10%':  { opacity: '1' },
          '90%':  { opacity: '1' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        dash: {
          '0%':   { strokeDasharray: '1, 150', strokeDashoffset: '0' },
          '50%':  { strokeDasharray: '90, 150', strokeDashoffset: '-35' },
          '100%': { strokeDasharray: '90, 150', strokeDashoffset: '-124' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
    },
  },
  plugins: [],
}