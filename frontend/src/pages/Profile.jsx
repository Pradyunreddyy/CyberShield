import { Mail, ShieldCheck, Calendar, Activity } from "lucide-react";
import { Panel, PageHeader } from "../components/Primitives";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, titleCase } from "../utils/formatters";

export default function Profile() {
  const { user } = useAuth();
  const initials = (user.full_name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="max-w-3xl">
      <PageHeader title="Profile" description="Your account and what your role allows." />

      <div className="space-y-4">
        <Panel bodyClassName="p-5">
          <div className="flex items-center gap-4">
            <div aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-signal/15 text-lg font-semibold text-signal ring-1 ring-signal/25">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-ink">{user.full_name}</p>
              <p className="text-sm text-ink-muted">{titleCase(user.role)}</p>
            </div>
          </div>
        </Panel>

        <Panel title="Account details">
          <dl className="text-sm">
            <Row icon={Mail} label="Email" value={user.email} />
            <Row icon={ShieldCheck} label="Role" value={titleCase(user.role)} />
            <Row icon={Calendar} label="Member since" value={formatDateTime(user.created_at)} mono />
            <Row icon={Activity} label="Account status" value={user.is_active ? "Active" : "Disabled"} last />
          </dl>
        </Panel>

        <Panel title="About your role">
          <RoleDescription role={user.role} />
        </Panel>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, mono, last }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${last ? "" : "border-b border-hairline-soft"}`}>
      <dt className="flex items-center gap-2 text-ink-muted">
        <Icon size={14} aria-hidden="true" /> {label}
      </dt>
      <dd className={`min-w-0 break-words text-right text-ink ${mono ? "tnum font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function RoleDescription({ role }) {
  const text = {
    developer: "You can upload projects to the Project Security Analyzer, review findings, create incidents from serious findings, and track incidents you've reported.",
    analyst: "You can manage the full incident lifecycle: create, investigate, and resolve incidents; use the AI Incident Analyzer; review project scans; and view analytics.",
    admin: "You have full platform access: manage users and roles, view all incidents and scans, review audit logs, and configure platform settings.",
  }[role];
  return <p className="max-w-prose text-sm leading-relaxed text-ink-muted">{text}</p>;
}
