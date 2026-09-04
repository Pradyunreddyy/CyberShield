export function StatCard({ label, value, icon: Icon, accent = "signal", sublabel }) {
  const accentClasses = {
    signal: "text-signal bg-signal/10",
    danger: "text-severity-critical bg-severity-critical/10",
    warning: "text-severity-high bg-severity-high/10",
    success: "text-state-success bg-state-success/10",
    muted: "text-ink-muted bg-ink-faint/10",
  }[accent];

  return (
    <div className="rounded-lg border border-hairline bg-panel p-4 shadow-panel">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
        {Icon && (
          <div className={`flex h-7 w-7 items-center justify-center rounded-md ${accentClasses}`}>
            <Icon size={15} />
          </div>
        )}
      </div>
      <div className="mt-2 font-mono text-2xl font-semibold text-ink">{value}</div>
      {sublabel && <div className="mt-1 text-xs text-ink-faint">{sublabel}</div>}
    </div>
  );
}
