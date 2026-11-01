import { forwardRef, useId, useState } from "react";
import { AlertCircle, ChevronDown, Eye, EyeOff, Search } from "lucide-react";

const BUTTON_BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-md font-medium " +
  "transition-[background-color,border-color,color,transform,box-shadow] duration-120 ease-out-quart " +
  "active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0";
const BUTTON_VARIANTS = { primary: "btn-primary", secondary: "btn-secondary", danger: "btn-danger", ghost: "btn-ghost" };
const BUTTON_SIZES = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-sm", lg: "px-4 py-3 text-base" };

export function Button({ variant = "primary", size = "md", className = "", loading = false, disabled = false, children, ...props }) {
  return (
    <button
      className={`${BUTTON_BASE} ${BUTTON_SIZES[size]} ${BUTTON_VARIANTS[variant]} ${className}`}
      // Spread first so a caller's `disabled={false}` can never re-enable a
      // button that is mid-request.
      {...props}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
    >
      {loading && <span aria-hidden="true" className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

// Square icon-only button. `label` is required: it is the accessible name.
export const IconButton = forwardRef(function IconButton({ label, variant = "ghost", size = "md", className = "", children, ...props }, ref) {
  const sizes = { sm: "h-8 w-8", md: "h-9 w-9", lg: "h-11 w-11" };
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={`${BUTTON_BASE} shrink-0 ${sizes[size]} ${BUTTON_VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

// ---- Field controls -------------------------------------------------------
const CONTROL_BASE =
  "w-full rounded-md border bg-well/70 text-ink placeholder:text-ink-faint " +
  "transition-[border-color,box-shadow,background-color] duration-180 ease-out-quart " +
  "hover:border-hairline-strong focus:border-signal/70 focus:bg-well focus:shadow-focus-glow " +
  "disabled:cursor-not-allowed disabled:opacity-60";
// `lg` is the comfortable touch size at every width (48px tall; 16px text also
// stops iOS zooming on focus).
const CONTROL_SIZES = { md: "px-3 py-2 text-sm", lg: "px-3.5 py-3 text-base" };

function controlClass(error, size, extra = "") {
  return `${CONTROL_BASE} ${CONTROL_SIZES[size]} ${error ? "border-state-danger" : "border-hairline"} ${extra}`;
}

function useFieldIds(id) {
  const auto = useId();
  const fieldId = id || auto;
  return { fieldId, hintId: `${fieldId}-hint`, errorId: `${fieldId}-error` };
}

function FieldMessages({ error, hint, hintId, errorId }) {
  return (
    <>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 flex items-start gap-1 text-xs text-severity-critical">
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

const describedBy = (error, hint, ids) => (error ? ids.errorId : hint ? ids.hintId : undefined);

export function Input({ label, error, hint, size = "md", className = "", wrapperClassName = "", id, ...props }) {
  const ids = useFieldIds(id);
  return (
    <div className={wrapperClassName}>
      <FieldLabel label={label} htmlFor={ids.fieldId} />
      <input
        id={ids.fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(error, hint, ids)}
        className={controlClass(error, size, className)}
        {...props}
      />
      <FieldMessages error={error} hint={hint} {...ids} />
    </div>
  );
}

// Search field: icon + input in one reusable piece (was re-implemented per page).
export function SearchInput({ wrapperClassName = "", className = "", ...props }) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      <Input type="search" className={`pl-9 ${className}`} {...props} />
    </div>
  );
}

// Password field with a show/hide toggle. Purely a display affordance; it never
// changes what gets submitted. The toggle is a sibling of the input (not nested
// in the label), which is valid HTML.
export function PasswordInput({ label, error, hint, size = "md", className = "", wrapperClassName = "", id, ...props }) {
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
          className={controlClass(error, size, `pr-11 ${className}`)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-0 top-0 flex h-full w-11 items-center justify-center rounded-r-md text-ink-faint transition-colors duration-120 hover:text-ink focus-visible:text-ink"
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
      <FieldMessages error={error} hint={hint} {...ids} />
    </div>
  );
}

export function Textarea({ label, error, hint, size = "md", className = "", wrapperClassName = "", id, ...props }) {
  const ids = useFieldIds(id);
  return (
    <div className={wrapperClassName}>
      <FieldLabel label={label} htmlFor={ids.fieldId} />
      <textarea
        id={ids.fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(error, hint, ids)}
        className={controlClass(error, size, className)}
        {...props}
      />
      <FieldMessages error={error} hint={hint} {...ids} />
    </div>
  );
}

// Native <select> (keeps mobile pickers and keyboard behaviour) with a drawn
// chevron so it matches the other controls instead of the OS arrow.
export function Select({ label, error, hint, size = "md", className = "", wrapperClassName = "", id, children, ...props }) {
  const ids = useFieldIds(id);
  return (
    <div className={wrapperClassName}>
      <FieldLabel label={label} htmlFor={ids.fieldId} />
      <div className="relative">
        <select
          id={ids.fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(error, hint, ids)}
          className={controlClass(error, size, `appearance-none pr-9 ${className}`)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown size={14} aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" />
      </div>
      <FieldMessages error={error} hint={hint} {...ids} />
    </div>
  );
}
