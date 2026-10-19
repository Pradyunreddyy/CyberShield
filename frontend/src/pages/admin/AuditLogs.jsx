import { useEffect, useMemo, useState } from "react";
import { ScrollText, Search } from "lucide-react";
import { Panel, PageHeader, EmptyState, SkeletonRows, ErrorState } from "../../components/Primitives";
import { Input } from "../../components/Form";
import { adminApi } from "../../api/endpoints";
import { formatDateTime, titleCase } from "../../utils/formatters";

// metadata_json is a JSON string; show it as readable key: value pairs and
// fall back to the raw text if it isn't JSON.
function formatDetails(raw) {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      return Object.entries(obj)
        .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join(" · ");
    }
  } catch {
    // not JSON - show as-is
  }
  return raw;
}

// Empty cell: a quiet dash for sighted users, "None" for screen readers.
const None = () => (
  <>
    <span aria-hidden="true">–</span>
    <span className="sr-only">None</span>
  </>
);

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    adminApi
      .auditLogs()
      .then((res) => mounted && setLogs(res.data))
      .catch(() => mounted && setError("Could not load audit logs."))
      .finally(() => mounted && setLoading(false));

    // Resolve user ids to names with the existing admin endpoint. Best effort:
    // if it fails the table simply shows a shortened id.
    adminApi
      .listUsers()
      .then((res) => mounted && setUserNames(Object.fromEntries(res.data.map((u) => [u.id, u.full_name]))))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  const userLabel = (id) => (id ? userNames[id] || `${id.slice(0, 8)}…` : "System");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) =>
      [l.action, l.resource_type, userLabel(l.user_id), formatDetails(l.metadata_json)].some((v) => v && String(v).toLowerCase().includes(q))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs, query, userNames]);

  return (
    <div>
      <PageHeader title="Audit log" description="A record of security-relevant actions on the platform." />

      <div className="relative mb-4 max-w-sm">
        <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <Input type="search" aria-label="Filter audit log" placeholder="Filter by user, action, resource…" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <Panel
        title="Events"
        action={
          !loading &&
          !error && (
            <span className="tnum text-xs text-ink-muted">
              {query ? `${filtered.length} of ${logs.length}` : `Most recent ${logs.length}`}
            </span>
          )
        }
      >
        {error ? (
          <ErrorState title="Unable to load audit log" message="Please check your connection and try again." onRetry={() => setReloadKey((k) => k + 1)} />
        ) : loading ? (
          <SkeletonRows rows={8} cols={4} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={ScrollText} title={query ? "No matching events" : "No audit events yet"} description={query ? "Try a different search term." : undefined} />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="data-table text-left">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const details = formatDetails(log.metadata_json);
                  return (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap font-mono text-xs text-ink-muted">{formatDateTime(log.created_at)}</td>
                      <td className="whitespace-nowrap text-ink">{userLabel(log.user_id)}</td>
                      <td>
                        <code className="rounded bg-well px-1.5 py-0.5 font-mono text-xs text-signal ring-1 ring-hairline">{log.action}</code>
                      </td>
                      <td className="whitespace-nowrap text-ink-muted">
                        {log.resource_type ? (
                          <>
                            {titleCase(log.resource_type)}
                            {log.resource_id && <span className="ml-1.5 font-mono text-xs text-ink-faint">{log.resource_id.slice(0, 8)}…</span>}
                          </>
                        ) : (
                          <None />
                        )}
                      </td>
                      <td className="max-w-xs truncate font-mono text-xs text-ink-muted" title={details || undefined}>
                        {details || <None />}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
