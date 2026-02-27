/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-alt": "var(--bg-alt)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        accent: "var(--accent)",
        "accent-alt": "var(--accent-alt)",
        surface: "var(--surface)",
        "surface-strong": "var(--surface-strong)",
        line: "var(--line)",
      },
      boxShadow: {
        panel: "0 18px 38px rgba(8, 16, 21, 0.32)",
      },
    },
  },
  plugins: [],
};
