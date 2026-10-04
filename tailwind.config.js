/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#09090b",
        surface: "#121215",
        "surface-card": "#18181b",
        "surface-border": "#27272a",
        neon: {
          lime: "#a3e635",
          emerald: "#10b981",
          cyan: "#06b6d4",
          orange: "#f97316",
          rose: "#f43f5e"
        }
      }
    },
  },
  plugins: [],
}
