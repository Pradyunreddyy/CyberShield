import { UserCircle, Mail, ShieldCheck, Calendar } from "lucide-react";
import { Panel } from "../components/Primitives";
import { useAuth } from "../hooks/useAuth";
import { formatDateTime, titleCase } from "../utils/formatters";

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="max-w-xl space-y-4">
      <Panel>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-signal/15 text-signal">
            <UserCircle size={28} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink">{user.full_name}</h2>
            <p className="text-sm capitalize text-ink-muted">{titleCase(user.role)}</p>
          </div>
        </div>
      </Panel>

      <Panel title="Account Details">
        <dl className="space-y-3 text-sm">
          <Row icon={Mail} label="Email" value={user.email} />
          <Row icon={ShieldCheck} label="Role" value={titleCase(user.role)} />
          <Row icon={Calendar} label="Member Since" value={formatDateTime(user.created_at)} />
          <Row icon={ShieldCheck} label="Account Status" value={user.is_active ? "Active" : "Disabled"} />
        </dl>
      </Panel>

      <Panel title="About Your Role">
        <RoleDescription role={user.role} />
      </Panel>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-hairline-soft pb-2.5">
      <dt className="flex items-center gap-2 text-ink-faint">
        <Icon size={14} /> {label}
      </dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}

function RoleDescription({ role }) {
  const text = {
    developer: "You can upload projects to the Project Security Analyzer, review findings, create incidents from serious findings, and track incidents you've reported.",
    analyst: "You can manage the full incident lifecycle: create, investigate, and resolve incidents; use the AI Incident Analyzer; review project scans; and view analytics.",
    admin: "You have full platform access: manage users and roles, view all incidents and scans, review audit logs, and configure platform settings.",
  }[role];
  return <p className="text-sm text-ink-muted">{text}</p>;
}
