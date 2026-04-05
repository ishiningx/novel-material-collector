/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#2C5F6E',
          50: '#E8F4F7',
          100: '#D1E9EF',
          200: '#A3D3DF',
          300: '#75BDCF',
          400: '#3A7D8E',
          500: '#2C5F6E',
          600: '#1B3A42',
          700: '#152D33',
          800: '#0F1F24',
          900: '#091215',
        },
        surface: {
          DEFAULT: '#FAF8F5',
          50: '#FFFFFF',
          100: '#F5F3F0',
          200: '#EDEBE8',
          300: '#E0DEDB',
        },
        dark: {
          DEFAULT: '#1E1E1E',
          50: '#2A2A2A',
          100: '#333333',
          200: '#444444',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'toast-in': 'toastIn 0.3s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateY(-4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        toastIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
