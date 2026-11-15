/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: 'var(--academy-accent)', 50: '#f1fbf8', 100: '#e7f8f4', 200: '#b6e6dc', 300: '#83d6c8', 400: '#3aa99a', 500: '#007d70', 600: '#00675d', 700: '#00594f', 800: '#00483f', 900: '#003c34', 950: '#002b26' },
        app: {
          canvas: 'var(--app-canvas, #f8f9fd)', indigo: 'var(--app-indigo, #007d70)',
          surface: 'var(--ui-surface, #ffffff)', 'surface-raised': 'var(--ui-surface-raised, #f8faff)',
          'surface-hover': 'var(--ui-surface-hover, #eef9f7)', border: 'var(--ui-border, #eceef4)',
          text: 'var(--ui-text, #191b2d)', 'text-secondary': 'var(--ui-text-secondary, #55596b)',
          'text-muted': 'var(--ui-text-muted, #85899a)', 'accent-surface': 'var(--ui-accent-surface, #e7f8f4)',
          'accent-text': 'var(--ui-accent-text, #00675d)',
        },
        dark: { bg: 'var(--bg, #0b1020)', card: 'var(--ui-surface, #151a27)', raised: 'var(--ui-surface-raised, #1b2030)', hover: 'var(--ui-surface-hover, #252b3b)', border: 'var(--ui-border, #2d3344)' },
        status: {
          success: { bg: '#e8f6f0', text: '#35896b', dot: '#35a77f', darkBg: '#132e27', darkText: '#4ade80' },
          danger: { bg: '#fff0f3', text: '#b75872', dot: '#ef5961', darkBg: '#3c1e28', darkText: '#ff8090' },
          warning: { bg: '#fff1e8', text: '#bb7951', dot: '#e1a16e', darkBg: '#352614', darkText: '#fbbf24' },
          info: { bg: '#edf4ff', text: '#527dbc', dot: '#6890cd', darkBg: '#172554', darkText: '#60a5fa' },
          lilac: { bg: '#e7f8f4', text: '#7365ca', dot: '#7669e4', darkBg: '#292440', darkText: '#b5aaff' },
        },
      },
      fontFamily: { heading: ['IBM Plex Sans Arabic', 'sans-serif'], arabic: ['IBM Plex Sans Arabic', 'system-ui', 'sans-serif'] },
      spacing: { sidebar: 'var(--app-sidebar-width, 244px)', 'sidebar-collapsed': '72px', header: '58px' },
      borderRadius: { card: '9px', panel: '10px', dialog: '12px' },
      boxShadow: { card: '0 1px 3px rgba(36,32,59,.04)', hover: '0 4px 12px rgba(49,44,85,.08)', popover: '0 12px 35px rgba(40,35,71,.09)', navActive: '0 4px 12px rgba(0,125,112,.22)' },
    },
  },
  plugins: [],
};
