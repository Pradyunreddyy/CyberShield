import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertOctagon,
  FileWarning,
  FolderSearch,
  ListChecks,
  ShieldCheck,
  Siren,
  Radar,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { StatCard } from "../components/StatCard";
import { Panel, SkeletonBlock, SkeletonRows, ErrorState } from "../components/Primitives";
import { SeverityBadge, StatusBadge } from "../components/Badges";
import { dashboardApi, analyticsApi, incidentsApi } from "../api/endpoints";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, titleCase } from "../utils/formatters";

const SEVERITY_COLORS = { critical: "#FF4757", high: "#FF9F43", medium: "#F0C93D", low: "#6C7A92" };
const STATUS_COLORS = { open: "#5B8CFF", investigating: "#F0C93D", contained: "#FF9F43", resolved: "#2ED573", closed: "#5B6472" };
const tooltipStyle = { background: "#171B24", border: "1px solid #232833", borderRadius: 6, fontSize: 12, color: "#F5F7FA" };
const tooltipItemStyle = { color: "#F5F7FA" };
const tooltipLabelStyle = { color: "#F5F7FA" };

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div style={{ ...tooltipStyle, padding: "8px 10px" }}>
      {label != null && <div style={{ color: "#F5F7FA", marginBottom: 4 }}>{label}</div>}
      {payload.map((entry, index) => (
        <div key={`${entry.name || entry.dataKey || "value"}-${index}`} style={{ color: "#F5F7FA", lineHeight: 1.5 }}>
          {entry.name || entry.dataKey}: {entry.value}
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canSeeAnalytics = user.role === "analyst" || user.role === "admin";

  const [stats, setStats] = useState(null);
  const [overview, setOverview] = useState(null);
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const requests = [dashboardApi.stats(), incidentsApi.list({ page: 1, page_size: 6, sort_by: "created_at", sort_dir: "desc" })];
        if (canSeeAnalytics) requests.push(analyticsApi.overview());

        const results = await Promise.all(requests);
        if (!mounted) return;
        setStats(results[0].data);
        setRecentIncidents(results[1].data.items);
        if (canSeeAnalytics) setOverview(results[2].data);
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
  }, [canSeeAnalytics]);

  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      {stats?.is_demo_data && (
        <div className="flex items-center gap-2 rounded-md border border-severity-medium/30 bg-severity-medium/10 px-3.5 py-2.5 text-xs text-severity-medium">
          <Radar size={14} /> Showing demo data — create your first incident or run a project scan to see live numbers.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading || !stats ? (
          Array.from({ length: 8 }).map((_, i) => <SkeletonBlock key={i} className="h-[92px]" />)
        ) : (
          <>
            <StatCard label="Total Incidents" value={stats.total_incidents} icon={ListChecks} accent="signal" />
            <StatCard label="Open" value={stats.open_incidents} icon={Siren} accent="warning" />
            <StatCard label="Critical" value={stats.critical_incidents} icon={AlertOctagon} accent="danger" />
            <StatCard label="High Severity" value={stats.high_incidents} icon={FileWarning} accent="warning" />
            <StatCard label="Investigating" value={stats.investigating_incidents} icon={FolderSearch} accent="muted" />
            <StatCard label="Resolved" value={stats.resolved_incidents} icon={ShieldCheck} accent="success" />
            <StatCard label="Projects Scanned" value={stats.projects_scanned} icon={FolderSearch} accent="signal" />
            <StatCard label="Suspicious Findings" value={stats.suspicious_findings} icon={FileWarning} accent="danger" />
          </>
        )}
      </div>

      {canSeeAnalytics && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Panel title="Incidents Over Time (14 days)" className="lg:col-span-2">
            {!overview ? (
              <SkeletonBlock className="h-56" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={overview.incidents_over_time}>
                  <defs>
                    <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5B8CFF" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#5B8CFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1A1E27" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#8891A0" }} tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#8891A0" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                  <Area type="monotone" dataKey="count" stroke="#5B8CFF" fill="url(#incidentGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="Incidents by Severity">
            {!overview ? (
              <SkeletonBlock className="h-56" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={overview.incidents_by_severity}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {overview.incidents_by_severity.map((entry) => (
                      <Cell key={entry.label} fill={SEVERITY_COLORS[entry.label] || "#5B6472"} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    height={24}
                    formatter={(value) => <span className="text-xs text-ink-muted capitalize">{value}</span>}
                  />
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </div>
      )}

      {canSeeAnalytics && overview && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Panel title="Incidents by Type">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={overview.incidents_by_type} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1E27" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#8891A0" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={120}
                  tick={{ fontSize: 11, fill: "#8891A0" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => titleCase(v)}
                />
                <Tooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                <Bar dataKey="count" fill="#5B8CFF" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Incident Status Distribution">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={overview.incidents_by_status}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1A1E27" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#8891A0" }} axisLine={false} tickLine={false} tickFormatter={(v) => titleCase(v)} />
                <YAxis tick={{ fontSize: 11, fill: "#8891A0" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {overview.incidents_by_status.map((entry) => (
                    <Cell key={entry.label} fill={STATUS_COLORS[entry.label] || "#5B6472"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>
        </div>
      )}

      <Panel title="Recent Incidents">
        {loading ? (
          <SkeletonRows rows={5} cols={5} />
        ) : recentIncidents.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">No incidents yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-hairline text-xs uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-4 font-medium">ID</th>
                  <th className="py-2 pr-4 font-medium">Title</th>
                  <th className="py-2 pr-4 font-medium">Type</th>
                  <th className="py-2 pr-4 font-medium">Severity</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Analyst</th>
                  <th className="py-2 pr-4 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentIncidents.map((incident) => (
                  <tr
                    key={incident.id}
                    onClick={() => navigate(`/incidents/${incident.id}`)}
                    className="cursor-pointer border-b border-hairline-soft hover:bg-panel-raised"
                  >
                    <td className="py-2.5 pr-4 font-mono text-signal">{incident.code}</td>
                    <td className="py-2.5 pr-4 text-ink">{incident.title}</td>
                    <td className="py-2.5 pr-4 text-ink-muted">{titleCase(incident.incident_type)}</td>
                    <td className="py-2.5 pr-4">
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={incident.status} />
                    </td>
                    <td className="py-2.5 pr-4 text-ink-muted">{incident.assigned_analyst?.full_name || "Unassigned"}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-ink-faint">{formatDateTime(incident.created_at)}</td>
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
