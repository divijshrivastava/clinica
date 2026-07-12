/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f7f4',
          100: '#e1ece7',
          200: '#c4d9d0',
          300: '#9abfb0',
          400: '#6da18f',
          500: '#4a8372',
          600: '#386a5d',
          700: '#2e554b',
          800: '#27453e',
          900: '#1d3933',
          950: '#102720',
        },
        mint: {
          50: '#effcf7',
          100: '#d8f7ea',
          200: '#b4edda',
          300: '#7cdcc3',
          400: '#45c5a7',
          500: '#25a98f',
          600: '#188875',
          700: '#176d60',
          800: '#16574d',
          900: '#14483f',
        },
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 39, 32, 0.03), 0 8px 24px rgba(16, 39, 32, 0.04)',
        soft: '0 18px 50px rgba(16, 39, 32, 0.12)',
      },
    },
  },
  plugins: [],
}
