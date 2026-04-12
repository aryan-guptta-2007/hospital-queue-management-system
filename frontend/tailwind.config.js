/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        hospital: {
          blue: '#1a56db',
          green: '#057a55',
          red: '#e02424',
          amber: '#d97706',
          /** Calm clinical UI — sky tints, not pure gray */
          clinical: {
            page: '#f5f8fc',
            mist: '#eef4fc',
            deep: '#0c1220',
            night: '#121820',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(26, 86, 219, 0.45)',
        'glow-lg': '0 0 60px -10px rgba(26, 86, 219, 0.55)',
        'inner-soft': 'inset 0 2px 4px rgba(0,0,0,0.06)',
        card: '0 4px 6px -1px rgba(0,0,0,0.07), 0 10px 20px -5px rgba(0,0,0,0.08)',
        'card-hover': '0 12px 40px -12px rgba(0,0,0,0.15), 0 4px 12px -2px rgba(26,86,219,0.12)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'bounce-in': {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 32px -4px rgba(59, 130, 246, 0.5)' },
          '50%': { boxShadow: '0 0 48px 0 rgba(96, 165, 250, 0.65)' },
        },
        'pulse-once': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.92' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'token-flash': {
          '0%': { transform: 'scale(1)', filter: 'brightness(1)' },
          '40%': { transform: 'scale(1.04)', filter: 'brightness(1.15)' },
          '100%': { transform: 'scale(1)', filter: 'brightness(1)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in-down': 'fade-in-down 0.35s ease-out forwards',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'bounce-in': 'bounce-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        'pulse-once': 'pulse-once 0.6s ease-in-out',
        'shimmer': 'shimmer 2.5s linear infinite',
        'token-flash': 'token-flash 0.65s cubic-bezier(0.22, 1, 0.36, 1)',
        'float': 'float 5s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'spin-slow': 'spin-slow 1.2s linear infinite',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
