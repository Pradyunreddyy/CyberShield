import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

const ACCENTS = {
  signal: { chip: "text-signal-bright bg-signal/12", value: "text-ink" },
  danger: { chip: "text-severity-critical bg-severity-critical/12", value: "text-severity-critical" },
  warning: { chip: "text-severity-high bg-severity-high/12", value: "text-severity-high" },
  success: { chip: "text-state-success bg-state-success/12", value: "text-ink" },
  violet: { chip: "text-violet-bright bg-violet/12", value: "text-ink" },
  muted: { chip: "text-ink-muted bg-ink-faint/12", value: "text-ink" },
};

// `emphasis="primary"` is for the few numbers an analyst reads first. The value
// only takes the severity colour when non-zero, so "0 critical" reads as calm.
// `to` makes the whole card a link (e.g. to a pre-filtered list).
export function StatCard({ label, value, icon: Icon, accent = "signal", sublabel, emphasis = "default", to }) {
  const a = ACCENTS[accent] || ACCENTS.signal;
  const isPrimary = emphasis === "primary";
  const numeric = typeof value === "number" ? value : Number(value);
  const colorize = isPrimary && Number.isFinite(numeric) && numeric > 0;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-ink-muted">{label}</span>
        {Icon && (
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1 ring-hairline ${a.chip}`}>
            <Icon size={15} aria-hidden="true" />
          </div>
        )}
      </div>
      <div className={`tnum mt-2.5 font-mono font-semibold ${isPrimary ? "text-3xl" : "text-2xl"} ${colorize ? a.value : "text-ink"}`}>{value}</div>
      {sublabel && <div className="mt-1 text-xs text-ink-muted">{sublabel}</div>}
    </>
  );

  const shell = `group relative block rounded-lg glass ${isPrimary ? "p-5" : "p-4"}`;

  if (to) {
    return (
      <Link to={to} className={`${shell} interactive-card`}>
        {body}
        <ArrowUpRight
          size={13}
          aria-hidden="true"
          className="absolute bottom-3.5 right-3.5 text-ink-faint opacity-0 transition-opacity duration-120 group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}
