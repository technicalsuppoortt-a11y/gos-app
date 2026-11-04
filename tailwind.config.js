/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--ws-soft, #EDE9FE)',
          100: 'var(--ws-soft, #EDE9FE)',
          200: 'color-mix(in srgb, var(--ws-accent, #7C3AED) 25%, transparent)',
          300: 'color-mix(in srgb, var(--ws-accent, #7C3AED) 45%, transparent)',
          400: 'var(--ws-hover, #A78BFA)',
          500: 'var(--ws-accent, #7C3AED)',
          600: 'var(--ws-accent, #7C3AED)',
          700: 'var(--ws-hover, #6D28D9)',
          800: 'var(--ws-hover, #6D28D9)',
          900: '#0F172A',
          950: '#0F172A'
        },
        violet: {
          50: 'var(--ws-soft, #EDE9FE)',
          100: 'var(--ws-soft, #EDE9FE)',
          200: 'color-mix(in srgb, var(--ws-accent, #7C3AED) 25%, transparent)',
          300: 'color-mix(in srgb, var(--ws-accent, #7C3AED) 45%, transparent)',
          400: 'var(--ws-hover, #A78BFA)',
          500: 'var(--ws-accent, #7C3AED)',
          600: 'var(--ws-accent, #7C3AED)',
          700: 'var(--ws-hover, #6D28D9)',
          800: 'var(--ws-hover, #6D28D9)',
          900: '#0F172A',
          950: '#0F172A'
        },
        purple: {
          50: 'var(--ws-soft, #EDE9FE)',
          100: 'var(--ws-soft, #EDE9FE)',
          200: 'color-mix(in srgb, var(--ws-accent, #7C3AED) 25%, transparent)',
          300: 'color-mix(in srgb, var(--ws-accent, #7C3AED) 45%, transparent)',
          400: 'var(--ws-hover, #A78BFA)',
          500: 'var(--ws-accent, #7C3AED)',
          600: 'var(--ws-accent, #7C3AED)',
          700: 'var(--ws-hover, #6D28D9)',
          800: 'var(--ws-hover, #6D28D9)',
          900: '#0F172A',
          950: '#0F172A'
        },
        indigo: {
          50: 'var(--ws-soft, #EDE9FE)',
          100: 'var(--ws-soft, #EDE9FE)',
          200: 'color-mix(in srgb, var(--ws-accent, #7C3AED) 25%, transparent)',
          300: 'color-mix(in srgb, var(--ws-accent, #7C3AED) 45%, transparent)',
          400: 'var(--ws-hover, #A78BFA)',
          500: 'var(--ws-accent, #7C3AED)',
          600: 'var(--ws-accent, #7C3AED)',
          700: 'var(--ws-hover, #6D28D9)',
          800: 'var(--ws-hover, #6D28D9)',
          900: '#0F172A',
          950: '#0F172A'
        },
        dark: {
          bg: 'var(--bg, #0b1020)',
          card: 'var(--ui-surface, #151a27)',
          border: 'var(--ui-border, #2d3344)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Tajawal', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
