/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  // class 模式：深色跟随由 SettingsContext 在 documentElement 上管理（皮肤模式下强制浅色，不加 dark）
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei"', 'sans-serif'],
      },
      colors: {
        // DEFAULT 档由皮肤 CSS 变量驱动（--skin-accent / --skin-bg-main 为逗号分隔 RGB 三元组），
        // 支持 primary/5、ring-primary/30 等透明度用法；其余档位保持静态色板
        primary: {
          DEFAULT: 'rgb(var(--skin-accent) / <alpha-value>)',
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
          DEFAULT: 'rgb(var(--skin-bg-main) / <alpha-value>)',
          50: '#FFFFFF',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
        },
        dark: {
          DEFAULT: '#1c1c1e',
          50: '#2c2c2e',
          100: '#333333',
          200: '#48484a',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'toast-in': 'toastIn 0.3s ease-out',
        'modal-in': 'modalIn 0.2s ease-out',
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
        modalIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
