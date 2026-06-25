/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        teal:    "#00FFD1",
        orange:  "#FF6B00",
        void:    "#080C0C",
        surface: "#0C1414",
        raised:  "#112020",
      },
      fontFamily: {
        outfit: ["Outfit", "sans-serif"],
        mono:   ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        teal:   "0 0 30px rgba(0,255,209,0.25), 0 0 80px rgba(0,255,209,0.1)",
        orange: "0 0 30px rgba(255,107,0,0.25), 0 0 80px rgba(255,107,0,0.1)",
      },
      animation: {
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        "float":      "float 6s ease-in-out infinite",
        "slide-up":   "slideUp 0.4s ease-out",
      },
      keyframes: {
        glowPulse: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.6" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-10px)" },
        },
        slideUp: {
          from: { transform: "translateY(20px)", opacity: "0" },
          to:   { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
