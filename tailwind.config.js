/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        mountain: {
          blue: '#1a365d',
          'blue-light': '#2c5282',
          'blue-dark': '#0f2440',
          navy: '#0c1929',
          slate: '#1e3a5f',
          mist: '#3d5a80'
        },
        accent: {
          DEFAULT: '#C8A55C',
          light: '#D4BC7E',
          dark: '#A8873A',
          warm: '#DAC48A',
          muted: '#B09860'
        },
        alpine: {
          pine: '#1d4e3e',
          forest: '#166534',
          meadow: '#65a30d',
          rock: '#78716c',
          snow: '#f8fafc',
          ice: '#e0f2fe'
        },
        semantic: {
          success: {
            DEFAULT: '#4A9E7E',
            light: '#6AB89A',
            dark: '#3A8168',
          },
          danger: {
            DEFAULT: '#C75454',
            light: '#D97777',
            dark: '#A84444',
          },
          warning: {
            DEFAULT: '#D4A843',
            light: '#E0BE6E',
            dark: '#B08D36',
          }
        },
        class: {
          1: '#5A9E78',
          2: '#4A7FB5',
          3: '#C4943F',
          4: '#B84C4C'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Instrument Serif', 'Georgia', 'serif']
      },
      screens: {
        xs: '375px'
      },
      borderRadius: {
        card: '0.75rem'
      },
      boxShadow: {
        card: '0 1px 2px rgba(12, 25, 41, 0.05)',
        'card-hover': '0 2px 6px rgba(12, 25, 41, 0.06), 0 8px 20px rgba(12, 25, 41, 0.06)',
        'card-elevated': '0 4px 12px rgba(12, 25, 41, 0.08), 0 16px 40px rgba(12, 25, 41, 0.10)',
        'glow-accent': '0 0 0 1px rgba(200, 165, 92, 0.35)',
        'glow-class-1': '0 0 0 1px rgba(90, 158, 120, 0.35)',
        'glow-class-2': '0 0 0 1px rgba(74, 127, 181, 0.35)',
        'glow-class-3': '0 0 0 1px rgba(196, 148, 63, 0.35)',
        'glow-class-4': '0 0 0 1px rgba(184, 76, 76, 0.35)'
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'fade-in-up': 'fade-in-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-down': 'fade-in-down 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        float: 'float 3s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite'
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};
