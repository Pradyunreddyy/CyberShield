export function Button({ variant = "primary", size = "md", className = "", loading, children, ...props }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const sizes = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-sm", lg: "px-4 py-2.5 text-sm" };
  const variants = {
    primary: "bg-signal text-white hover:bg-signal-bright",
    secondary: "bg-panel-raised text-ink border border-hairline hover:bg-hairline-soft",
    danger: "bg-severity-critical text-white hover:brightness-110",
    ghost: "text-ink-muted hover:text-ink hover:bg-panel-raised",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function Input({ label, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</span>}
      <input
        className={`w-full rounded-md border border-hairline bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-signal ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-severity-critical">{error}</span>}
    </label>
  );
}

export function Textarea({ label, error, className = "", ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</span>}
      <textarea
        className={`w-full rounded-md border border-hairline bg-panel px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-signal ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs text-severity-critical">{error}</span>}
    </label>
  );
}

export function Select({ label, error, className = "", children, ...props }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</span>}
      <select
        className={`w-full rounded-md border border-hairline bg-panel px-3 py-2 text-sm text-ink focus:border-signal ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs text-severity-critical">{error}</span>}
    </label>
  );
}
