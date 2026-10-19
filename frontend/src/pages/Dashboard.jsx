import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertOctagon, ArrowRight, ListChecks, Plus, Radar, RefreshCw, Siren, FolderSearch, Bell, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { StatCard } from "../components/StatCard";
import { Button } from "../components/Form";
import { Panel, PageHeader, EmptyState, SkeletonBlock, SkeletonRows, ErrorState } from "../components/Primitives";
import { SeverityBadge, StatusBadge } from "../components/Badges";
import { ColumnChart, DonutChart, HorizontalBarChart, SEVERITY_COLORS, STATUS_COLORS, TimeSeriesChart } from "../components/charts";
import { dashboardApi, analyticsApi, incidentsApi, alertsApi } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, formatRelativeTime, titleCase } from "../utils/formatters";
import { Modal } from "../components/Modal";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canSeeAnalytics = user.role === "analyst" || user.role === "admin";
  const canCreate = canSeeAnalytics;

  const [stats, setStats] = useState(null);
  const [overview, setOverview] = useState(null);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const requests = [dashboardApi.stats(), incidentsApi.list({ page: 1, page_size: 6, sort_by: "created_at", sort_dir: "desc" }), alertsApi.list()];
        if (canSeeAnalytics) requests.push(analyticsApi.overview());

        const results = await Promise.all(requests);
        if (!mounted) return;
        setStats(results[0].data);
        setRecentIncidents(results[1].data.items);
        setRecentAlerts((results[2].data || []).slice(0, 5));
        if (canSeeAnalytics) setOverview(results[3].data);
        setUpdatedAt(new Date());
      } catch (err) {
        if (mounted) setError("Could not load dashboard data. Please try refreshing the page.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [canSeeAnalytics, reloadKey]);

  const reload = () => setReloadKey((k) => k + 1);

  const header = (
    <PageHeader
      title="Security dashboard"
      description={
        updatedAt
          ? `Incident posture and scan results. Updated ${updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.`
          : "Incident posture and scan results."
      }
      actions={
        <>
          <Button variant="secondary" size="sm" onClick={reload} loading={loading && !!stats} aria-label="Refresh dashboard data">
            {!(loading && !!stats) && <RefreshCw size={13} aria-hidden="true" />} Refresh
          </Button>
          {canCreate && (
            <Button size="sm" onClick={() => navigate("/incidents/create")}>
              <Plus size={14} aria-hidden="true" /> Report incident
            </Button>
          )}
        </>
      }
    />
  );

  if (error && !stats) {
    return (
      <>
        {header}
        <ErrorState title="Dashboard unavailable" message={error} onRetry={reload} />
      </>
    );
  }

  const totalForPct = stats?.total_incidents || 0;
  const pctOfTotal = (n) => (totalForPct > 0 ? `${Math.round((n / totalForPct) * 100)}% of all incidents` : undefined);

  return (
    <div className="space-y-6">
      {header}

      {stats?.is_demo_data && (
        <div
          role="note"
          className="flex items-center gap-2 rounded-md border border-severity-medium/30 bg-severity-medium/10 px-3.5 py-2.5 text-xs text-severity-medium"
        >
          <Radar size={14} aria-hidden="true" /> Showing demo data — create your first incident or run a project scan to see live numbers.
        </div>
      )}

      {/* What needs attention first: the three counts that drive action. */}
      <section aria-label="Needs attention" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {loading && !stats ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} className="h-[116px]" />)
        ) : (
          <>
            <StatCard
              emphasis="primary"
              label="Critical incidents"
              value={stats.critical_incidents}
              icon={AlertOctagon}
              accent="danger"
              sublabel={pctOfTotal(stats.critical_incidents)}
              to="/incidents?severity=critical"
            />
            <StatCard
              emphasis="primary"
              label="Open"
              value={stats.open_incidents}
              icon={Siren}
              accent="warning"
              sublabel="Awaiting triage"
              to="/incidents?status=open"
            />
            <StatCard
              emphasis="primary"
              label="Investigating"
              value={stats.investigating_incidents}
              icon={FolderSearch}
              accent="signal"
              sublabel="Analysis in progress"
              to="/incidents?status=investigating"
            />
          </>
        )}
      </section>

      {/* Reference numbers: one quiet strip instead of five more boxes. */}
      <section aria-label="Totals">
        {loading && !stats ? (
          <SkeletonBlock className="h-[76px]" />
        ) : (
          <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-5">
            {[
              { label: "Total incidents", value: stats.total_incidents, to: "/incidents" },
              { label: "High severity", value: stats.high_incidents, to: "/incidents?severity=high" },
              { label: "Resolved", value: stats.resolved_incidents, to: "/incidents?status=resolved" },
              { label: "Projects scanned", value: stats.projects_scanned, to: "/project-scanner" },
              { label: "Suspicious findings", value: stats.suspicious_findings, to: "/project-scanner" },
            ].map((item, i, all) => (
              // With 2 columns the odd fifth cell spans the row, so no empty cell shows the divider colour.
              <li key={item.label} className={`bg-panel ${i === all.length - 1 ? "col-span-2 sm:col-span-1" : ""}`}>
                <Link to={item.to} className="group block px-4 py-3 transition-colors duration-120 hover:bg-panel-raised focus-visible:bg-panel-raised">
                  <span className="block text-xs text-ink-muted">{item.label}</span>
                  <span className="tnum mt-1 flex items-baseline justify-between font-mono text-lg font-semibold text-ink">
                    {item.value}
                    <ArrowRight
                      size={13}
                      aria-hidden="true"
                      className="text-ink-faint opacity-0 transition-opacity duration-120 group-hover:opacity-100 group-focus-visible:opacity-100"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={!!selectedAlert} onClose={() => setSelectedAlert(null)} title="Alert details" width="max-w-xl">
        {selectedAlert && <div className="space-y-4"><p className="text-sm leading-6 text-ink">{selectedAlert.message}</p><dl className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div><dt className="text-xs text-ink-muted">Severity</dt><dd className="mt-1 text-sm font-medium text-ink">{titleCase(selectedAlert.severity)}</dd></div><div><dt className="text-xs text-ink-muted">Type</dt><dd className="mt-1 text-sm text-ink">{titleCase(selectedAlert.alert_type)}</dd></div><div><dt className="text-xs text-ink-muted">Created</dt><dd className="mt-1 text-sm text-ink">{formatDateTime(selectedAlert.created_at)}</dd></div></dl>{selectedAlert.related_incident_id && <Button variant="secondary" size="sm" onClick={() => { setSelectedAlert(null); navigate(`/incidents/${selectedAlert.related_incident_id}`); }}>View related incident <ArrowRight size={13} aria-hidden="true" /></Button>}{selectedAlert.related_scan_id && <Button variant="secondary" size="sm" onClick={() => { setSelectedAlert(null); navigate(`/project-scanner/${selectedAlert.related_scan_id}`); }}>View related scan <ArrowRight size={13} aria-hidden="true" /></Button>}</div>}
      </Modal>

      {canSeeAnalytics && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Incidents over time" description="New incidents per day, last 14 days" className="lg:col-span-2">
            {!overview ? (
              <SkeletonBlock className="h-56" />
            ) : (
              <TimeSeriesChart data={overview.incidents_over_time} seriesName="Incidents" gradientId="dash-incidents" />
            )}
          </Panel>

          <Panel title="Incidents by severity">
            {!overview ? (
              <SkeletonBlock className="h-56" />
            ) : (
              <DonutChart
                data={overview.incidents_by_severity}
                colors={SEVERITY_COLORS}
                centerLabel="incidents"
                summaryTitle="Incidents by severity"
              />
            )}
          </Panel>
        </div>
      )}

      {canSeeAnalytics && overview && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Incidents by type">
            <HorizontalBarChart data={overview.incidents_by_type} summaryTitle="Incidents by type" />
          </Panel>

          <Panel title="Incident status">
            <ColumnChart data={overview.incidents_by_status} colors={STATUS_COLORS} summaryTitle="Incidents by status" height={Math.max(180, overview.incidents_by_type.length * 34 + 16)} />
          </Panel>
        </div>
      )}

      <Panel title="Recent alerts" action={<Link to="/alerts" className="flex items-center gap-1 rounded text-xs font-medium text-signal hover:text-signal-bright">View all <ArrowRight size={12} aria-hidden="true" /></Link>}>
        {loading && !stats ? <SkeletonRows rows={3} cols={1} /> : recentAlerts.length === 0 ? (
          <EmptyState icon={Bell} title="No alerts" description="Alerts raised by incidents and project scans will appear here." />
        ) : (
          <ul className="divide-y divide-hairline-soft">
            {recentAlerts.map((alert) => {
              const Icon = alert.severity === "critical" ? AlertOctagon : alert.severity === "warning" ? AlertTriangle : alert.severity === "info" ? Info : ShieldAlert;
              return <li key={alert.id}>
                <button type="button" onClick={() => setSelectedAlert(alert)} className="flex w-full items-start gap-3 rounded-md px-2.5 py-3 text-left hover:bg-panel-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal">
                  <span className="mt-0.5 rounded-full bg-panel-raised p-2 text-signal"><Icon size={15} aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm text-ink">{alert.message}</span><span className="mt-1 block text-xs text-ink-muted">{titleCase(alert.severity)} · {formatRelativeTime(alert.created_at)}</span></span>
                  <ArrowRight size={14} className="mt-1 shrink-0 text-ink-muted" aria-hidden="true" />
                </button>
              </li>;
            })}
          </ul>
        )}
      </Panel>

      <Panel
        title="Recent incidents"
        action={
          <Link to="/incidents" className="flex items-center gap-1 rounded text-xs font-medium text-signal transition-colors duration-120 hover:text-signal-bright">
            View all <ArrowRight size={12} aria-hidden="true" />
          </Link>
        }
      >
        {loading && !stats ? (
          <SkeletonRows rows={5} cols={5} />
        ) : recentIncidents.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No incidents yet"
            description="When an incident is reported or created from a scan finding, it appears here."
            action={
              canCreate ? (
                <Button size="sm" onClick={() => navigate("/incidents/create")}>
                  <Plus size={14} aria-hidden="true" /> Report incident
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="data-table text-left">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Analyst</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recentIncidents.map((incident) => (
                  <tr key={incident.id} data-interactive="true" onClick={() => navigate(`/incidents/${incident.id}`)}>
                    <td>
                      {/* The link is the keyboard/AT path; the row click is a pointer convenience. */}
                      <Link
                        to={`/incidents/${incident.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="whitespace-nowrap font-mono text-signal hover:underline"
                      >
                        {incident.code}
                      </Link>
                    </td>
                    <td className="max-w-[22rem] truncate text-ink">{incident.title}</td>
                    <td className="text-ink-muted">{titleCase(incident.incident_type)}</td>
                    <td>
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td>
                      <StatusBadge status={incident.status} />
                    </td>
                    <td className="text-ink-muted">{incident.assigned_analyst?.full_name || "Unassigned"}</td>
                    <td className="whitespace-nowrap font-mono text-xs text-ink-muted">{formatDateTime(incident.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
