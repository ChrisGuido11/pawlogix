/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#0D7377',
        secondary: '#F5A623',
        background: '#FAF9F6',
        surface: '#FFFFFF',
        'text-primary': '#1A1A2E',
        'text-secondary': '#64748B',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#EF5350',
        info: '#2196F3',
        border: '#E5E7EB',
        disabled: '#D1D5DB',
      },
    },
  },
  plugins: [],
};
