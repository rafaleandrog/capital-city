/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        zone: {
          central: "#d4a94e",
          comercial: "#5e9bd4",
          residencial: "#7dbb6e",
          industrial: "#b07adb",
          periferico: "#8b8f99",
        },
      },
    },
  },
  plugins: [],
};
