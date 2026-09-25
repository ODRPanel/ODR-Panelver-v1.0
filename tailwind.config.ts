import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f5fb",
          100: "#dbe7f3",
          200: "#b9d1e8",
          300: "#8bb3d8",
          400: "#5a8fc4",
          500: "#3a70ab",
          600: "#2b578c",
          700: "#254971",
          800: "#213e5f",
          900: "#1f3651",
          950: "#132135",
        },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "Times New Roman", "Times", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
