import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { TopBar } from "../components/TopBar";

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
  return "Sentinel SOC";
}

export function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-void">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar pageTitle={resolveTitle(location.pathname)} />
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
