import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { TopBar } from "../components/TopBar";

const SIDEBAR_COLLAPSED_KEY = "cybershield:sidebar-collapsed";
const TITLES = {
  "/dashboard": "Security Dashboard",
  "/incidents": "Incidents",
  "/project-scanner": "Project Security Analyzer",
  "/analytics": "Analytics",
  "/alerts": "Alerts",
  "/profile": "Profile",
  "/admin/users": "User Management",
  "/admin/audit-logs": "Audit Logs",
  "/admin/settings": "Platform Settings",
};
function resolveTitle(pathname) {
  if (TITLES[pathname]) return TITLES[pathname];
  if (pathname.startsWith("/incidents/")) return pathname.endsWith("/create") ? "Report Incident" : "Incident Details";
  if (pathname.startsWith("/project-scanner/")) return "Scan Details";
  return "CyberShield";
}
export function DashboardLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true"; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed)); } catch {} }, [collapsed]);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  return <div className="flex h-screen w-full overflow-hidden bg-void">
    <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((v) => !v)} mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
    <div className="flex min-w-0 flex-1 flex-col">
      <TopBar pageTitle={resolveTitle(location.pathname)} onOpenMobileNav={() => setMobileOpen(true)} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6"><Outlet /></main>
    </div>
  </div>;
}
