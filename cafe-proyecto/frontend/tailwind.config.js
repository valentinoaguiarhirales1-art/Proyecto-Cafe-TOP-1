/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cafe: {
          dark:    '#1a0f00',
          espresso:'#2c1a0e',
          brown:   '#5c3317',
          caramel: '#c67c3f',
          cream:   '#f5e6c8',
          gold:    '#d4a017',
          light:   '#fdf6ec',
        }
      },
      fontFamily: {
        serif:  ['Playfair Display', 'Georgia', 'serif'],
        sans:   ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':      'fadeIn 0.6s ease-out',
        'slide-up':     'slideUp 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'float':        'float 3s ease-in-out infinite',
        'pulse-gold':   'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:      { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:     { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight:{ '0%': { opacity: '0', transform: 'translateX(30px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        float:       { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        pulseGold:   { '0%, 100%': { boxShadow: '0 0 0 0 rgba(212,160,23,0.4)' }, '50%': { boxShadow: '0 0 0 10px rgba(212,160,23,0)' } },
      },
      backgroundImage: {
        'hero-pattern': "url('/images/hero-cafe.jpg')",
        'cafe-texture': "linear-gradient(135deg, #1a0f00 0%, #2c1a0e 50%, #5c3317 100%)",
      }
    },
  },
  plugins: [],
}
