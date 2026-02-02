/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './apps/frontend/src/**/*.{html,ts,scss}',
    './libs/**/*.{html,ts,scss}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neo-brutalist colors
        'brutal-primary': '#FF6B6B',
        'brutal-secondary': '#4ECDC4',
        'brutal-accent': '#FFE66D',
        'brutal-dark': '#2D3047',
        'brutal-light': '#F7F7F7',
        
        // Glassmorphism colors
        'glass-white': 'rgba(255, 255, 255, 0.1)',
        'glass-gray': 'rgba(156, 163, 175, 0.1)',
        
        // Semantic colors
        'evidence-restricted': '#FF6B6B',
        'evidence-normal': '#4ECDC4',
        'event-case': '#FFE66D',
        'event-evidence': '#4ECDC4',
        'event-note': '#A78BFA',
      },
      backdropBlur: {
        'glass': '10px',
        'glass-heavy': '20px',
      },
      borderWidth: {
        'brutal': '4px',
        'glass': '1px',
      },
      boxShadow: {
        'brutal': '8px 8px 0px 0px rgba(0, 0, 0, 1)',
        'brutal-sm': '4px 4px 0px 0px rgba(0, 0, 0, 1)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'inner-brutal': 'inset 4px 4px 0px 0px rgba(0, 0, 0, 0.5)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-brutal': 'pulseBrutal 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseBrutal: {
          '0%, 100%': { boxShadow: '8px 8px 0px 0px rgba(255, 107, 107, 1)' },
          '50%': { boxShadow: '8px 8px 0px 0px rgba(255, 107, 107, 0.5)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
