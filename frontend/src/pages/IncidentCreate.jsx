import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Panel, PageHeader, ErrorState } from "../components/Primitives";
import { Button, Input, Select, Textarea } from "../components/Form";
import { incidentsApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { titleCase } from "../utils/formatters";

const INCIDENT_TYPES = [
  "phishing",
  "malware",
  "ransomware",
  "credential_attack",
  "ddos",
  "data_exfiltration",
  "insider_threat",
  "misconfiguration",
  "uncategorized",
];

export default function IncidentCreate() {
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState({
    title: "",
    description: "",
    incident_type: "uncategorized",
    severity: "low",
    affected_asset: "",
    source_ip: "",
    target_ip: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await incidentsApi.create(form);
      toast.success(`Incident ${res.data.code} created.`);
      navigate(`/incidents/${res.data.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not create the incident."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Report a security incident" description="Describe what happened. You can add notes, timeline events and response actions after it's created." />

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <ErrorState title="Incident not created" message={error} />}

        <Panel title="What happened">
          <div className="space-y-4">
            <Input label="Title" required autoFocus value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Brief incident summary" />
            <Textarea
              label="Description"
              rows={5}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="What happened? Include relevant logs, timestamps, and context."
            />
          </div>
        </Panel>

        <Panel title="Classification">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Incident type" value={form.incident_type} onChange={(e) => update("incident_type", e.target.value)}>
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {titleCase(t)}
                </option>
              ))}
            </Select>
            <Select label="Severity" value={form.severity} onChange={(e) => update("severity", e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </div>
        </Panel>

        <Panel title="Technical details" description="Optional, but helps the analyst triage faster.">
          <div className="space-y-4">
            <Input label="Affected asset" value={form.affected_asset} onChange={(e) => update("affected_asset", e.target.value)} placeholder="e.g. auth-service, finance-db-01" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input label="Source IP" value={form.source_ip} onChange={(e) => update("source_ip", e.target.value)} placeholder="203.0.113.4" className="font-mono" />
              <Input label="Target IP" value={form.target_ip} onChange={(e) => update("target_ip", e.target.value)} placeholder="10.0.2.15" className="font-mono" />
            </div>
          </div>
        </Panel>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Create incident
          </Button>
        </div>
      </form>
    </div>
  );
}
