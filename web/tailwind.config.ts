import type { Config } from "tailwindcss";

export default {
  content: ["./pages/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["ui-rounded", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      colors: {
        brass: {
          50: "#f0fdfa",
          400: "#2dd4bf",
          500: "#0d9488",
          600: "#0f766e",
          700: "#115e59",
        },
        paper: "#f3f4f6",
        ink: "#0f172a",
      },
      boxShadow: {
        sheet: "0 1px 0 rgba(15,23,42,0.04), 0 10px 28px rgba(15,23,42,0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
