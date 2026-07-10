import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F4EE",
        card: "#FDFCF9",
        ink: "#171A1E",
        faint: "#5C6068",
        rule: "#DCD7CB",
        ledger: { DEFAULT: "#0E5C46", dark: "#0A4635", tint: "#E4EFE9" },
        moving: "#1F9D66",
        slowing: "#D98E1B",
        stuck: "#CE4432",
        amber: { tint: "#FBF3E2" },
        red: { tint: "#FAEAE7" },
      },
      fontFamily: {
        display: ["'Archivo Black'", "sans-serif"],
        sans: ["'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 #DCD7CB, 0 8px 24px -16px rgba(23,26,30,0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
