import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: {
          DEFAULT: '#0D1520',
          surface: '#131F2E',
          raised:  '#1A2840',
        },
        border: {
          DEFAULT: '#1E3550',
          subtle:  '#162840',
        },
        text: {
          DEFAULT: '#D6E4EF',
          strong:  '#F0F6FA',
          muted:   '#5E8097',
        },
        positive: '#2DD4BF',
        negative: '#FB7185',
        brand: {
          DEFAULT: '#818CF8',
          hover:   '#6366F1',
          subtle:  '#1E2A4A',
        },
        warning: '#FBBF24',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['DM Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'amount':    ['1rem',    { lineHeight: '1.5', fontWeight: '500' }],
        'amount-lg': ['1.5rem',  { lineHeight: '1.2', fontWeight: '500' }],
        'amount-xl': ['2rem',    { lineHeight: '1.1', fontWeight: '500' }],
      },
      boxShadow: {
        'card':     '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'modal':    '0 20px 60px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4)',
        'dropdown': '0 4px 16px rgba(0,0,0,0.5)',
      },
      keyframes: {
        fadeSlideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to:   { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-slide-up': 'fadeSlideUp 250ms ease forwards',
        'shimmer':        'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
