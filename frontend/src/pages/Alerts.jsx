import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertOctagon, AlertTriangle, ArrowRight, Bell, Info, ShieldAlert } from "lucide-react";
import { Panel, PageHeader, EmptyState, SkeletonRows, ErrorState } from "../components/Primitives";
import { alertsApi } from "../api/endpoints";
import { formatRelativeTime, titleCase } from "../utils/formatters";

const SEVERITY_ICON = { critical: AlertOctagon, warning: AlertTriangle, info: Info };
const SEVERITY_COLOR = {
  critical: "text-severity-critical bg-severity-critical/10",
  warning: "text-severity-high bg-severity-high/10",
  info: "text-signal bg-signal/10",
};
const SEVERITY_TAG = {
  critical: "text-severity-critical border-severity-critical/30",
  warning: "text-severity-high border-severity-high/30",
  info: "text-signal border-signal/30",
};

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError("");
    alertsApi
      .list()
      .then((res) => setAlerts(res.data))
      .catch(() => setError("Could not load alerts."))
      .finally(() => setLoading(false));
  }, [reloadKey]);

  async function markRead(alert) {
    if (alert.is_read) return;
    setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, is_read: true } : a)));
    try {
      await alertsApi.markRead(alert.id);
    } catch {
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, is_read: false } : a)));
    }
  }

  const unread = alerts.filter((a) => !a.is_read).length;
  const visibleAlerts = filter === "unread" ? alerts.filter((a) => !a.is_read) : alerts;

  return (
    <div>
      <PageHeader title="Alerts" description="Notifications raised by incidents and project scans. Select an alert to mark it as read." />

      <div className="mb-4 inline-flex rounded-md border border-hairline bg-panel p-0.5" role="group" aria-label="Filter alerts">
        {[
          { id: "all", label: `All`, count: alerts.length },
          { id: "unread", label: "Unread", count: unread },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition-colors duration-120 ${
              filter === f.id ? "bg-panel-raised text-ink shadow-panel" : "text-ink-muted hover:text-ink"
            }`}
          >
            {f.label}
            <span className="tnum font-mono text-xs text-ink-muted">{f.count}</span>
          </button>
        ))}
      </div>

      <Panel bodyClassName="px-2 py-1">
        {error ? (
          <div className="p-2">
            <ErrorState title="Unable to load alerts" message="Please check your connection and try again." onRetry={() => setReloadKey((k) => k + 1)} />
          </div>
        ) : loading ? (
          <div className="p-3">
            <SkeletonRows rows={6} cols={1} />
          </div>
        ) : visibleAlerts.length === 0 ? (
          <EmptyState icon={Bell} title={filter === "unread" ? "No unread alerts" : "No alerts"} description="You're all caught up." />
        ) : (
          <ul className="divide-y divide-hairline-soft">
            {visibleAlerts.map((alert) => {
              const Icon = SEVERITY_ICON[alert.severity] || ShieldAlert;
              const critical = alert.severity === "critical" && !alert.is_read;
              const target = alert.related_incident_id
                ? { to: `/incidents/${alert.related_incident_id}`, label: "View incident" }
                : alert.related_scan_id
                ? { to: `/project-scanner/${alert.related_scan_id}`, label: "View scan" }
                : null;
              return (
                <li key={alert.id} className={`flex items-center gap-2 rounded-md ${critical ? "bg-severity-critical/[0.04]" : ""}`}>
                  <button
                    type="button"
                    onClick={() => markRead(alert)}
                    className="flex min-w-0 flex-1 items-start gap-3 rounded-md px-2.5 py-3.5 text-left transition-colors duration-120 hover:bg-panel-raised"
                  >
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${SEVERITY_COLOR[alert.severity] || SEVERITY_COLOR.info}`}>
                      <Icon size={15} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        {!alert.is_read && <span className="sr-only">Unread. </span>}
                        {/* "Read" is shown with a quieter text colour, not opacity, so contrast holds. */}
                        <span className={`text-sm ${alert.is_read ? "text-ink-muted" : "text-ink"}`}>{alert.message}</span>
                        {!alert.is_read && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                        <span className={`rounded border px-1.5 py-px font-medium ${SEVERITY_TAG[alert.severity] || SEVERITY_TAG.info}`}>{titleCase(alert.severity)}</span>
                        {titleCase(alert.alert_type)} · {formatRelativeTime(alert.created_at)}
                      </span>
                    </span>
                  </button>
                  {target && (
                    <Link
                      to={target.to}
                      onClick={() => markRead(alert)}
                      className="mr-1.5 flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-medium text-signal transition-colors duration-120 hover:bg-signal/10"
                    >
                      {target.label} <ArrowRight size={12} aria-hidden="true" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
