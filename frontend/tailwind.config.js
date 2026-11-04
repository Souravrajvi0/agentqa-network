/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        DEFAULT: "10px",
        sm: "8px",
        md: "10px",
        lg: "14px",
        xl: "18px",
      },
      colors: {
        accent: {
          DEFAULT: "#0F766E",
          hover: "#0D5C56",
          soft: "#CCFBF1",
          muted: "rgba(15, 118, 110, 0.12)",
        },
        canvas: "#18181b",
        surface: "#27272a",
        elevated: "#3f3f46",
        hairline: "#52525b",
        passed: "#10b981",
        critical: "#f43f5e",
        warning: "#f59e0b",
        info: "#71717a",
        agent: "#a1a1aa",
        human: "#d4d4d8",
      },
      boxShadow: {
        glow: "0 0 0 1px var(--glow-ring), 0 20px 50px var(--glow-shadow)",
      },
      animation: {
        pulseStripe: "pulseStripe 2s ease-in-out infinite",
      },
      keyframes: {
        pulseStripe: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
      },
    },
  },
  plugins: [],
};
