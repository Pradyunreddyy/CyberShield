import { useEffect, useId, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, ChevronRight, LogOut, Menu, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { alertsApi } from "../api/endpoints";
import { useExitTransition } from "../hooks/useExitTransition";
import { IconButton } from "./Form";

export function TopBar({ crumbs = [], onOpenMobileNav, menuButtonRef }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const { mounted: menuMounted, state: menuState } = useExitTransition(menuOpen, 140);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    let mounted = true;
    alertsApi
      .list({ unread_only: true })
      .then((res) => mounted && setUnreadCount(res.data.length))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  // Focus the first item when the menu opens.
  useEffect(() => {
    if (menuOpen) wrapRef.current?.querySelector('[role="menuitem"]')?.focus();
  }, [menuOpen]);

  function closeMenu(returnFocus = true) {
    setMenuOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function onMenuKeyDown(e) {
    const items = [...wrapRef.current.querySelectorAll('[role="menuitem"]')];
    const i = items.indexOf(document.activeElement);
    if (e.key === "Escape") {
      e.preventDefault();
      closeMenu();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(i + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(i - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Tab") {
      closeMenu(false);
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-hairline bg-panel/40 px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <IconButton ref={menuButtonRef} label="Open navigation menu" aria-controls="app-sidebar" onClick={onOpenMobileNav} className="-ml-1.5 lg:hidden">
          <Menu size={19} aria-hidden="true" />
        </IconButton>

        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex min-w-0 items-center gap-1.5 text-sm">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={`${c.label}-${i}`} className={`flex min-w-0 items-center gap-1.5 ${last ? "" : "hidden sm:flex"}`}>
                  {c.to && !last ? (
                    <Link to={c.to} className="truncate rounded text-ink-muted transition-colors duration-120 hover:text-ink">
                      {c.label}
                    </Link>
                  ) : (
                    <span className={`truncate ${last ? "font-medium text-ink" : "text-ink-muted"}`} aria-current={last ? "page" : undefined}>
                      {c.label}
                    </span>
                  )}
                  {!last && <ChevronRight size={13} aria-hidden="true" className="shrink-0 text-ink-faint" />}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <div className="relative">
          <IconButton
            label={unreadCount > 0 ? `View alerts, ${unreadCount} unread` : "View alerts"}
            onClick={() => navigate("/alerts", { state: { openedFromDashboardBell: true } })}
          >
            <Bell size={18} aria-hidden="true" />
          </IconButton>
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="tnum pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-state-danger-strong px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-void"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>

        <div className="relative" ref={wrapRef}>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex h-10 items-center gap-2 rounded-md px-2 text-sm text-ink transition-colors duration-120 hover:bg-white/[0.06]"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-controls={menuMounted ? menuId : undefined}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-signal-bright ring-1 ring-signal/30">
              <User size={15} aria-hidden="true" />
            </span>
            <span className="hidden max-w-[140px] truncate sm:inline">{user?.full_name}</span>
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={`text-ink-muted transition-transform duration-180 ease-out-quart ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuMounted && (
            <div
              id={menuId}
              role="menu"
              aria-label="Account"
              data-state={menuState}
              onKeyDown={onMenuKeyDown}
              className="exit-pop glass-strong glass-blur absolute right-0 top-full z-50 mt-2 w-64 origin-top-right animate-pop rounded-xl py-1.5"
            >
              <div className="border-b border-hairline px-3.5 py-3">
                <p className="truncate text-sm font-medium text-ink">{user?.full_name}</p>
                <p className="truncate text-xs text-ink-muted">{user?.email}</p>
                <p className="mt-2 inline-block rounded border border-hairline-strong px-1.5 py-0.5 font-mono text-2xs capitalize text-ink-muted">{user?.role}</p>
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu(false);
                  navigate("/profile");
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-ink-muted transition-colors duration-120 hover:bg-white/[0.06] hover:text-ink focus-visible:bg-white/[0.06] focus-visible:text-ink"
              >
                <User size={15} aria-hidden="true" /> Profile
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={logout}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-severity-critical transition-colors duration-120 hover:bg-white/[0.06] focus-visible:bg-white/[0.06]"
              >
                <LogOut size={15} aria-hidden="true" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
