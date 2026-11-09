import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { useAuth } from "./hooks/useAuth";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Incidents from "./pages/Incidents";
import IncidentDetail from "./pages/IncidentDetail";
import IncidentCreate from "./pages/IncidentCreate";
import ProjectScanner from "./pages/ProjectScanner";
import ScanDetail from "./pages/ScanDetail";
import Analytics from "./pages/Analytics";
import Alerts from "./pages/Alerts";
import Profile from "./pages/Profile";
import AdminUsers from "./pages/admin/Users";
import AdminAuditLogs from "./pages/admin/AuditLogs";
import AdminSettings from "./pages/admin/Settings";

export default function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-void">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-signal border-t-transparent" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Register />} />

      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/incidents" element={<Incidents />} />
        <Route
          path="/incidents/create"
          element={
            <ProtectedRoute roles={["analyst", "admin"]}>
              <IncidentCreate />
            </ProtectedRoute>
          }
        />
        <Route path="/incidents/:incidentId" element={<IncidentDetail />} />

        <Route path="/project-scanner" element={<ProjectScanner />} />
        <Route path="/project-scanner/:scanId" element={<ScanDetail />} />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute roles={["analyst", "admin"]}>
              <Analytics />
            </ProtectedRoute>
          }
        />

        <Route path="/alerts" element={<Alerts />} />
        <Route path="/profile" element={<Profile />} />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminAuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminSettings />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
      <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
    </Routes>
  );
}
