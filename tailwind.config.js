/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f0f12',
          card: '#18181f',
          border: '#262631',
          text: '#f1f1f5',
          muted: '#8f90a6',
          primary: '#4f46e5',
          secondary: '#10b981',
          danger: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
