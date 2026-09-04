/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#07080f",
        night: "#10121c",
        gold: "#e8c36a",
        mist: "#c8c3b4",
        teal: "#5eead4",
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        sans: ["Outfit", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 80px rgba(232, 195, 106, 0.12)",
      },
    },
  },
  plugins: [],
};
