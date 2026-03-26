import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "rp-black": "#111111",
        "rp-white": "#FFFFFF",
        "rp-bg": "#F7F7F5",
        "rp-border": "#E5E5E5",
        "rp-text-1": "#111111",
        "rp-text-2": "#555555",
        "rp-text-3": "#999999",
        "rp-accent": "#F97316",
        "rp-accent-dk": "#E06910",
      },
      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "6": "24px",
        "8": "32px",
        "12": "48px",
        "16": "64px",
        "24": "96px",
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
export default config;
