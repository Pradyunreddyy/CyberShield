import { useEffect, useState } from "react";
import { Database, KeyRound, Server, Settings as SettingsIcon, Users, ListChecks, FolderSearch } from "lucide-react";
import { Panel, PageHeader, SkeletonBlock, ErrorState } from "../../components/Primitives";
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
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setError("");
    adminApi
      .overview()
      .then((res) => setOverview(res.data))
      .catch(() => setError("Could not load platform overview."));
  }, [reloadKey]);

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Platform overview and configuration reference." />

      {error && <ErrorState title="Overview unavailable" message={error} onRetry={() => setReloadKey((k) => k + 1)} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {!overview ? (
          error ? null : (
            <>
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
            </>
          )
        ) : (
          <>
            <StatCard label="Total users" value={overview.total_users} icon={Users} accent="signal" to="/admin/users" />
            <StatCard label="Total incidents" value={overview.total_incidents} icon={ListChecks} accent="warning" to="/incidents" />
            <StatCard label="Total project scans" value={overview.total_scans} icon={FolderSearch} accent="muted" to="/project-scanner" />
          </>
        )}
      </div>

      <Panel title="Platform configuration">
        <p className="mb-4 max-w-prose text-sm text-ink-muted">
          Sensitive configuration (database credentials, JWT secret, AI API key) is managed exclusively through backend environment variables and is never exposed
          to the frontend or stored in the browser.
        </p>
        <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <ConfigRow icon={Server} label="API base URL" value={API_BASE_URL} />
          <ConfigRow icon={Database} label="Database" value="Configured via DATABASE_URL (PostgreSQL in production)" />
          <ConfigRow icon={KeyRound} label="Authentication" value="JWT bearer tokens, bcrypt-hashed passwords" />
          <ConfigRow icon={SettingsIcon} label="AI provider" value="Configured via AI_PROVIDER / AI_API_KEY on the backend" />
        </dl>
      </Panel>

      <Panel title="Incident categories">
        <p className="mb-3 max-w-prose text-sm text-ink-muted">
          The incident categories used across the platform. Categories are a curated fixed list; extending them only requires adding a value here and to the incident
          creation form.
        </p>
        <ul className="flex flex-wrap gap-2">
          {INCIDENT_TYPES.map((type) => (
            <li key={type} className="rounded-md border border-hairline bg-panel-raised px-2.5 py-1 text-xs text-ink-muted">
              {type.replace(/_/g, " ")}
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function ConfigRow({ icon: Icon, label, value }) {
  return (
    <div className="rounded-md border border-hairline-soft bg-panel-raised px-3.5 py-3">
      <dt className="flex items-center gap-2 text-xs text-ink-muted">
        <Icon size={14} aria-hidden="true" className="shrink-0" /> {label}
      </dt>
      <dd className="mt-1.5 break-words font-mono text-xs text-ink">{value}</dd>
    </div>
  );
}
