/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        // Standard Tailwind breakpoints are fine.
        // Explicitly naming xs for very small phones:
        'xs': '375px',
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        wordPop: {
          '0%':   { transform: 'scale(0.6)', opacity: '0' },
          '60%':  { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)',   opacity: '1' },
        },
        fadeUp: {
          from: { transform: 'translateY(16px)', opacity: '0' },
          to:   { transform: 'translateY(0)',    opacity: '1' },
        },
      },
      animation: {
        'word-pop': 'wordPop 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        'fade-up':  'fadeUp  0.3s ease-out',
      },
    },
  },
  plugins: [],
}