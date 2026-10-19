import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { TopBar } from "../components/TopBar";

const SIDEBAR_COLLAPSED_KEY = "cybershield:sidebar-collapsed";

// Short names for breadcrumbs / the browser tab. Each page owns its own
// descriptive <h1> via <PageHeader>.
const ROUTES = {
  "/dashboard": [{ label: "Dashboard" }],
  "/incidents": [{ label: "Incidents" }],
  "/incidents/create": [{ label: "Incidents", to: "/incidents" }, { label: "Report incident" }],
  "/project-scanner": [{ label: "Project Scanner" }],
  "/analytics": [{ label: "Analytics" }],
  "/alerts": [{ label: "Alerts" }],
  "/profile": [{ label: "Profile" }],
  "/admin/users": [{ label: "Administration" }, { label: "Users" }],
  "/admin/audit-logs": [{ label: "Administration" }, { label: "Audit Logs" }],
  "/admin/settings": [{ label: "Administration" }, { label: "Settings" }],
};

function resolveCrumbs(pathname) {
  if (ROUTES[pathname]) return ROUTES[pathname];
  if (pathname.startsWith("/incidents/")) return [{ label: "Incidents", to: "/incidents" }, { label: "Incident details" }];
  if (pathname.startsWith("/project-scanner/")) return [{ label: "Project Scanner", to: "/project-scanner" }, { label: "Scan details" }];
  return [{ label: "CyberShield" }];
}

export function DashboardLayout() {
  const location = useLocation();
  const mainRef = useRef(null);
  const menuButtonRef = useRef(null);

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      // Storage can be unavailable (private mode); the preference just isn't remembered.
    }
  }, [collapsed]);

  const crumbs = resolveCrumbs(location.pathname);

  // Close the drawer on navigation, name the browser tab after the page, and
  // reset scroll so a new page never opens half-scrolled.
  useEffect(() => {
    setMobileOpen(false);
    document.title = `${crumbs[crumbs.length - 1].label} · CyberShield`;
    mainRef.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-void">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-signal-strong focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Skip to main content
      </a>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={closeMobile}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar crumbs={crumbs} onOpenMobileNav={() => setMobileOpen(true)} menuButtonRef={menuButtonRef} />
        <main id="main" ref={mainRef} tabIndex={-1} className="flex-1 overflow-y-auto px-4 py-5 focus:outline-none sm:px-6 sm:py-7">
          {/* Opacity-only route transition: signals that navigation happened
              without moving content or delaying the data underneath it. */}
          <div key={location.pathname} className="mx-auto w-full max-w-[1600px] animate-fade">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
