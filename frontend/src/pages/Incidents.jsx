import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, ListChecks } from "lucide-react";
import { Panel, EmptyState, SkeletonRows, ErrorState } from "../components/Primitives";
import { SeverityBadge, StatusBadge } from "../components/Badges";
import { Button, Select, Input } from "../components/Form";
import { incidentsApi } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, titleCase } from "../utils/formatters";

const PAGE_SIZE = 10;

export default function Incidents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canCreate = user.role === "analyst" || user.role === "admin";

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    const params = { page, page_size: PAGE_SIZE };
    if (search) params.search = search;
    if (severity) params.severity = severity;
    if (status) params.status = status;

    incidentsApi
      .list(params)
      .then((res) => {
        if (!mounted) return;
        setItems(res.data.items);
        setTotal(res.data.total);
      })
      .catch(() => mounted && setError("Could not load incidents."))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [page, search, severity, status]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2.5 flex-wrap">
          <div className="relative min-w-[220px] flex-1 max-w-xs">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
            <Input
              placeholder="Search title, description, code..."
              className="pl-8"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <Select
            value={severity}
            onChange={(e) => {
              setPage(1);
              setSeverity(e.target.value);
            }}
            className="w-40"
          >
            <option value="">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
          <Select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="w-40"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="contained">Contained</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
        </div>

        {canCreate && (
          <Button onClick={() => navigate("/incidents/create")}>
            <Plus size={15} /> Report Incident
          </Button>
        )}
      </div>

      <Panel>
        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <SkeletonRows rows={8} cols={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No incidents found"
            description="Try adjusting your filters, or report a new incident to get started."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-hairline text-xs uppercase tracking-wide text-ink-faint">
                    <th className="py-2 pr-4 font-medium">ID</th>
                    <th className="py-2 pr-4 font-medium">Title</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Severity</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium">Reporter</th>
                    <th className="py-2 pr-4 font-medium">Analyst</th>
                    <th className="py-2 pr-4 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((incident) => (
                    <tr
                      key={incident.id}
                      onClick={() => navigate(`/incidents/${incident.id}`)}
                      className="cursor-pointer border-b border-hairline-soft hover:bg-panel-raised"
                    >
                      <td className="py-2.5 pr-4 font-mono text-signal">{incident.code}</td>
                      <td className="py-2.5 pr-4 text-ink max-w-xs truncate">{incident.title}</td>
                      <td className="py-2.5 pr-4 text-ink-muted">{titleCase(incident.incident_type)}</td>
                      <td className="py-2.5 pr-4">
                        <SeverityBadge severity={incident.severity} />
                      </td>
                      <td className="py-2.5 pr-4">
                        <StatusBadge status={incident.status} />
                      </td>
                      <td className="py-2.5 pr-4 text-ink-muted">{incident.reporter?.full_name || "-"}</td>
                      <td className="py-2.5 pr-4 text-ink-muted">{incident.assigned_analyst?.full_name || "Unassigned"}</td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-ink-faint">{formatDateTime(incident.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-ink-muted">
              <span>
                Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
