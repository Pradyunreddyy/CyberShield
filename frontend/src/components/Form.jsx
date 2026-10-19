import { useId, useState } from "react";
import { AlertCircle, ChevronDown, Eye, EyeOff } from "lucide-react";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  loading = false,
  disabled = false,
  children,
  ...props
}) {
  const base =
    "inline-flex select-none items-center justify-center gap-2 rounded-md font-medium " +
    "transition-[background-color,border-color,color,transform] duration-120 ease-out-quart " +
    "active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0";
  const sizes = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-sm", lg: "px-4 py-2.5 text-sm" };
  const variants = {
    // Fills that carry white text are the "strong" tokens (>= 4.5:1).
    primary: "bg-signal-strong text-white hover:bg-signal-strong-hover",
    secondary: "border border-hairline bg-panel-raised text-ink hover:border-ink-faint/50 hover:bg-hairline",
    danger: "bg-state-danger-strong text-white hover:bg-state-danger-strong-hover",
    ghost: "text-ink-muted hover:bg-panel-raised hover:text-ink",
  };
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      // Spread first so a caller's `disabled={false}` can never re-enable a
      // button that is mid-request.
      {...props}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
    >
      {loading && (
        <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

const controlBase =
  "w-full rounded-md border bg-well px-3 py-2 text-sm text-ink placeholder:text-ink-faint " +
  "transition-colors duration-120 hover:border-ink-faint/50 focus:border-signal " +
  "disabled:cursor-not-allowed disabled:opacity-60";

function controlClass(error, extra = "") {
  return `${controlBase} ${error ? "border-state-danger" : "border-hairline"} ${extra}`;
}

// Shared label / hint / error wiring so every control gets the same
// aria-describedby + aria-invalid behavior.
function useFieldIds(id) {
  const auto = useId();
  const fieldId = id || auto;
  return { fieldId, hintId: `${fieldId}-hint`, errorId: `${fieldId}-error` };
}

function FieldMessages({ error, hint, hintId, errorId }) {
  return (
    <>
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1 flex items-start gap-1 text-xs text-severity-critical">
          <AlertCircle size={12} aria-hidden="true" className="mt-px shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </>
  );
}

function FieldLabel({ label, htmlFor }) {
  if (!label) return null;
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-ink-muted">
      {label}
    </label>
  );
}

function describedBy(error, hint, ids) {
  return error ? ids.errorId : hint ? ids.hintId : undefined;
}

export function Input({ label, error, hint, className = "", wrapperClassName = "", id, ...props }) {
  const ids = useFieldIds(id);
  return (
    <div className={wrapperClassName}>
      <FieldLabel label={label} htmlFor={ids.fieldId} />
      <input
        id={ids.fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(error, hint, ids)}
        className={controlClass(error, className)}
        {...props}
      />
      <FieldMessages error={error} hint={hint} {...ids} />
    </div>
  );
}

// Password field with a show/hide toggle. Purely a client-side display
// affordance - it never changes what gets submitted. The toggle is a sibling
// of the input (not nested in the label), which is valid HTML.
export function PasswordInput({ label, error, hint, className = "", wrapperClassName = "", id, ...props }) {
  const [visible, setVisible] = useState(false);
  const ids = useFieldIds(id || props.name);
  return (
    <div className={wrapperClassName}>
      <FieldLabel label={label} htmlFor={ids.fieldId} />
      <div className="relative">
        <input
          id={ids.fieldId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(error, hint, ids)}
          className={controlClass(error, `pr-10 ${className}`)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-0 top-0 flex h-full w-10 items-center justify-center rounded-r-md text-ink-faint transition-colors duration-120 hover:text-ink focus-visible:text-ink"
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      <FieldMessages error={error} hint={hint} {...ids} />
    </div>
  );
}

export function Textarea({ label, error, hint, className = "", wrapperClassName = "", id, ...props }) {
  const ids = useFieldIds(id);
  return (
    <div className={wrapperClassName}>
      <FieldLabel label={label} htmlFor={ids.fieldId} />
      <textarea
        id={ids.fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(error, hint, ids)}
        className={controlClass(error, className)}
        {...props}
      />
      <FieldMessages error={error} hint={hint} {...ids} />
    </div>
  );
}

// Native <select> (keeps mobile pickers and keyboard behavior) with a drawn
// chevron so it matches the other controls instead of the OS arrow.
export function Select({ label, error, hint, className = "", wrapperClassName = "", id, children, ...props }) {
  const ids = useFieldIds(id);
  return (
    <div className={wrapperClassName}>
      <FieldLabel label={label} htmlFor={ids.fieldId} />
      <div className="relative">
        <select
          id={ids.fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(error, hint, ids)}
          className={controlClass(error, `appearance-none pr-9 ${className}`)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint"
        />
      </div>
      <FieldMessages error={error} hint={hint} {...ids} />
    </div>
  );
}
