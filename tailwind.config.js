export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a5bbfc',
          400: '#8b9ff8',
          500: '#7c7ff2',
          600: '#6b5ee6',
          700: '#5a4bcb',
          800: '#4a3fa4',
          900: '#3e3882',
        },
        dark: {
          900: '#0a0e1a',
          800: '#0f1420',
          700: '#1a1f2e',
          600: '#252b3b',
          500: '#323949',
        },
        accent: {
          purple: '#7c7ff2',
          blue: '#4a90e2',
          green: '#10b981',
          orange: '#f59e0b',
          red: '#ef4444',
        }
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'gradient-purple': 'linear-gradient(135deg, #7c7ff2 0%, #5a4bcb 100%)',
      },
      boxShadow: {
        'dark': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'dark-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2)',
      }
    },
  },
  plugins: [],
}