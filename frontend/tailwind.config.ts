import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#EA580C",
        "accent-dark": "#C2470A",
        surface: "#F7F6F3",
      },
    },
  },
  plugins: [],
};

export default config;
