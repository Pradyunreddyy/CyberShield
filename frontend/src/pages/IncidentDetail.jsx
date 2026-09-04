import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bot,
  Clock,
  FileText,
  Loader2,
  Plus,
  ShieldAlert,
  Sparkles,
  Zap,
} from "lucide-react";
import { Panel, SkeletonBlock, ErrorState } from "../components/Primitives";
import { SeverityBadge, StatusBadge } from "../components/Badges";
import { Button, Input, Select, Textarea } from "../components/Form";
import { Modal } from "../components/Modal";
import { incidentsApi, aiApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import { formatDateTime, titleCase } from "../utils/formatters";

const TABS = ["Overview", "Investigation", "Timeline", "Response Actions", "AI Analyzer"];

export default function IncidentDetail() {
  const { incidentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const canManage = user.role === "analyst" || user.role === "admin";

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Overview");

  const load = useCallback(() => {
    setLoading(true);
    incidentsApi
      .get(incidentId)
      .then((res) => setIncident(res.data))
      .catch((err) => setError(getApiErrorMessage(err, "Could not load this incident.")))
      .finally(() => setLoading(false));
  }, [incidentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-96" />
      </div>
    );
  }
  if (error) return <ErrorState message={error} />;
  if (!incident) return null;

  return (
    <div className="space-y-4">
      <button onClick={() => navigate("/incidents")} className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={14} /> Back to incidents
      </button>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm text-signal">{incident.code}</span>
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
            <h2 className="mt-2 text-lg font-semibold text-ink">{incident.title}</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Reported by {incident.reporter?.full_name || "Unknown"} &middot; {formatDateTime(incident.created_at)}
            </p>
          </div>
          {canManage && <IncidentControls incident={incident} onUpdated={load} />}
        </div>
      </Panel>

      <div className="flex gap-1 border-b border-hairline">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3.5 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab ? "border-b-2 border-signal text-ink" : "text-ink-muted hover:text-ink"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && <OverviewTab incident={incident} />}
      {activeTab === "Investigation" && <InvestigationTab incident={incident} canManage={canManage} onUpdated={load} toast={toast} />}
      {activeTab === "Timeline" && <TimelineTab incident={incident} canManage={canManage} onUpdated={load} toast={toast} />}
      {activeTab === "Response Actions" && <ActionsTab incident={incident} canManage={canManage} onUpdated={load} toast={toast} />}
      {activeTab === "AI Analyzer" && canManage && <AIAnalyzerTab incident={incident} toast={toast} />}
      {activeTab === "AI Analyzer" && !canManage && (
        <Panel>
          <p className="text-sm text-ink-muted">Only security analysts and administrators can run the AI Incident Analyzer.</p>
        </Panel>
      )}
    </div>
  );
}

function IncidentControls({ incident, onUpdated }) {
  const toast = useToast();
  const [updating, setUpdating] = useState(false);
  const [analysts, setAnalysts] = useState([]);

  useEffect(() => {
    incidentsApi
      .assignableAnalysts()
      .then((res) => setAnalysts(res.data))
      .catch(() => {});
  }, []);

  async function updateField(field, value) {
    setUpdating(true);
    try {
      await incidentsApi.update(incident.id, { [field]: value });
      toast.success("Incident updated.");
      onUpdated();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update the incident."));
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={incident.status} onChange={(e) => updateField("status", e.target.value)} disabled={updating} className="w-40">
        <option value="open">Open</option>
        <option value="investigating">Investigating</option>
        <option value="contained">Contained</option>
        <option value="resolved">Resolved</option>
        <option value="closed">Closed</option>
      </Select>
      <Select value={incident.severity} onChange={(e) => updateField("severity", e.target.value)} disabled={updating} className="w-32">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </Select>
      <Select
        value={incident.assigned_analyst?.id || ""}
        onChange={(e) => updateField("assigned_analyst_id", e.target.value || null)}
        disabled={updating}
        className="w-48"
      >
        <option value="">Unassigned</option>
        {analysts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.full_name}
          </option>
        ))}
      </Select>
    </div>
  );
}

