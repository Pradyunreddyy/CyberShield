const SEVERITY_STYLES = {
  critical: "bg-severity-critical/15 text-severity-critical border-severity-critical/30",
  high: "bg-severity-high/15 text-severity-high border-severity-high/30",
  medium: "bg-severity-medium/15 text-severity-medium border-severity-medium/30",
  low: "bg-severity-low/15 text-severity-low border-severity-low/30",
};

export function SeverityBadge({ severity }) {
  const key = (severity || "low").toLowerCase();
  const cls = SEVERITY_STYLES[key] || SEVERITY_STYLES.low;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-mono font-medium uppercase tracking-wide ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {key}
    </span>
  );
}

const STATUS_STYLES = {
  open: "bg-state-info/15 text-state-info border-state-info/30",
  investigating: "bg-severity-medium/15 text-severity-medium border-severity-medium/30",
  contained: "bg-severity-high/15 text-severity-high border-severity-high/30",
  resolved: "bg-state-success/15 text-state-success border-state-success/30",
  closed: "bg-ink-faint/15 text-ink-muted border-ink-faint/30",
  pending: "bg-ink-faint/15 text-ink-muted border-ink-faint/30",
  running: "bg-state-info/15 text-state-info border-state-info/30",
  completed: "bg-state-success/15 text-state-success border-state-success/30",
  failed: "bg-state-danger/15 text-state-danger border-state-danger/30",
};

export function StatusBadge({ status }) {
  const key = (status || "open").toLowerCase();
  const cls = STATUS_STYLES[key] || STATUS_STYLES.open;
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium capitalize ${cls}`}>
      {key.replace("_", " ")}
    </span>
  );
}

const RISK_STYLES = {
  safe: "bg-state-success/15 text-state-success border-state-success/30",
  low: "bg-severity-low/15 text-severity-low border-severity-low/30",
  medium: "bg-severity-medium/15 text-severity-medium border-severity-medium/30",
  high: "bg-severity-high/15 text-severity-high border-severity-high/30",
  critical: "bg-severity-critical/15 text-severity-critical border-severity-critical/30",
};

export function RiskBadge({ risk }) {
  const key = (risk || "safe").toLowerCase();
  const cls = RISK_STYLES[key] || RISK_STYLES.safe;
  return (
    <span className={`inline-flex items-center rounded border px-2.5 py-1 text-sm font-mono font-semibold uppercase tracking-wide ${cls}`}>
      {key}
    </span>
  );
}
