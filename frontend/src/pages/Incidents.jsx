import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowDown, ArrowUp, ChevronsUpDown, ListChecks, Plus, Search, X } from "lucide-react";
import { Panel, PageHeader, EmptyState, SkeletonRows, ErrorState } from "../components/Primitives";
import { SeverityBadge, StatusBadge } from "../components/Badges";
import { Button, Select, Input } from "../components/Form";
import { incidentsApi } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, titleCase } from "../utils/formatters";

const PAGE_SIZE = 10;
const SEVERITIES = ["critical", "high", "medium", "low"];
const STATUSES = ["open", "investigating", "contained", "resolved", "closed"];
// Only known values are accepted from the URL; anything else is ignored.
const fromParam = (value, allowed) => (allowed.includes(value) ? value : "");

// Severity/status are enums sorted alphabetically by the database, which would
// put "low" ahead of "medium" - so only columns that sort meaningfully are offered.
function SortHeader({ label, field, sort, onSort }) {
  const active = sort.by === field;
  const Icon = !active ? ChevronsUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`-ml-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors duration-120 hover:text-ink ${active ? "text-ink" : ""}`}
      >
        {label}
        <Icon size={12} aria-hidden="true" className={active ? "text-signal" : "text-ink-faint"} />
      </button>
    </th>
  );
}

export default function Incidents() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const canCreate = user.role === "analyst" || user.role === "admin";

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState(() => fromParam(searchParams.get("severity"), SEVERITIES));
  const [status, setStatus] = useState(() => fromParam(searchParams.get("status"), STATUSES));
  const [sort, setSort] = useState({ by: "created_at", dir: "desc" });
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Wait for a pause in typing instead of querying on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    const params = { page, page_size: PAGE_SIZE, sort_by: sort.by, sort_dir: sort.dir };
    if (search) params.search = search;
    if (severity) params.severity = severity;
    if (status) params.status = status;

    incidentsApi
      .list(params)
      .then((res) => {
        if (!mounted) return;
        setItems(res.data.items);
        setTotal(res.data.total);
        setLoaded(true);
      })
      .catch(() => mounted && setError("Could not load incidents."))
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, [page, search, severity, status, sort, reloadKey]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtersActive = Boolean(search || searchInput || severity || status);

  function toggleSort(field) {
    setPage(1);
    setSort((s) => (s.by === field ? { by: field, dir: s.dir === "asc" ? "desc" : "asc" } : { by: field, dir: field === "created_at" ? "desc" : "asc" }));
  }

  function clearFilters() {
    setPage(1);
    setSearchInput("");
    setSearch("");
    setSeverity("");
    setStatus("");
  }

  return (
    <div>
      <PageHeader
        title="Incidents"
        description="Track, triage and resolve security incidents."
        actions={
          canCreate && (
            <Button onClick={() => navigate("/incidents/create")}>
              <Plus size={15} aria-hidden="true" /> Report incident
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5" role="search">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search size={14} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input
            type="search"
            aria-label="Search incidents"
            placeholder="Search title, description, code…"
            className="pl-8"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Select
          aria-label="Filter by severity"
          wrapperClassName="w-40"
          value={severity}
          onChange={(e) => {
            setPage(1);
            setSeverity(e.target.value);
          }}
        >
          <option value="">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by status"
          wrapperClassName="w-40"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {titleCase(s)}
            </option>
          ))}
        </Select>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X size={13} aria-hidden="true" /> Clear filters
          </Button>
        )}
      </div>

      <Panel bodyClassName="p-4">
        {error ? (
          <ErrorState title="Unable to load incidents" message="Please check your connection and try again." onRetry={() => setReloadKey((k) => k + 1)} />
        ) : !loaded ? (
          <SkeletonRows rows={8} cols={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title={filtersActive ? "No incidents match these filters" : "No incidents yet"}
            description={filtersActive ? "Try broadening your search or clearing the filters." : "Report an incident, or create one from a project scan finding."}
            action={
              filtersActive ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : canCreate ? (
                <Button size="sm" onClick={() => navigate("/incidents/create")}>
                  <Plus size={14} aria-hidden="true" /> Report incident
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            {/* Previous rows stay visible (dimmed) while a filter/sort/page change loads. */}
            <div className={`relative overflow-x-auto transition-opacity duration-180 ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
              <table className="data-table text-left">
                <caption className="sr-only">Incidents, {total} total</caption>
                <thead>
                  <tr>
                    <SortHeader label="ID" field="code" sort={sort} onSort={toggleSort} />
                    <SortHeader label="Title" field="title" sort={sort} onSort={toggleSort} />
                    <th>Type</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Reporter</th>
                    <th>Analyst</th>
                    <SortHeader label="Created" field="created_at" sort={sort} onSort={toggleSort} />
                  </tr>
                </thead>
                <tbody>
                  {items.map((incident) => (
                    <tr key={incident.id} data-interactive="true" onClick={() => navigate(`/incidents/${incident.id}`)}>
                      <td>
                        <Link
                          to={`/incidents/${incident.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="whitespace-nowrap font-mono text-signal hover:underline"
                        >
                          {incident.code}
                        </Link>
                      </td>
                      <td className="max-w-xs truncate text-ink">{incident.title}</td>
                      <td className="text-ink-muted">{titleCase(incident.incident_type)}</td>
                      <td>
                        <SeverityBadge severity={incident.severity} />
                      </td>
                      <td>
                        <StatusBadge status={incident.status} />
                      </td>
                      <td className="text-ink-muted">{incident.reporter?.full_name || "-"}</td>
                      <td className="text-ink-muted">{incident.assigned_analyst?.full_name || "Unassigned"}</td>
                      <td className="whitespace-nowrap font-mono text-xs text-ink-muted">{formatDateTime(incident.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline-soft pt-4 text-sm text-ink-muted">
              <span className="tnum">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="flex items-center gap-2">
                <span className="tnum mr-1 text-xs">
                  Page {page} of {totalPages}
                </span>
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
