/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
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
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 30px rgba(0,0,0,0.35)",
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
