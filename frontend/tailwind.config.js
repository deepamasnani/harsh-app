/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', "Georgia", "serif"],
        sans: ['"Schibsted Grotesk"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brass: {
          50: "#fbf6ea",
          400: "#d4a017",
          500: "#c4920a",
          600: "#a67c08",
          700: "#8a6707",
        },
        paper: "#f4efe6",
        ink: "#1c1612",
      },
      boxShadow: {
        sheet: "0 1px 0 rgba(28,22,18,0.06), 0 12px 32px rgba(28,22,18,0.08)",
      },
    },
  },
  plugins: [],
};
