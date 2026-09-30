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
          50: '#f2f1ff',
          100: '#e8e6ff',
          200: '#d3ceff',
          300: '#b5aaff',
          400: '#9487f2',
          500: '#7669e4',
          600: '#665bd0',
          700: '#554bb2',
          800: '#453e90',
          900: '#38336f',
          950: '#252247',
        },
        dark: {
          bg: '#25243d',
          card: '#302e4a',
          border: '#41405e'
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
