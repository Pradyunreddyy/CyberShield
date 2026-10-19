import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useExitTransition } from "../hooks/useExitTransition";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, title, children, footer, width = "max-w-lg" }) {
  const { mounted, state } = useExitTransition(open, 140);
  const dialogRef = useRef(null);
  const bodyRef = useRef(null);
  const returnFocusTo = useRef(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Move focus in on open; hand it back to whatever opened the dialog on close.
  useEffect(() => {
    if (!open) return undefined;
    returnFocusTo.current = document.activeElement;
    const raf = requestAnimationFrame(() => {
      const preferred = bodyRef.current?.querySelector('[data-autofocus], input:not([type="hidden"]), select, textarea');
      (preferred || dialogRef.current)?.focus();
    });
    return () => {
      cancelAnimationFrame(raf);
      const el = returnFocusTo.current;
      if (el && document.contains(el)) el.focus();
    };
  }, [open]);

  // Escape closes; Tab is trapped inside the dialog.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const items = [...dialogRef.current.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!mounted) return null;

  // Portaled to <body>: an animated ancestor's transform would otherwise
  // become the containing block for `position: fixed` and shrink the overlay.
  return createPortal(
    <div
      data-state={state}
      className="exit-fade fixed inset-0 z-40 flex items-end justify-center bg-void/75 px-4 py-6 animate-fade sm:items-center"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-state={state}
        className={`exit-pop flex max-h-full w-full ${width} flex-col rounded-lg bg-panel-raised shadow-overlay animate-pop focus:outline-none`}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
          <h2 id={titleId} className="text-sm font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-120 hover:bg-hairline hover:text-ink"
            aria-label="Close dialog"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div ref={bodyRef} className="min-h-0 overflow-y-auto px-5 py-4">
          {children}
        </div>
        {footer && <div className="flex shrink-0 justify-end gap-2 border-t border-hairline px-5 py-3.5">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
