import { useId } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

export function Panel({ title, description, action, children, className = "", bodyClassName = "p-4 sm:p-5" }) {
  const headingId = useId();
  return (
    <section aria-labelledby={title ? headingId : undefined} className={`glass rounded-lg ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title && (
              <h2 id={headingId} className="text-sm font-semibold text-ink">
                {title}
              </h2>
            )}
            {description && <p className="mt-0.5 text-xs text-ink-muted">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

// The page's <h1>. Every routed page starts with one so heading levels run
// h1 -> h2 (Panel) without skipping, and so actions have a consistent home.
export function PageHeader({ title, description, actions, eyebrow, className = "" }) {
  return (
    <header className={`mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3 ${className}`}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-xl font-semibold text-ink sm:text-2xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      {Icon && (
        <div className="mb-1.5 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-signal-bright ring-1 ring-hairline-strong">
          <Icon size={20} aria-hidden="true" />
        </div>
      )}
      <p className="text-sm font-medium text-ink">{title}</p>
      {description && <p className="max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function SkeletonBlock({ className = "" }) {
  return <div aria-hidden="true" className={`skeleton rounded-md ${className}`} />;
}

export function SkeletonRows({ rows = 5, cols = 4 }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading">
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

// Small inline loading indicator. Kept animated under reduced motion on purpose:
// it is feedback that work is in progress, not decoration.
export function Spinner({ size = 16, className = "" }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

// `message` alone keeps every existing call site working. Pass `onRetry` to give
// the user a way forward instead of a dead end.
export function ErrorState({ message, title, onRetry, retryLabel = "Try again" }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-md border border-state-danger/30 bg-state-danger/10 px-4 py-3">
      <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-severity-critical" />
      <div className="min-w-0 flex-1">
        {title && <p className="text-sm font-medium text-ink">{title}</p>}
        <p className={`text-sm ${title ? "mt-0.5 text-ink-muted" : "text-ink"}`}>{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-secondary flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors duration-120"
        >
          <RotateCw size={12} aria-hidden="true" />
          {retryLabel}
        </button>
      )}
    </div>
  );
}
