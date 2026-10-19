import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { NavLink } from "react-router-dom";
import {
  ShieldAlert,
  LayoutDashboard,
  ListChecks,
  ScanSearch,
  BarChart3,
  Bell,
  UserCircle,
  Users,
  ScrollText,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

// Navigation items and role gates are unchanged from the previous version.
const PRIMARY_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/incidents", label: "Incidents", icon: ListChecks },
  { to: "/project-scanner", label: "Project Scanner", icon: ScanSearch },
  { to: "/analytics", label: "Analytics", icon: BarChart3, roles: ["analyst", "admin"] },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: UserCircle },
];

const ADMIN_ITEMS = [
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const isDesktop = () => window.matchMedia("(min-width: 1024px)").matches;

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { user } = useAuth();
  const closeRef = useRef(null);

  // Mobile drawer: Escape closes it, and focus moves into it when it opens.
  useEffect(() => {
    if (!mobileOpen) return undefined;
    // The drawer is still visibility:hidden for the first moments of its
    // slide-in, and hidden elements cannot take focus.
    const timer = setTimeout(() => closeRef.current?.focus(), 60);
    const onKey = (e) => e.key === "Escape" && onCloseMobile();
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 animate-fade bg-void/75 lg:hidden" onClick={onCloseMobile} aria-hidden="true" />
      )}

      <aside
        id="app-sidebar"
        aria-label="Sidebar"
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col overflow-hidden whitespace-nowrap border-r border-hairline bg-panel
          transition-[width,transform,visibility] duration-200 ease-out-quart
          ${mobileOpen ? "translate-x-0 visible" : "-translate-x-full invisible"}
          lg:visible lg:static lg:z-auto lg:translate-x-0
          ${collapsed ? "lg:w-[72px]" : "lg:w-60"}
        `}
      >
        {/* Brand + collapse control */}
        <div className={`flex min-h-14 shrink-0 items-center gap-2.5 border-b border-hairline px-3.5 py-2 ${collapsed ? "lg:flex-col lg:justify-center lg:gap-2 lg:px-0 lg:py-3" : ""}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-signal/15 text-signal ring-1 ring-signal/25">
            <ShieldAlert size={17} aria-hidden="true" />
          </div>
          <div className={`min-w-0 flex-1 leading-tight ${collapsed ? "lg:hidden" : ""}`}>
            <div className="truncate text-sm font-semibold tracking-tight text-ink">CyberShield</div>
            <div className="truncate text-2xs text-ink-faint">AI-Powered Security</div>
          </div>

          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors duration-120 hover:bg-panel-raised hover:text-ink lg:flex"
          >
            {collapsed ? <PanelLeftOpen size={16} aria-hidden="true" /> : <PanelLeftClose size={16} aria-hidden="true" />}
          </button>

          <button
            ref={closeRef}
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors duration-120 hover:bg-panel-raised hover:text-ink lg:hidden"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Primary" className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-4">
          <ul className="flex flex-col gap-0.5">
            {PRIMARY_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role)).map((item) => (
              <NavItem key={item.to} {...item} collapsed={collapsed} onNavigate={onCloseMobile} />
            ))}
          </ul>

          {user?.role === "admin" && (
            <div className="mt-6" role="group" aria-labelledby="nav-admin-label">
              <div id="nav-admin-label" className={`eyebrow mb-2 px-2.5 ${collapsed ? "lg:sr-only" : ""}`}>
                Administration
              </div>
              {collapsed && <div aria-hidden="true" className="mx-2 mb-2 hidden border-t border-hairline lg:block" />}
              <ul className="flex flex-col gap-0.5">
                {ADMIN_ITEMS.map((item) => (
                  <NavItem key={item.to} {...item} collapsed={collapsed} onNavigate={onCloseMobile} />
                ))}
              </ul>
            </div>
          )}
        </nav>

        <div className={`shrink-0 border-t border-hairline px-4 py-3 ${collapsed ? "lg:text-center" : ""}`}>
          <p className={`eyebrow ${collapsed ? "lg:sr-only" : ""}`}>Signed in as</p>
          <p className="mt-0.5 truncate font-mono text-xs capitalize text-ink-muted">
            <span className={collapsed ? "lg:sr-only" : ""}>{user?.role}</span>
            <span aria-hidden="true" className={`hidden ${collapsed ? "lg:inline" : ""}`}>
              {user?.role?.[0]?.toUpperCase()}
            </span>
          </p>
        </div>
      </aside>
    </>
  );
}

function NavItem({ to, label, icon: Icon, collapsed, onNavigate }) {
  const ref = useRef(null);
  const [tip, setTip] = useState(null);

  // The collapsed rail shows a label tooltip on hover AND keyboard focus. It is
  // portaled with fixed positioning because the nav clips its own overflow.
  const showTip = () => {
    if (!collapsed || !isDesktop() || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setTip({ top: r.top + r.height / 2, left: r.right + 10 });
  };
  const hideTip = () => setTip(null);

  useEffect(() => {
    if (!collapsed) setTip(null);
  }, [collapsed]);

  return (
    <li>
      <NavLink
        ref={ref}
        to={to}
        onClick={() => {
          hideTip();
          onNavigate?.();
        }}
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        onFocus={showTip}
        onBlur={hideTip}
        className={({ isActive }) =>
          `flex h-10 items-center gap-3 rounded-md px-2.5 text-sm font-medium transition-colors duration-120 ${
            collapsed ? "lg:justify-center lg:px-0" : ""
          } ${isActive ? "bg-signal/12 text-signal" : "text-ink-muted hover:bg-panel-raised hover:text-ink"}`
        }
      >
        <Icon size={17} className="shrink-0" aria-hidden="true" />
        {/* Kept in the DOM when collapsed (screen-reader only) so the link always has a name. */}
        <span className={collapsed ? "lg:sr-only" : ""}>{label}</span>
      </NavLink>

      {tip &&
        createPortal(
          <span
            aria-hidden="true"
            style={{ top: tip.top, left: tip.left }}
            className="pointer-events-none fixed z-[60] hidden -translate-y-1/2 animate-fade whitespace-nowrap rounded-md bg-panel-raised px-2.5 py-1.5 text-xs font-medium text-ink shadow-overlay lg:block"
          >
            {label}
          </span>,
          document.body
        )}
    </li>
  );
}
