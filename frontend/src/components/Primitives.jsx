export function Panel({ title, action, children, className = "" }) {
  return (
    <div className={`rounded-lg border border-hairline bg-panel shadow-panel ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          {title && <h3 className="text-sm font-semibold text-ink">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {Icon && (
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-panel-raised text-ink-faint">
          <Icon size={20} />
        </div>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-md bg-panel-raised ${className}`} />;
}

export function SkeletonRows({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((__, c) => (
            <SkeletonBlock key={c} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="rounded-md border border-state-danger/30 bg-state-danger/10 px-4 py-3 text-sm text-severity-critical">
      {message}
    </div>
  );
}
