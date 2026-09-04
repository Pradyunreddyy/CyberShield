import { useEffect, useState } from "react";
import { Clock, FolderSearch, ShieldAlert, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { Panel, SkeletonBlock, ErrorState } from "../components/Primitives";
import { StatCard } from "../components/StatCard";
import { analyticsApi } from "../api/endpoints";
import { titleCase } from "../utils/formatters";

const SEVERITY_COLORS = { critical: "#FF4757", high: "#FF9F43", medium: "#F0C93D", low: "#6C7A92" };
const STATUS_COLORS = { open: "#5B8CFF", investigating: "#F0C93D", contained: "#FF9F43", resolved: "#2ED573", closed: "#5B6472" };
const chartTooltipStyle = { background: "#171B24", border: "1px solid #232833", borderRadius: 6, fontSize: 12 };
const axisTick = { fontSize: 11, fill: "#8891A0" };

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    analyticsApi
      .overview()
      .then((res) => mounted && setOverview(res.data))
      .catch(() => mounted && setError("Could not load analytics data."));
    return () => {
      mounted = false;
    };
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!overview) return <SkeletonBlock className="h-96" />;

  return (
    <div className="space-y-6">
      {overview.is_demo_data && (
        <div className="rounded-md border border-severity-medium/30 bg-severity-medium/10 px-3.5 py-2.5 text-xs text-severity-medium">
          Showing demo analytics — figures will reflect real data once incidents and scans exist.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Avg. Resolution Time" value={overview.average_resolution_hours != null ? `${overview.average_resolution_hours}h` : "N/A"} icon={Clock} accent="signal" />
        <StatCard label="Project Scans" value={overview.total_project_scans} icon={FolderSearch} accent="muted" />
        <StatCard label="Suspicious Findings" value={overview.total_suspicious_findings} icon={ShieldAlert} accent="warning" />
        <StatCard label="Critical Findings" value={overview.total_critical_findings} icon={TrendingUp} accent="danger" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Incidents Over Time">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={overview.incidents_over_time}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1E27" vertical={false} />
              <XAxis dataKey="date" tick={axisTick} tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="#5B8CFF" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Project Scans Over Time">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={overview.scans_over_time}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1E27" vertical={false} />
              <XAxis dataKey="date" tick={axisTick} tickFormatter={(d) => d.slice(5)} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="count" stroke="#2ED573" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Incidents by Severity">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={overview.incidents_by_severity} dataKey="count" nameKey="label" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {overview.incidents_by_severity.map((entry) => (
                  <Cell key={entry.label} fill={SEVERITY_COLORS[entry.label] || "#5B6472"} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={24} formatter={(v) => <span className="text-xs text-ink-muted capitalize">{v}</span>} />
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Incidents by Status">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={overview.incidents_by_status} dataKey="count" nameKey="label" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {overview.incidents_by_status.map((entry) => (
                  <Cell key={entry.label} fill={STATUS_COLORS[entry.label] || "#5B6472"} />
                ))}
              </Pie>
              <Legend verticalAlign="bottom" height={24} formatter={(v) => <span className="text-xs text-ink-muted capitalize">{v}</span>} />
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Incidents by Type">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={overview.incidents_by_type} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A1E27" horizontal={false} />
              <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={100} tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => titleCase(v)} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="count" fill="#5B8CFF" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>
    </div>
  );
}
