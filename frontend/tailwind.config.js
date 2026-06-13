/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ── Breakpoints ───────────────────────────────────────────────────────
      screens: {
        xs: '375px',   // smallest mobile (iPhone SE)
        // sm: 640px, md: 768px, lg: 1024px, xl: 1280px — Tailwind defaults
      },

      // ── Typography ────────────────────────────────────────────────────────
      fontFamily: {
        sans:    ['Barlow', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Barlow Condensed', 'system-ui', 'sans-serif'],
      },

      // ── Colors ────────────────────────────────────────────────────────────
      colors: {
        // Sports Red — primary brand color
        primary: {
          50:  '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',   // brand primary
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          950: '#450a0a',
        },
        // Championship Gold — accent / CTA
        accent: {
          300: '#fde68a',
          400: '#fbbf24',   // brand accent
          500: '#f59e0b',
          600: '#d97706',
        },
        // App surfaces — dark-first
        surface: {
          DEFAULT: '#1f2937',   // gray-800 — card background
          dark:    '#111827',   // gray-900 — app background
          raised:  '#374151',   // gray-700 — elevated panels
          overlay: '#0f172a',   // slate-900 — modal backdrop base
        },
      },

      // ── Shadows ───────────────────────────────────────────────────────────
      boxShadow: {
        'card':         '0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)',
        'card-hover':   '0 6px 16px rgba(0,0,0,0.5)',
        'glow-primary': '0 0 20px rgba(220,38,38,0.25)',
        'glow-green':   '0 0 16px rgba(34,197,94,0.2)',
        'glow-gold':    '0 0 16px rgba(251,191,36,0.2)',
        'modal':        '0 20px 60px rgba(0,0,0,0.7)',
      },

      // ── Border Radius ─────────────────────────────────────────────────────
      borderRadius: {
        'card':  '1rem',     // 16px — cards, panels
        'btn':   '0.75rem',  // 12px — buttons, inputs
        'badge': '9999px',   // fully rounded — status badges
      },

      // ── Transitions ───────────────────────────────────────────────────────
      transitionDuration: {
        'fast':   '150ms',
        'normal': '250ms',
        'slow':   '400ms',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-expo':  'cubic-bezier(0.7, 0, 0.84, 0)',
        'spring':   'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      // ── Animations ────────────────────────────────────────────────────────
      animation: {
        'fade-in':    'fadeIn 0.2s ease-out',
        'slide-up':   'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in':   'scaleIn 0.15s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
}
