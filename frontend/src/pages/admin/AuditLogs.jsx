import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { Panel, EmptyState, SkeletonRows, ErrorState } from "../../components/Primitives";
import { adminApi } from "../../api/endpoints";
import { formatDateTime, titleCase } from "../../utils/formatters";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .auditLogs()
      .then((res) => setLogs(res.data))
      .catch(() => setError("Could not load audit logs."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Panel title="Audit Log" action={<span className="text-xs text-ink-faint">Most recent {logs.length} entries</span>}>
      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <SkeletonRows rows={8} cols={4} />
      ) : logs.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit events yet" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-hairline text-xs uppercase tracking-wide text-ink-faint">
                <th className="py-2 pr-4 font-medium">Action</th>
                <th className="py-2 pr-4 font-medium">Resource</th>
                <th className="py-2 pr-4 font-medium">Metadata</th>
                <th className="py-2 pr-4 font-medium">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-hairline-soft">
                  <td className="py-2.5 pr-4 font-mono text-xs text-signal">{log.action}</td>
                  <td className="py-2.5 pr-4 text-ink-muted">
                    {log.resource_type ? `${titleCase(log.resource_type)} ${log.resource_id ? `(${log.resource_id.slice(0, 8)}...)` : ""}` : "-"}
                  </td>
                  <td className="py-2.5 pr-4 max-w-xs truncate font-mono text-xs text-ink-faint">{log.metadata_json || "-"}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs text-ink-faint">{formatDateTime(log.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
