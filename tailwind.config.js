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
        primary: {50: '#EDE9FE',100: '#EDE9FE',200: '#EDE9FE',300: '#A78BFA',400: '#A78BFA',500: '#7C3AED',600: '#7C3AED',700: '#7C3AED',800: '#7C3AED',900: '#0F172A',950: '#0F172A'},
        violet: {50: '#EDE9FE',100: '#EDE9FE',200: '#EDE9FE',300: '#A78BFA',400: '#A78BFA',500: '#7C3AED',600: '#7C3AED',700: '#7C3AED',800: '#7C3AED',900: '#0F172A',950: '#0F172A'},
        purple: {50: '#EDE9FE',100: '#EDE9FE',200: '#EDE9FE',300: '#A78BFA',400: '#A78BFA',500: '#7C3AED',600: '#7C3AED',700: '#7C3AED',800: '#7C3AED',900: '#0F172A',950: '#0F172A'},
        indigo: {50: '#EDE9FE',100: '#EDE9FE',200: '#EDE9FE',300: '#A78BFA',400: '#A78BFA',500: '#7C3AED',600: '#7C3AED',700: '#7C3AED',800: '#7C3AED',900: '#0F172A',950: '#0F172A'},
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
