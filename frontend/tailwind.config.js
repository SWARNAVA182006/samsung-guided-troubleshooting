/** @type {import('tailwindcss').Config} */
export default {
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
        },
      },
    },
  },
  plugins: [],
};
