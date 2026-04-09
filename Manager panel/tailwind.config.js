/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#00D4FF",
        success: "#10B981",
        dark: {
          900: "#1A1A2E",
          800: "#16213E"
        }
      }
    },
  },
  plugins: [],
}
