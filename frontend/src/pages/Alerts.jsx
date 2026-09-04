import { useEffect, useState } from "react";
import { AlertOctagon, AlertTriangle, Bell, Info, ShieldAlert } from "lucide-react";
import { Panel, EmptyState, SkeletonRows, ErrorState } from "../components/Primitives";
import { Button } from "../components/Form";
import { alertsApi } from "../api/endpoints";
import { formatRelativeTime, titleCase } from "../utils/formatters";

const SEVERITY_ICON = { critical: AlertOctagon, warning: AlertTriangle, info: Info };
const SEVERITY_COLOR = { critical: "text-severity-critical bg-severity-critical/10", warning: "text-severity-high bg-severity-high/10", info: "text-signal bg-signal/10" };

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLoading(true);
    alertsApi
      .list()
      .then((res) => setAlerts(res.data))
      .catch(() => setError("Could not load alerts."))
      .finally(() => setLoading(false));
  }, []);

  async function markRead(alert) {
    if (alert.is_read) return;
    setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, is_read: true } : a)));
    try {
      await alertsApi.markRead(alert.id);
    } catch {
      setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, is_read: false } : a)));
    }
  }

  const visibleAlerts = filter === "unread" ? alerts.filter((a) => !a.is_read) : alerts;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant={filter === "all" ? "primary" : "secondary"} onClick={() => setFilter("all")}>
          All ({alerts.length})
        </Button>
        <Button size="sm" variant={filter === "unread" ? "primary" : "secondary"} onClick={() => setFilter("unread")}>
          Unread ({alerts.filter((a) => !a.is_read).length})
        </Button>
      </div>

      <Panel>
        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <SkeletonRows rows={6} cols={1} />
        ) : visibleAlerts.length === 0 ? (
          <EmptyState icon={Bell} title="No alerts" description="You're all caught up." />
        ) : (
          <div className="divide-y divide-hairline-soft">
            {visibleAlerts.map((alert) => {
              const Icon = SEVERITY_ICON[alert.severity] || ShieldAlert;
              return (
                <button
                  key={alert.id}
                  onClick={() => markRead(alert)}
                  className={`flex w-full items-start gap-3 px-1 py-3.5 text-left transition-colors hover:bg-panel-raised ${!alert.is_read ? "" : "opacity-70"}`}
                >
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${SEVERITY_COLOR[alert.severity] || SEVERITY_COLOR.info}`}>
                    <Icon size={15} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-ink">{alert.message}</p>
                      {!alert.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />}
                    </div>
                    <p className="mt-0.5 text-xs text-ink-faint">
                      {titleCase(alert.alert_type)} &middot; {formatRelativeTime(alert.created_at)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
