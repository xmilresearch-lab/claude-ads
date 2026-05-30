import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand
        amber: { DEFAULT: "#F59E0B", dark: "#D97706", light: "#FCD34D" },
        cyan:  { DEFAULT: "#06B6D4", dark: "#0891B2" },
        // Backgrounds
        bg: {
          base:     "#0A0B0F",
          surface:  "#0D0E14",
          elevated: "#111318",
          overlay:  "#151820",
        },
        // Borders
        border: {
          DEFAULT: "#1E2330",
          subtle:  "#161B26",
          strong:  "#2D3548",
        },
        // Text
        text: {
          primary:   "#F1F5F9",
          secondary: "#94A3B8",
          muted:     "#64748B",
          inverse:   "#0A0B0F",
        },
        // Status
        success: "#10B981",
        danger:  "#EF4444",
        warning: "#F59E0B",
        info:    "#06B6D4",
      },
      fontFamily: {
        display: ["Syne", "sans-serif"],
        sans:    ["DM Sans", "sans-serif"],
        mono:    ["DM Mono", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "1rem" }],
      },
      borderRadius: {
        DEFAULT: "4px",
        sm:      "2px",
        md:      "6px",
        lg:      "8px",
        xl:      "12px",
      },
      boxShadow: {
        amber: "0 0 0 1px #F59E0B, 0 0 12px rgba(245, 158, 11, 0.15)",
        cyan:  "0 0 0 1px #06B6D4, 0 0 12px rgba(6, 182, 212, 0.15)",
        card:  "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.6)",
      },
      animation: {
        "pulse-amber": "pulse-amber 2s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-up":     "fade-up 0.2s ease-out",
        "slide-in":    "slide-in 0.15s ease-out",
        "count-up":    "fade-up 0.4s ease-out",
      },
      keyframes: {
        "pulse-amber": {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.4" },
        },
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%":   { opacity: "0", transform: "translateX(-8px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      backgroundImage: {
        "grid-pattern": `linear-gradient(#1E2330 1px, transparent 1px),
                         linear-gradient(90deg, #1E2330 1px, transparent 1px)`,
      },
      backgroundSize: {
        grid: "32px 32px",
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require("tailwindcss-animate")],
};
export default config;
