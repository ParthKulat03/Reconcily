/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        anomaly: {
          DUPLICATE: '#ef4444',   // red-500
          TIMING_GAP: '#f59e0b',  // amber-500
          ROUNDING_DIFF: '#fb923c', // orange-500
          MISSING_ORIGINAL: '#a855f7', // purple-500
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
