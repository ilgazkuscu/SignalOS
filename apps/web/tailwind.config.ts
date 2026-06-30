import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f5f6fb",
          100: "#e9ecf8",
          200: "#d1d7f0",
          300: "#a6b1df",
          400: "#7486ca",
          500: "#5063b4",
          600: "#3d4d97",
          700: "#334078",
          800: "#2e3864",
          900: "#172033",
        },
        sand: {
          50: "#faf7f1",
          100: "#f4ede0",
          200: "#e9dcc0",
          300: "#ddc59b",
          400: "#cea66e",
          500: "#c28b4b",
          600: "#a66f39",
          700: "#86562f",
          800: "#70472a",
          900: "#603d27",
        },
      },
      boxShadow: {
        panel: "0 10px 30px rgba(10, 15, 35, 0.08)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
