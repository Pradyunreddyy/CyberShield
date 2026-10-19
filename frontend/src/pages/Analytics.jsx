import { useEffect, useState } from "react";
import { AlertOctagon, Clock, FolderSearch, ShieldAlert, Radar } from "lucide-react";
import { Panel, PageHeader, SkeletonBlock, ErrorState } from "../components/Primitives";
import { StatCard } from "../components/StatCard";
import { DonutChart, HorizontalBarChart, SEVERITY_COLORS, STATUS_COLORS, TimeSeriesChart } from "../components/charts";
import { analyticsApi } from "../api/endpoints";

const SUCCESS = "#2ED573";

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    setError("");
    analyticsApi
      .overview()
      .then((res) => mounted && setOverview(res.data))
      .catch(() => mounted && setError("Could not load analytics data."));
    return () => {
      mounted = false;
    };
  }, [reloadKey]);

  const header = <PageHeader title="Analytics" description="Trends across incidents and project scans." />;

  if (error) {
    return (
      <>
        {header}
        <ErrorState title="Analytics unavailable" message={error} onRetry={() => setReloadKey((k) => k + 1)} />
      </>
    );
  }

  if (!overview) {
    return (
      <>
        {header}
        <div className="space-y-6" role="status" aria-label="Loading analytics">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} className="h-[92px]" />
            ))}
          </div>
          <SkeletonBlock className="h-72" />
          <SkeletonBlock className="h-72" />
        </div>
      </>
    );
  }

  return (
    <div className="space-y-6">
      {header}

      {overview.is_demo_data && (
        <div role="note" className="flex items-center gap-2 rounded-md border border-severity-medium/30 bg-severity-medium/10 px-3.5 py-2.5 text-xs text-severity-medium">
          <Radar size={14} aria-hidden="true" /> Showing demo analytics — figures will reflect real data once incidents and scans exist.
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Avg. resolution time" value={overview.average_resolution_hours != null ? `${overview.average_resolution_hours}h` : "N/A"} icon={Clock} accent="signal" />
        <StatCard label="Project scans" value={overview.total_project_scans} icon={FolderSearch} accent="muted" />
        <StatCard label="Suspicious findings" value={overview.total_suspicious_findings} icon={ShieldAlert} accent="warning" />
        <StatCard label="Critical findings" value={overview.total_critical_findings} icon={AlertOctagon} accent="danger" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Incidents over time" description="New incidents per day">
          <TimeSeriesChart data={overview.incidents_over_time} seriesName="Incidents" gradientId="an-incidents" height={224} />
        </Panel>
        <Panel title="Project scans over time" description="Scans run per day">
          <TimeSeriesChart data={overview.scans_over_time} seriesName="Scans" color={SUCCESS} gradientId="an-scans" height={224} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Incidents by severity">
          <DonutChart data={overview.incidents_by_severity} colors={SEVERITY_COLORS} centerLabel="incidents" summaryTitle="Incidents by severity" />
        </Panel>
        <Panel title="Incidents by status">
          <DonutChart data={overview.incidents_by_status} colors={STATUS_COLORS} centerLabel="incidents" summaryTitle="Incidents by status" />
        </Panel>
        <Panel title="Incidents by type">
          <HorizontalBarChart data={overview.incidents_by_type} summaryTitle="Incidents by type" />
        </Panel>
      </div>
    </div>
  );
}
