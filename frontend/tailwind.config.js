/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#2383E2',
          dark: '#5B9AF7',
        },
        bg: {
          light: '#FFFFFF',
          'sidebar-light': '#F7F7F5',
          dark: '#191919',
          'sidebar-dark': '#202020',
        },
        text: {
          primary: {
            light: '#37352F',
            dark: '#E3E2E0',
          },
          secondary: '#9B9A97',
        },
        border: {
          light: '#E9E9E7',
          dark: '#2F2F2F',
        },
      },
    },
  },
  plugins: [],
}
