import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Panel } from "../components/Primitives";
import { Button, Input, Select, Textarea } from "../components/Form";
import { incidentsApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";

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
    <div className="max-w-2xl">
      <Panel title="Report a Security Incident">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-md border border-state-danger/30 bg-state-danger/10 px-3 py-2 text-sm text-severity-critical">{error}</p>}

          <Input label="Title" required value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Brief incident summary" />

          <Textarea
            label="Description"
            rows={4}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="What happened? Include relevant logs, timestamps, and context."
          />

          <div className="grid grid-cols-2 gap-4">
            <Select label="Incident type" value={form.incident_type} onChange={(e) => update("incident_type", e.target.value)}>
              {INCIDENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
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

          <Input
            label="Affected asset"
            value={form.affected_asset}
            onChange={(e) => update("affected_asset", e.target.value)}
            placeholder="e.g. auth-service, finance-db-01"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input label="Source IP (optional)" value={form.source_ip} onChange={(e) => update("source_ip", e.target.value)} placeholder="203.0.113.4" />
            <Input label="Target IP (optional)" value={form.target_ip} onChange={(e) => update("target_ip", e.target.value)} placeholder="10.0.2.15" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              Create Incident
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
