/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Surfaces: a blue-tinted off-black ramp. Never pure #000.
        void: "#0B0D12",
        panel: "#12151C",
        "panel-raised": "#171B24",
        well: "#0E1117", // inset surfaces: inputs, code, log output
        hairline: "#232833",
        "hairline-soft": "#1A1E27",
        // Text. ink-faint is for supporting text only and clears 4.5:1 on
        // panel/void (was #5B6472 at 3.05:1).
        ink: "#E6E9EF",
        "ink-muted": "#8891A0",
        "ink-faint": "#7C8697",
        // One accent. `strong` is the fill behind white text (4.6:1);
        // plain `signal` is for text/icons on dark surfaces (5.8:1).
        signal: {
          DEFAULT: "#5B8CFF",
          dim: "#3A5CC7",
          bright: "#7FA4FF",
          strong: "#3E6FE0",
          "strong-hover": "#3560D0",
        },
        severity: {
          critical: "#FF4757",
          high: "#FF9F43",
          medium: "#F0C93D",
          low: "#8E9BB3", // was #6C7A92 (3.6:1 on its own badge)
        },
        state: {
          success: "#2ED573",
          warning: "#F0C93D",
          danger: "#FF4757",
          "danger-strong": "#D93A49", // fill behind white text (4.5:1)
          "danger-strong-hover": "#C5303F",
          info: "#5B8CFF",
        },
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "ui-sans-serif", "system-ui", "-apple-system", "'Segoe UI'", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // Explicit scale (ratio ~1.2). Pairs size with line-height/tracking so
        // call sites don't hand-tune them.
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }], // 11
        xs: ["0.75rem", { lineHeight: "1rem" }], // 12
        sm: ["0.875rem", { lineHeight: "1.25rem" }], // 14
        base: ["1rem", { lineHeight: "1.5rem" }], // 16
        lg: ["1.125rem", { lineHeight: "1.625rem", letterSpacing: "-0.005em" }], // 18
        xl: ["1.375rem", { lineHeight: "1.75rem", letterSpacing: "-0.012em" }], // 22 page title
        "2xl": ["1.75rem", { lineHeight: "2.125rem", letterSpacing: "-0.018em" }], // 28 key figures
        "3xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.022em" }], // 36 hero figure
      },
      boxShadow: {
        // Shadows are tinted toward the surface hue, not neutral black.
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 1px 2px 0 rgba(4,6,12,0.45)",
        raised: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -8px rgba(4,6,12,0.65)",
        overlay: "0 0 0 1px #232833, 0 16px 40px -8px rgba(2,4,10,0.75)",
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
      },
      transitionDuration: { 120: "120ms", 180: "180ms" },
      keyframes: {
        fade: { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-out": { from: { opacity: "1" }, to: { opacity: "0" } },
        rise: { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        pop: { from: { opacity: "0", transform: "translateY(4px) scale(0.98)" }, to: { opacity: "1", transform: "translateY(0) scale(1)" } },
        "pop-out": { from: { opacity: "1", transform: "scale(1)" }, to: { opacity: "0", transform: "scale(0.98)" } },
        "slide-in": { from: { opacity: "0", transform: "translateX(12px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        "slide-out": { from: { opacity: "1", transform: "translateX(0)" }, to: { opacity: "0", transform: "translateX(12px)" } },
        "pulse-soft": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
        sweep: { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(250%)" } },
      },
      animation: {
        fade: "fade 160ms cubic-bezier(0.25,1,0.5,1) both",
        "fade-out": "fade-out 140ms cubic-bezier(0.25,1,0.5,1) both",
        rise: "rise 280ms cubic-bezier(0.25,1,0.5,1) both",
        pop: "pop 180ms cubic-bezier(0.25,1,0.5,1) both",
        "pop-out": "pop-out 140ms cubic-bezier(0.25,1,0.5,1) both",
        "slide-in": "slide-in 220ms cubic-bezier(0.25,1,0.5,1) both",
        "slide-out": "slide-out 160ms cubic-bezier(0.25,1,0.5,1) both",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        sweep: "sweep 1.4s cubic-bezier(0.4,0,0.2,1) infinite",
      },
    },
  },
  plugins: [],
};
