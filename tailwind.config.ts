import type { Config } from "tailwindcss";

// Design tokens — grounded in the pickleball court itself:
// deep court-surface teal, optic-yellow ball accent, chalk lines, and a
// scoreboard display face paired with a clean body sans.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        court: {
          DEFAULT: "#0F3D37", // deep court teal
          light: "#155E54",
          dark: "#0A2B27",
        },
        chalk: "#F4F6F2", // page background — cool off-white, not cream
        surface: "#FFFFFF",
        line: "#DDE3DE", // hairline / border, like court chalk lines
        ink: "#151E1C", // primary text
        ash: "#5B6B67", // secondary text
        ball: {
          DEFAULT: "#D7E639", // optic yellow — the one accent color
          dark: "#B8C420",
        },
        clay: "#C1542E", // reserved for destructive / blocked states only
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      borderRadius: {
        card: "10px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15, 61, 55, 0.06), 0 1px 0 rgba(15,61,55,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
