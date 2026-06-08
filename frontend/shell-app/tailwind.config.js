/** @type {import('tailwindcss').Config} */
export default {
  // Scan the remotes too: the shell ships ONE global stylesheet containing every
  // utility class used anywhere (shell + admin-app + enroll-app). This sidesteps
  // CSS-injection quirks of Module Federation — remotes render against shell's CSS.
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
    '../admin-app/src/**/*.{js,jsx}',
    '../enroll-app/src/**/*.{js,jsx}',
  ],
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
