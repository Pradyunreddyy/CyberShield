/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0B0D12",
        panel: "#12151C",
        "panel-raised": "#171B24",
        hairline: "#232833",
        "hairline-soft": "#1A1E27",
        ink: "#E6E9EF",
        "ink-muted": "#8891A0",
        "ink-faint": "#5B6472",
        signal: {
          DEFAULT: "#5B8CFF",
          dim: "#3A5CC7",
          bright: "#7FA4FF",
        },
        severity: {
          critical: "#FF4757",
          high: "#FF9F43",
          medium: "#F0C93D",
          low: "#6C7A92",
        },
        state: {
          success: "#2ED573",
          warning: "#F0C93D",
          danger: "#FF4757",
          info: "#5B8CFF",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.02) inset",
      },
    },
  },
  plugins: [],
};
