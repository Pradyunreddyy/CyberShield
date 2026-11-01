/** @type {import('tailwindcss').Config} */

// Colours are CSS variables (RGB triplets, defined in src/index.css) so the
// whole palette lives in one place AND Tailwind opacity modifiers keep working
// (bg-signal/10, border-hairline/50, ...). `a` is the default alpha for tokens
// that are translucent by nature (borders, dividers).
const rgb =
  (name, a = 1) =>
  ({ opacityValue }) => {
    // With no modifier (e.g. `border-hairline`) Tailwind passes the *string*
    // "var(--tw-border-opacity, 1)" rather than undefined; treat that as "use the
    // token's own default alpha". An explicit modifier (`/50`) arrives as a number.
    const explicit = opacityValue !== undefined && !String(opacityValue).includes("var(");
    return `rgb(var(${name}) / ${explicit ? opacityValue : a})`;
  };

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Surfaces (brand: Midnight Navy #080D1A, Deep Navy #111C32)
        void: rgb("--c-midnight"),
        panel: rgb("--c-navy"),
        "panel-raised": rgb("--c-navy-raised"),
        well: rgb("--c-well"), // inset surfaces: inputs, code, log output
        // Borders / dividers are translucent, so they read on any surface.
        hairline: rgb("--c-line", 0.14),
        "hairline-soft": rgb("--c-line", 0.08),
        "hairline-strong": rgb("--c-line", 0.26),
        // Text (all >= 4.5:1 on midnight, glass and raised surfaces)
        ink: rgb("--c-ink"),
        "ink-muted": rgb("--c-ink-muted"),
        "ink-faint": rgb("--c-ink-faint"),
        // Electric Blue #398BFF. Raw = text/icons/glows; `strong` = fill behind white text.
        signal: {
          DEFAULT: rgb("--c-blue"),
          dim: rgb("--c-blue-dim"),
          bright: rgb("--c-blue-bright"),
          strong: rgb("--c-blue-strong"),
          "strong-hover": rgb("--c-blue-strong-hover"),
        },
        // Violet #9875FF, same split.
        violet: {
          DEFAULT: rgb("--c-violet"),
          bright: rgb("--c-violet-bright"),
          strong: rgb("--c-violet-strong"),
        },
        severity: {
          critical: rgb("--c-sev-critical"),
          high: rgb("--c-sev-high"),
          medium: rgb("--c-sev-medium"),
          low: rgb("--c-sev-low"),
        },
        state: {
          success: rgb("--c-success"),
          warning: rgb("--c-sev-medium"),
          danger: rgb("--c-sev-critical"),
          "danger-strong": rgb("--c-danger-strong"),
          "danger-strong-hover": rgb("--c-danger-strong-hover"),
          info: rgb("--c-blue"),
        },
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "ui-sans-serif", "system-ui", "-apple-system", "'Segoe UI'", "sans-serif"],
        // Display face for titles, the wordmark and key figures.
        display: ["Sora", "'IBM Plex Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.625rem", letterSpacing: "-0.005em" }],
        xl: ["1.375rem", { lineHeight: "1.75rem", letterSpacing: "-0.012em" }],
        "2xl": ["1.75rem", { lineHeight: "2.125rem", letterSpacing: "-0.018em" }],
        "3xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.022em" }],
      },
      // One radius scale, applied everywhere through the existing class names.
      borderRadius: {
        md: "0.625rem", // controls: inputs, buttons, list rows
        lg: "0.875rem", // cards and panels
        xl: "1.125rem", // overlays, auth card
        "2xl": "1.5rem",
      },
      boxShadow: {
        // Shadows are tinted toward the navy surface, never neutral grey.
        panel: "inset 0 1px 0 0 rgb(255 255 255 / 0.05), 0 12px 32px -18px rgb(2 5 14 / 0.8)",
        raised: "inset 0 1px 0 0 rgb(255 255 255 / 0.06), 0 18px 44px -18px rgb(2 5 14 / 0.85)",
        overlay: "0 0 0 1px rgb(var(--c-line) / 0.2), 0 28px 70px -18px rgb(2 5 14 / 0.9)",
        "glow-blue": "0 0 0 1px rgb(57 139 255 / 0.45), 0 10px 32px -8px rgb(57 139 255 / 0.5)",
        "glow-violet": "0 0 0 1px rgb(152 117 255 / 0.45), 0 10px 32px -8px rgb(152 117 255 / 0.5)",
        "focus-glow": "0 0 0 4px rgb(57 139 255 / 0.16)",
      },
      backgroundImage: {
        brand: "linear-gradient(120deg, rgb(var(--c-blue-strong)) 0%, rgb(var(--c-violet-strong)) 100%)",
        "brand-soft": "linear-gradient(120deg, rgb(57 139 255 / 0.16), rgb(152 117 255 / 0.16))",
        "brand-text": "linear-gradient(120deg, #8DBBFF 0%, #C2B2FF 100%)",
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: { 120: "120ms", 180: "180ms", 260: "260ms" },
      keyframes: {
        fade: { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-out": { from: { opacity: "1" }, to: { opacity: "0" } },
        rise: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "page-in": { from: { opacity: "0", transform: "translateY(6px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        pop: { from: { opacity: "0", transform: "translateY(6px) scale(0.97)" }, to: { opacity: "1", transform: "translateY(0) scale(1)" } },
        "pop-out": { from: { opacity: "1", transform: "scale(1)" }, to: { opacity: "0", transform: "scale(0.97)" } },
        "slide-in": { from: { opacity: "0", transform: "translateX(14px)" }, to: { opacity: "1", transform: "translateX(0)" } },
        "slide-out": { from: { opacity: "1", transform: "translateX(0)" }, to: { opacity: "0", transform: "translateX(14px)" } },
        "pulse-soft": { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.4" } },
        sweep: { from: { transform: "translateX(-100%)" }, to: { transform: "translateX(250%)" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
        // Ambient light drifts a short distance only (transform-only, GPU-friendly).
        "drift-a": { "0%,100%": { transform: "translate3d(0,0,0) scale(1)" }, "50%": { transform: "translate3d(4%,6%,0) scale(1.08)" } },
        "drift-b": { "0%,100%": { transform: "translate3d(0,0,0) scale(1)" }, "50%": { transform: "translate3d(-5%,-4%,0) scale(1.1)" } },
      },
      animation: {
        fade: "fade 180ms cubic-bezier(0.25,1,0.5,1) both",
        "fade-out": "fade-out 140ms cubic-bezier(0.25,1,0.5,1) both",
        rise: "rise 360ms cubic-bezier(0.16,1,0.3,1) both",
        // `backwards`, not `both`: no lingering transform once finished, so the
        // page wrapper never becomes a containing block for fixed descendants.
        "page-in": "page-in 340ms cubic-bezier(0.16,1,0.3,1) backwards",
        pop: "pop 200ms cubic-bezier(0.16,1,0.3,1) both",
        "pop-out": "pop-out 140ms cubic-bezier(0.25,1,0.5,1) both",
        "slide-in": "slide-in 240ms cubic-bezier(0.16,1,0.3,1) both",
        "slide-out": "slide-out 160ms cubic-bezier(0.25,1,0.5,1) both",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        sweep: "sweep 1.4s cubic-bezier(0.4,0,0.2,1) infinite",
        shimmer: "shimmer 2.4s linear infinite",
        "drift-a": "drift-a 26s ease-in-out infinite",
        "drift-b": "drift-b 32s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
