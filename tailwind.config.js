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
          DEFAULT: '#5BC5F2',
          dark: '#3BA8D8',
          light: '#E8F6FC',
        },
        secondary: '#FFBE3D',
        'accent-coral': '#FF6B8A',
        background: '#F5F5F5',
        surface: '#FFFFFF',
        'text-heading': '#1E1E2D',
        'text-body': '#3D3D4E',
        'text-muted': '#9E9EB0',
        success: {
          DEFAULT: '#34C759',
          light: '#EAFBF0',
        },
        warning: {
          DEFAULT: '#FFAA33',
          light: '#FFF8E1',
        },
        error: {
          DEFAULT: '#E53E3E',
          light: '#FFF0EF',
        },
        border: '#EAEAEA',
        disabled: '#D0D0D8',
        'tab-inactive': '#B0B0C0',
      },
      borderRadius: {
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        'card': '16px',
        'btn': '12px',
        'pill': '9999px',
        'input': '14px',
      },
      fontSize: {
        'screen-title': ['24px', { lineHeight: '32px', fontWeight: '700' }],
        'content-title': ['28px', { lineHeight: '36px', fontWeight: '700' }],
        'section-heading': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'card-title': ['17px', { lineHeight: '24px', fontWeight: '600' }],
        'body': ['15px', { lineHeight: '22px', fontWeight: '400' }],
        'secondary': ['13px', { lineHeight: '18px', fontWeight: '400' }],
        'caption': ['11px', { lineHeight: '16px', fontWeight: '500' }],
        'btn-primary': ['16px', { lineHeight: '22px', fontWeight: '700' }],
        'btn-secondary': ['16px', { lineHeight: '22px', fontWeight: '600' }],
        'tab-label': ['10px', { lineHeight: '14px', fontWeight: '500' }],
      },
    },
  },
  plugins: [],
};