function OverviewTab({ incident }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Panel title="Description" className="lg:col-span-2">
        <p className="whitespace-pre-wrap text-sm text-ink-muted">{incident.description || "No description provided."}</p>
      </Panel>
      <Panel title="Details">
        <dl className="space-y-3 text-sm">
          <Detail label="Type" value={titleCase(incident.incident_type)} />
          <Detail label="Source" value={titleCase(incident.source)} />
          <Detail label="Affected Asset" value={incident.affected_asset || "-"} mono />
          <Detail label="Source IP" value={incident.source_ip || "-"} mono />
          <Detail label="Target IP" value={incident.target_ip || "-"} mono />
          <Detail label="Assigned Analyst" value={incident.assigned_analyst?.full_name || "Unassigned"} />
          <Detail label="Last Updated" value={formatDateTime(incident.updated_at)} mono />
        </dl>
      </Panel>
    </div>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between border-b border-hairline-soft pb-2">
      <dt className="text-ink-faint">{label}</dt>
      <dd className={`text-ink ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

function InvestigationTab({ incident, canManage, onUpdated, toast }) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAddNote(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await incidentsApi.addNote(incident.id, { content });
      setContent("");
      toast.success("Note added.");
      onUpdated();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not add note."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel title="Investigation Notes">
      {canManage && (
        <form onSubmit={handleAddNote} className="mb-4 flex gap-2">
          <Textarea rows={2} className="flex-1" placeholder="Add findings, evidence metadata, or analyst comments..." value={content} onChange={(e) => setContent(e.target.value)} />
          <Button type="submit" loading={submitting} className="self-end">
            <Plus size={14} /> Add
          </Button>
        </form>
      )}

      {incident.notes.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">No investigation notes yet.</p>
      ) : (
        <div className="space-y-3">
          {incident.notes
            .slice()
            .reverse()
            .map((note) => (
              <div key={note.id} className="rounded-md border border-hairline-soft bg-panel-raised p-3">
                <div className="mb-1.5 flex items-center gap-2 text-xs text-ink-faint">
                  <FileText size={12} /> {note.author?.full_name || "System"} &middot; {formatDateTime(note.created_at)}
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink">{note.content}</p>
              </div>
            ))}
        </div>
      )}
    </Panel>
  );
}

function TimelineTab({ incident, canManage, onUpdated, toast }) {
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!description.trim()) return;
    setSubmitting(true);
    try {
      await incidentsApi.addTimelineEvent(incident.id, { description });
      setDescription("");
      toast.success("Timeline event added.");
      onUpdated();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not add timeline event."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel title="Incident Timeline">
      {canManage && (
        <form onSubmit={handleAdd} className="mb-4 flex gap-2">
          <Input className="flex-1" placeholder="e.g. Threat contained by isolating host" value={description} onChange={(e) => setDescription(e.target.value)} />
          <Button type="submit" loading={submitting}>
            <Plus size={14} /> Add
          </Button>
        </form>
      )}

      {incident.timeline_events.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">No timeline events recorded yet.</p>
      ) : (
        <ol className="relative ml-2.5 space-y-5 border-l border-hairline pl-5">
          {incident.timeline_events.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[26px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-signal ring-4 ring-void" />
              <div className="flex items-center gap-2 font-mono text-xs text-ink-faint">
                <Clock size={11} /> {formatDateTime(event.event_time)}
              </div>
              <p className="mt-0.5 text-sm text-ink">{event.description}</p>
              {event.author && <p className="text-xs text-ink-faint">by {event.author.full_name}</p>}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

const ACTION_PRESETS = ["Blocked IP", "Disabled account", "Isolated machine", "Removed suspicious file", "Reset credentials"];

function ActionsTab({ incident, canManage, onUpdated, toast }) {
  const [action, setAction] = useState("");
  const [result, setResult] = useState("completed");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!action.trim()) return;
    setSubmitting(true);
    try {
      await incidentsApi.addAction(incident.id, { action, result });
      setAction("");
      toast.success("Response action recorded.");
      onUpdated();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not record action."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Panel title="Response Actions">
      {canManage && (
        <form onSubmit={handleAdd} className="mb-4 flex flex-wrap gap-2">
          <Input list="action-presets" className="flex-1 min-w-[200px]" placeholder="Action taken" value={action} onChange={(e) => setAction(e.target.value)} />
          <datalist id="action-presets">
            {ACTION_PRESETS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <Select value={result} onChange={(e) => setResult(e.target.value)} className="w-36">
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </Select>
          <Button type="submit" loading={submitting}>
            <Zap size={14} /> Record
          </Button>
        </form>
      )}

      {incident.actions.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">No response actions recorded yet.</p>
      ) : (
        <div className="space-y-2">
          {incident.actions.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-md border border-hairline-soft bg-panel-raised px-3.5 py-2.5">
              <div>
                <p className="text-sm text-ink">{a.action}</p>
                <p className="text-xs text-ink-faint">
                  by {a.performed_by?.full_name || "System"} &middot; {formatDateTime(a.created_at)}
                </p>
              </div>
              <StatusBadge status={a.result} />
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function AIAnalyzerTab({ incident, toast }) {
  const [description, setDescription] = useState(incident.description || "");
  const [logs, setLogs] = useState("");
  const [indicators, setIndicators] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAnalyze(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const res = await aiApi.analyzeIncident({ incident_id: incident.id, description, logs: logs || undefined, indicators: indicators || undefined });
      setResult(res.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "The AI Incident Analyzer could not be reached."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Panel title="Analysis Input">
        <form onSubmit={handleAnalyze} className="space-y-3">
          <Textarea label="Incident description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          <Textarea label="Logs / text (optional)" rows={4} value={logs} onChange={(e) => setLogs(e.target.value)} placeholder="Paste relevant log lines here..." />
          <Textarea label="Known indicators (optional)" rows={2} value={indicators} onChange={(e) => setIndicators(e.target.value)} placeholder="IPs, hashes, domains..." />
          <Button type="submit" loading={loading} className="w-full">
            <Sparkles size={15} /> Run AI Incident Analyzer
          </Button>
        </form>
      </Panel>

      <Panel title="AI Assessment">
        {error && <ErrorState message={error} />}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-ink-muted">
            <Loader2 size={20} className="animate-spin" />
            <p className="text-sm">Analyzing incident data...</p>
          </div>
        )}
        {!loading && !result && !error && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-ink-muted">
            <Bot size={24} className="text-ink-faint" />
            <p className="text-sm">Run the analyzer to get an AI-assisted risk assessment.</p>
          </div>
        )}
        {result && (
          <div className="space-y-4">
            {result.degraded && (
              <div className="flex items-center gap-2 rounded-md border border-severity-medium/30 bg-severity-medium/10 px-3 py-2 text-xs text-severity-medium">
                <ShieldAlert size={13} /> AI provider unavailable — showing a rule-based fallback assessment.
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">Risk Level</span>
              <SeverityBadge severity={result.risk_level} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Possible Type</p>
              <p className="text-sm text-ink">{result.possible_type}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Summary</p>
              <p className="text-sm text-ink-muted">{result.summary}</p>
            </div>
            {result.possible_attack_technique && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Possible Attack Technique</p>
                <p className="text-sm text-ink-muted">{result.possible_attack_technique}</p>
              </div>
            )}
            {result.suspicious_indicators?.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Suspicious Indicators</p>
                <ul className="mt-1 list-inside list-disc text-sm text-ink-muted">
                  {result.suspicious_indicators.map((i, idx) => (
                    <li key={idx}>{i}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Recommended Investigation Steps</p>
              <ol className="mt-1 list-inside list-decimal space-y-0.5 text-sm text-ink-muted">
                {result.recommended_investigation_steps.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ol>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Recommended Response Actions</p>
              <ol className="mt-1 list-inside list-decimal space-y-0.5 text-sm text-ink-muted">
                {result.recommended_response_actions.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ol>
            </div>
            <p className="border-t border-hairline-soft pt-3 text-xs italic text-ink-faint">{result.disclaimer}</p>
          </div>
        )}
      </Panel>
    </div>
  );
}
