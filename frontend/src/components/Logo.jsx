import mark109 from "../assets/brand/cybershield-mark-109.png";
import mark218 from "../assets/brand/cybershield-mark-218.png";

// The official CyberShield shield-and-checkmark. It is only ever scaled
// proportionally (w:h of every raster is exactly the artwork's 380:436 crop,
// fixed aspect ratio + object-fit: contain) and never
// recoloured, filtered or masked. Two pre-sized rasters keep small placements
// light and large ones sharp.
const MARKS = {
  nav: { src: mark109, w: 95, h: 109 }, // sidebar / top bar, displayed ~36-44px tall
  auth: { src: mark218, w: 190, h: 218 }, // login / register, displayed ~88-104px tall
};

export function LogoMark({ variant = "nav", height = 36, alt = "", className = "" }) {
  const m = MARKS[variant];
  return (
    <img
      src={m.src}
      alt={alt}
      width={Math.round((height * m.w) / m.h)}
      height={height}
      decoding="async"
      draggable="false"
      className={`block shrink-0 select-none object-contain ${className}`}
      // width:auto lets the fixed aspect ratio derive the width from the height, so the
      // mark can never be stretched by the width attribute or a parent.
      style={{ height, width: "auto", aspectRatio: `${m.w} / ${m.h}` }}
    />
  );
}

// Wordmark: the display face, with "Shield" picking up the brand gradient.
export function Wordmark({ className = "" }) {
  return (
    <span className={`font-display font-semibold tracking-tight text-ink ${className}`}>
      Cyber<span className="bg-brand-text bg-clip-text text-transparent">Shield</span>
    </span>
  );
}

// Mark + wordmark lockup. `collapsed` shows the mark alone (with an accessible name).
export function BrandLockup({ collapsed = false, tagline, markHeight = 36, wordmarkClass = "text-base" }) {
  if (collapsed) return <LogoMark height={markHeight} alt="CyberShield" />;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <LogoMark height={markHeight} />
      <div className="min-w-0 leading-tight">
        <Wordmark className={`block truncate ${wordmarkClass}`} />
        {tagline && <span className="block truncate text-2xs text-ink-faint">{tagline}</span>}
      </div>
    </div>
  );
}
