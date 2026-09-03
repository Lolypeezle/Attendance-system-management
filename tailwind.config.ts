import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        fuoye: {
          green: {
            DEFAULT: "#006B3F",
            dark: "#004D2C",
            light: "#0D8A52",
            50: "#F0FDF4",
            100: "#DCFCE7",
            500: "#10B981",
            800: "#065F46",
            900: "#004D2C",
          },
          gold: {
            DEFAULT: "#E5A823",
            light: "#F5B83D",
            dark: "#B8820E",
            50: "#FFFBEB",
            100: "#FEF3C7",
            500: "#F59E0B",
          },
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
