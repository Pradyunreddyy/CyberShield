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
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

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

export function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile }) {
  const { user } = useAuth();

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onCloseMobile} aria-hidden="true" />
      )}
      <aside
        className={`
          flex h-full shrink-0 flex-col border-r border-hairline bg-panel
          transition-[width,transform] duration-200 ease-in-out
          fixed inset-y-0 left-0 z-50 w-60
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:static lg:z-auto lg:translate-x-0
          ${collapsed ? "lg:w-[72px]" : "lg:w-60"}
        `}
      >
        <div className={`flex items-center gap-2.5 border-b border-hairline px-4 py-4 ${collapsed ? "lg:justify-center lg:px-0" : ""}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-signal/15 text-signal"><ShieldAlert size={17} /></div>
          <div className={`min-w-0 flex-1 leading-tight ${collapsed ? "lg:hidden" : ""}`}>
            <div className="truncate text-sm font-semibold text-ink">CyberShield</div>
            <div className="truncate text-[11px] text-ink-faint">AI-Powered Security</div>
          </div>
          <button onClick={onToggleCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="hidden shrink-0 items-center justify-center rounded-md p-1.5 text-ink-faint transition-colors hover:bg-panel-raised hover:text-ink lg:flex">
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
          <button onClick={onCloseMobile} aria-label="Close navigation menu" className="flex shrink-0 items-center justify-center rounded-md p-1.5 text-ink-faint transition-colors hover:bg-panel-raised hover:text-ink lg:hidden"><X size={16} /></button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2.5 py-4">
          {PRIMARY_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role)).map((item) => <NavItem key={item.to} {...item} collapsed={collapsed} onNavigate={onCloseMobile} />)}
          {user?.role === "admin" && <>
            <div className={`mt-5 mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint ${collapsed ? "lg:hidden" : ""}`}>Administration</div>
            {collapsed && <div className="mx-2.5 mt-5 mb-1.5 hidden border-t border-hairline-soft lg:block" />}
            {ADMIN_ITEMS.map((item) => <NavItem key={item.to} {...item} collapsed={collapsed} onNavigate={onCloseMobile} />)}
          </>}
        </nav>
        <div className={`border-t border-hairline px-4 py-3 text-[11px] text-ink-faint ${collapsed ? "lg:px-0 lg:text-center" : ""}`} title={collapsed ? `Role: ${user?.role}` : undefined}>
          <span className={collapsed ? "lg:hidden" : ""}>Role: <span className="font-mono text-ink-muted capitalize">{user?.role}</span></span>
          <span className={`hidden font-mono uppercase text-ink-muted ${collapsed ? "lg:inline" : ""}`}>{user?.role?.[0]}</span>
        </div>
      </aside>
    </>
  );
}

function NavItem({ to, label, icon: Icon, collapsed, onNavigate }) {
  return <NavLink to={to} onClick={onNavigate} className={({ isActive }) => `group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${collapsed ? "lg:justify-center" : ""} ${isActive ? "bg-signal/12 text-signal" : "text-ink-muted hover:bg-panel-raised hover:text-ink"}`}>
    <Icon size={16} className="shrink-0" /><span className={collapsed ? "lg:hidden" : ""}>{label}</span>
    {collapsed && <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-hairline bg-panel-raised px-2.5 py-1.5 text-xs font-medium text-ink opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100 lg:block">{label}</span>}
  </NavLink>;
}
