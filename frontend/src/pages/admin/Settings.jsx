import { useEffect, useState } from "react";
import { Database, KeyRound, Server, Settings as SettingsIcon, Users, ListChecks, FolderSearch } from "lucide-react";
import { Panel, SkeletonBlock, ErrorState } from "../../components/Primitives";
import { StatCard } from "../../components/StatCard";
import { adminApi } from "../../api/endpoints";
import { API_BASE_URL } from "../../api/client";

const INCIDENT_TYPES = [
  "phishing", "malware", "ransomware", "credential_attack", "ddos",
  "data_exfiltration", "insider_threat", "misconfiguration", "project_security_finding", "uncategorized",
];

export default function AdminSettings() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi
      .overview()
      .then((res) => setOverview(res.data))
      .catch(() => setError("Could not load platform overview."));
  }, []);

  return (
    <div className="space-y-6">
      {error && <ErrorState message={error} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {!overview ? (
          <>
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
            <SkeletonBlock className="h-24" />
          </>
        ) : (
          <>
            <StatCard label="Total Users" value={overview.total_users} icon={Users} accent="signal" />
            <StatCard label="Total Incidents" value={overview.total_incidents} icon={ListChecks} accent="warning" />
            <StatCard label="Total Project Scans" value={overview.total_scans} icon={FolderSearch} accent="muted" />
          </>
        )}
      </div>

      <Panel title="Platform Configuration">
        <p className="mb-4 text-sm text-ink-muted">
          Sensitive configuration (database credentials, JWT secret, AI API key) is managed exclusively through backend
          environment variables and is never exposed to the frontend or stored in the browser.
        </p>
        <div className="space-y-3">
          <ConfigRow icon={Server} label="API Base URL" value={API_BASE_URL} />
          <ConfigRow icon={Database} label="Database" value="Configured via DATABASE_URL (PostgreSQL in production)" />
          <ConfigRow icon={KeyRound} label="Authentication" value="JWT bearer tokens, bcrypt-hashed passwords" />
          <ConfigRow icon={SettingsIcon} label="AI Provider" value="Configured via AI_PROVIDER / AI_API_KEY on the backend" />
        </div>
      </Panel>

      <Panel title="Incident Categories">
        <p className="mb-3 text-sm text-ink-muted">
          The current set of incident categories used across the platform. For this semester project, categories are a
          curated fixed list; extending them only requires adding a value here and to the incident creation form.
        </p>
        <div className="flex flex-wrap gap-2">
          {INCIDENT_TYPES.map((type) => (
            <span key={type} className="rounded-full border border-hairline bg-panel-raised px-3 py-1 text-xs text-ink-muted">
              {type.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function ConfigRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-hairline-soft bg-panel-raised px-3.5 py-2.5">
      <Icon size={15} className="shrink-0 text-ink-faint" />
      <div>
        <p className="text-xs text-ink-faint">{label}</p>
        <p className="font-mono text-xs text-ink">{value}</p>
      </div>
    </div>
  );
}
