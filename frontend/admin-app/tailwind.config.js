/** @type {import('tailwindcss').Config} */
export default {
  // preflight is disabled — the shell already provides the CSS reset; this avoids
  // a second reset fighting the host styles when the remote mounts.
  corePlugins: { preflight: false },
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff', 100: '#d9e6ff', 200: '#bcd3ff', 300: '#8eb6ff',
          400: '#598dff', 500: '#3b6cf6', 600: '#2552eb', 700: '#1d40d8',
          800: '#1e36af', 900: '#1e328a',
        },
      },
      boxShadow: {
        card: '0 1px 3px rgba(16,24,40,.1), 0 1px 2px rgba(16,24,40,.06)',
        pop: '0 10px 30px rgba(16,24,40,.12)',
      },
    },
  },
  plugins: [],
};
