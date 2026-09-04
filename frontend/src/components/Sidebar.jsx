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

export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-hairline bg-panel">
      <div className="flex items-center gap-2.5 border-b border-hairline px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-signal/15 text-signal">
          <ShieldAlert size={17} />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-ink">Sentinel SOC</div>
          <div className="text-[11px] text-ink-faint">Incident Response Platform</div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-4">
        {PRIMARY_ITEMS.filter((item) => !item.roles || item.roles.includes(user?.role)).map((item) => (
          <NavItem key={item.to} {...item} />
        ))}

        {user?.role === "admin" && (
          <>
            <div className="mt-5 mb-1.5 px-2.5 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
              Administration
            </div>
            {ADMIN_ITEMS.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </>
        )}
      </nav>

      <div className="border-t border-hairline px-4 py-3 text-[11px] text-ink-faint">
        Role: <span className="font-mono text-ink-muted capitalize">{user?.role}</span>
      </div>
    </aside>
  );
}

function NavItem({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
          isActive ? "bg-signal/12 text-signal" : "text-ink-muted hover:bg-panel-raised hover:text-ink"
        }`
      }
    >
      <Icon size={16} />
      {label}
    </NavLink>
  );
}
