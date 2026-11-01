// Decorative lighting behind the interface. Purely visual: aria-hidden, not
// focusable, never intercepts pointer events. Orbs are radial gradients (no CSS
// blur filter), only `transform` animates, and the drift is disabled on phones
// and under prefers-reduced-motion (see index.css).
export function AmbientBackground({ variant = "app" }) {
  if (variant === "auth") {
    // Sizes use clamp() so phones get orbs larger than the viewport (the light
    // actually reaches the screen) while desktops cap at a calm size.
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb orb-blue animate-drift-a -left-[22%] -top-[12%] h-[clamp(480px,78vw,780px)] w-[clamp(480px,78vw,780px)] sm:-left-[18%] sm:-top-[26%]" />
        <div className="orb orb-violet animate-drift-b -bottom-[8%] -right-[34%] h-[clamp(520px,84vw,840px)] w-[clamp(520px,84vw,840px)] sm:-bottom-[30%] sm:-right-[16%]" />
        <div className="orb orb-teal left-1/2 top-[2%] h-[clamp(300px,46vw,460px)] w-[clamp(300px,46vw,460px)] -translate-x-1/2 sm:left-[34%] sm:top-[8%] sm:translate-x-0" />
        {/* Faint vignette keeps the edges of the viewport calm. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgb(var(--c-midnight)/0.7)_100%)]" />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="orb orb-blue -left-[10%] -top-[22%] h-[min(60vw,720px)] w-[min(60vw,720px)] opacity-[0.55]" />
      <div className="orb orb-violet -bottom-[26%] -right-[8%] h-[min(64vw,780px)] w-[min(64vw,780px)] opacity-[0.45]" />
    </div>
  );
}
