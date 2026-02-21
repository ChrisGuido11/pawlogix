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
        primary: {
          DEFAULT: '#0D7377',
          50: '#E6F4F4',
          100: '#B3DDDE',
          200: '#80C6C8',
          300: '#4DAFB2',
          400: '#26999C',
          500: '#0D7377',
          600: '#0B6163',
          700: '#094F50',
          800: '#073D3E',
          900: '#042B2C',
          light: '#E6F4F4',
        },
        secondary: {
          DEFAULT: '#F5A623',
          50: '#FEF6E8',
          100: '#FDE8C0',
          200: '#FBDA98',
          300: '#F9CC70',
          400: '#F7B84A',
          500: '#F5A623',
          600: '#D4901E',
        },
        background: {
          DEFAULT: '#FAF9F6',
          warm: '#F5F3EE',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8F7F4',
        },
        'text-primary': '#1A1A2E',
        'text-secondary': '#64748B',
        'text-tertiary': '#94A3B8',
        success: {
          DEFAULT: '#4CAF50',
          light: '#E8F5E9',
          dark: '#2E7D32',
        },
        warning: {
          DEFAULT: '#FF9800',
          light: '#FFF3E0',
          dark: '#E65100',
        },
        error: {
          DEFAULT: '#EF5350',
          light: '#FFEBEE',
          dark: '#C62828',
        },
        info: '#2196F3',
        border: {
          DEFAULT: '#E5E7EB',
          light: '#F0EDE8',
        },
        disabled: '#D1D5DB',
      },
      borderRadius: {
        'card': '16px',
        'btn': '12px',
        'input': '12px',
      },
      fontSize: {
        'hero': ['36px', { lineHeight: '42px', fontWeight: '800' }],
        'heading': ['28px', { lineHeight: '34px', fontWeight: '700' }],
        'title': ['22px', { lineHeight: '28px', fontWeight: '700' }],
        'subtitle': ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'overline': ['11px', { lineHeight: '16px', fontWeight: '700', letterSpacing: '0.08em' }],
      },
    },
  },
  plugins: [],
};
