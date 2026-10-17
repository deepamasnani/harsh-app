import type { Config } from "tailwindcss";

export default {
  content: ["./pages/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
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
} satisfies Config;
