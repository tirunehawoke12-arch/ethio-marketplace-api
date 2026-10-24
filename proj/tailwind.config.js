/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: { brand: { DEFAULT: '#0a8a56', dark: '#076b43', light: '#e6f6ee' }, teal: { brand: '#0b6e8f' }, gold: '#f5b301', ink: '#14221a', mute: '#5f6f65', line: '#e3e9e4', bg: '#f3f6f2' },
      fontFamily: { sans: ['"Noto Sans Ethiopic"', '"Abyssinica SIL"', 'Nyala', 'Kefa', '"Segoe UI"', 'Roboto', 'system-ui', '-apple-system', 'sans-serif'] },
      boxShadow: { soft: '0 1px 2px rgba(10,42,28,.05), 0 8px 24px rgba(10,42,28,.07)', lift: '0 16px 40px rgba(10,42,28,.16)' },
      keyframes: { fadeUp: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } }, shimmer: { '100%': { transform: 'translateX(100%)' } } },
      animation: { fadeUp: 'fadeUp .28s ease-out both' },
      backgroundImage: { brand: 'linear-gradient(135deg,#0a8a56 0%,#0b7f7a 55%,#0b6e8f 100%)', flag: 'linear-gradient(90deg,#078930 33%,#fcdd09 33% 66%,#da121a 66%)' },
    },
  },
  plugins: [],
};
