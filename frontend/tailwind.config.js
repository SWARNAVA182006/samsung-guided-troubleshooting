/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        samsung: {
          blue: "#1428A0",
          darkNavy: "#0B1536",
          accent: "#2D68C4",
          lightBg: "#0B132B",
          cardBg: "#1C2541",
          highlight: "#00C6FF",
          cobalt: "#0A192F",
          deepSlate: "#0F172A",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        "oneui": "1.25rem",
        "oneui-lg": "1.5rem",
      },
    },
  },
  plugins: [],
};
