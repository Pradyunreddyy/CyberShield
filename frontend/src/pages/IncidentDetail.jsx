import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Bot, Check, Clock, FileText, Info, Plus, ShieldAlert, Sparkles, Zap } from "lucide-react";
import { Panel, SkeletonBlock, ErrorState, EmptyState } from "../components/Primitives";
import { SeverityBadge, StatusBadge } from "../components/Badges";
import { Button, Input, Select, Textarea } from "../components/Form";
import { incidentsApi, aiApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../context/ToastContext";
import { formatDateTime, titleCase } from "../utils/formatters";

const TABS = ["Overview", "Investigation", "Timeline", "Response Actions", "AI Analyzer"];
const WORKFLOW = ["open", "investigating", "contained", "resolved", "closed"];

export default function IncidentDetail() {
  const { incidentId } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const canManage = user.role === "analyst" || user.role === "admin";

  const [incident, setIncident] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("Overview");
  const loadedRef = useRef(false);

  // The first load shows a skeleton. Later refreshes (after a status change,
  // a new note, ...) update in place: swapping the page for a skeleton would
  // unmount the tabs and discard anything the analyst had typed or generated.
  const load = useCallback(() => {
    incidentsApi
      .get(incidentId)
      .then((res) => {
        setIncident(res.data);
        setError("");
        loadedRef.current = true;
      })
      .catch((err) => {
        const message = getApiErrorMessage(err, "Could not load this incident.");
        if (loadedRef.current) toast.error(message);
        else setError(message);
      })
      .finally(() => setInitialLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  useEffect(() => {
    load();
  }, [load]);

  const retry = () => {
    setError("");
    setInitialLoading(true);
    load();
  };

  const back = (
    <Link to="/incidents" className="mb-4 inline-flex items-center gap-1.5 rounded text-sm text-ink-muted transition-colors duration-120 hover:text-ink lg:hidden">
      <ArrowLeft size={14} aria-hidden="true" /> Back to incidents
    </Link>
  );

  if (initialLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading incident">
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-10" />
        <SkeletonBlock className="h-80" />
      </div>
    );
  }
  if (error) {
    return (
      <>
        {back}
        <ErrorState title="Unable to load incident" message={error} onRetry={retry} />
      </>
    );
  }
  if (!incident) return null;

  const counts = {
    Investigation: incident.notes.length,
    Timeline: incident.timeline_events.length,
    "Response Actions": incident.actions.length,
  };

  return (
    <div className="space-y-5">
      {back}

      <Panel bodyClassName="p-5">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-sm text-signal">{incident.code}</span>
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
            </div>
            <h1 className="mt-2 text-xl font-semibold text-ink">{incident.title}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Reported by {incident.reporter?.full_name || "Unknown"} · <span className="tnum">{formatDateTime(incident.created_at)}</span>
            </p>
          </div>
          {canManage && <IncidentControls incident={incident} onUpdated={load} />}
        </div>
        <StatusProgress status={incident.status} />
      </Panel>

      <Tabs tabs={TABS} counts={counts} active={activeTab} onChange={setActiveTab} />

      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} tabIndex={0} className="focus:outline-none focus-visible:outline-2">
        {activeTab === "Overview" && <OverviewTab incident={incident} />}
        {activeTab === "Investigation" && <InvestigationTab incident={incident} canManage={canManage} onUpdated={load} toast={toast} />}
        {activeTab === "Timeline" && <TimelineTab incident={incident} canManage={canManage} onUpdated={load} toast={toast} />}
        {activeTab === "Response Actions" && <ActionsTab incident={incident} canManage={canManage} onUpdated={load} toast={toast} />}
        {activeTab === "AI Analyzer" && canManage && <AIAnalyzerTab incident={incident} />}
        {activeTab === "AI Analyzer" && !canManage && (
          <Panel>
            <p className="text-sm text-ink-muted">Only security analysts and administrators can run the AI Incident Analyzer.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}

// Where the incident sits in the real status model. Purely derived from
// `incident.status`; nothing here is a separate piece of state.
function StatusProgress({ status }) {
  const current = Math.max(0, WORKFLOW.indexOf(status));
  const done = status === "resolved" || status === "closed";
  return (
    <ol aria-label="Incident progress" className="mt-5 flex items-center border-t border-hairline-soft pt-4">
      {WORKFLOW.map((step, i) => {
        const reached = i <= current;
        const isCurrent = i === current;
        const tone = reached ? (done ? "bg-state-success" : "bg-signal") : "bg-hairline";
        return (
          <li key={step} aria-current={isCurrent ? "step" : undefined} className={`flex items-center ${i < WORKFLOW.length - 1 ? "flex-1" : ""}`}>
            <span className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-180 ${tone} ${
                  isCurrent ? "ring-4 ring-signal/20" : ""
                } ${isCurrent && done ? "!ring-state-success/20" : ""}`}
              >
                {reached && !isCurrent && <Check size={11} aria-hidden="true" className="text-void" />}
                {isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-void" />}
              </span>
              <span className={`text-xs ${isCurrent ? "font-medium text-ink" : reached ? "text-ink-muted" : "text-ink-faint"} ${isCurrent ? "" : "hidden sm:inline"}`}>
                {titleCase(step)}
              </span>
            </span>
            {i < WORKFLOW.length - 1 && <span aria-hidden="true" className={`mx-3 h-px flex-1 transition-colors duration-180 ${i < current ? (done ? "bg-state-success/60" : "bg-signal/60") : "bg-hairline"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

// WAI-ARIA tabs: arrow keys move between tabs, Home/End jump.
function Tabs({ tabs, counts, active, onChange }) {
  const refs = useRef({});
  function onKeyDown(e) {
    const i = tabs.indexOf(active);
    let next = null;
    if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
    else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
    else if (e.key === "Home") next = tabs[0];
    else if (e.key === "End") next = tabs[tabs.length - 1];
    if (next) {
      e.preventDefault();
      onChange(next);
      refs.current[next]?.focus();
    }
  }
  return (
    <div role="tablist" aria-label="Incident sections" onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto border-b border-hairline">
      {tabs.map((tab) => {
        const selected = active === tab;
        return (
          <button
            key={tab}
            ref={(el) => (refs.current[tab] = el)}
            type="button"
            role="tab"
            id={`tab-${tab}`}
            aria-selected={selected}
            aria-controls={`panel-${tab}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors duration-120 ${
              selected ? "border-signal text-ink" : "border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {tab}
            {counts[tab] > 0 && <span className="tnum rounded bg-panel-raised px-1.5 py-px font-mono text-2xs text-ink-muted">{counts[tab]}</span>}
          </button>
        );
      })}
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
    <div className="flex flex-wrap gap-2.5">
      <Select label="Status" wrapperClassName="w-40" value={incident.status} onChange={(e) => updateField("status", e.target.value)} disabled={updating}>
        {WORKFLOW.map((s) => (
          <option key={s} value={s}>
            {titleCase(s)}
          </option>
        ))}
      </Select>
      <Select label="Severity" wrapperClassName="w-32" value={incident.severity} onChange={(e) => updateField("severity", e.target.value)} disabled={updating}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </Select>
      <Select
        label="Assigned analyst"
        wrapperClassName="w-48"
        value={incident.assigned_analyst?.id || ""}
        onChange={(e) => updateField("assigned_analyst_id", e.target.value || null)}
        disabled={updating}
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
        <p className="max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">{incident.description || "No description provided."}</p>
      </Panel>
      <Panel title="Details">
        <dl className="text-sm">
          <Detail label="Type" value={titleCase(incident.incident_type)} />
          <Detail label="Source" value={titleCase(incident.source)} />
          <Detail label="Affected asset" value={incident.affected_asset || "—"} mono />
          <Detail label="Source IP" value={incident.source_ip || "—"} mono />
          <Detail label="Target IP" value={incident.target_ip || "—"} mono />
          <Detail label="Assigned analyst" value={incident.assigned_analyst?.full_name || "Unassigned"} />
          <Detail label="Last updated" value={formatDateTime(incident.updated_at)} mono last />
        </dl>
      </Panel>
    </div>
  );
}

function Detail({ label, value, mono, last }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-2.5 ${last ? "" : "border-b border-hairline-soft"}`}>
      <dt className="shrink-0 text-ink-muted">{label}</dt>
      <dd className={`min-w-0 break-words text-right text-ink ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
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
    <Panel title="Investigation notes">
      {canManage && (
        <form onSubmit={handleAddNote} className="mb-5 flex gap-2">
          <Textarea
            aria-label="New investigation note"
            wrapperClassName="flex-1"
            rows={2}
            placeholder="Add findings, evidence metadata, or analyst comments…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <Button type="submit" loading={submitting} className="self-end">
            <Plus size={14} aria-hidden="true" /> Add
          </Button>
        </form>
      )}

      {incident.notes.length === 0 ? (
        <EmptyState icon={FileText} title="No investigation notes yet" description="Record findings and evidence as the investigation progresses." />
      ) : (
        <ul className="space-y-3">
          {incident.notes
            .slice()
            .reverse()
            .map((note) => (
              <li key={note.id} className="rounded-md border border-hairline-soft bg-panel-raised p-3.5">
                <div className="mb-1.5 flex items-center gap-2 text-xs text-ink-muted">
                  <FileText size={12} aria-hidden="true" /> {note.author?.full_name || "System"} · <span className="tnum">{formatDateTime(note.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink">{note.content}</p>
              </li>
            ))}
        </ul>
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
    <Panel title="Incident timeline">
      {canManage && (
        <form onSubmit={handleAdd} className="mb-5 flex gap-2">
          <Input
            aria-label="New timeline event"
            wrapperClassName="flex-1"
            placeholder="e.g. Threat contained by isolating host"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Button type="submit" loading={submitting}>
            <Plus size={14} aria-hidden="true" /> Add
          </Button>
        </form>
      )}

      {incident.timeline_events.length === 0 ? (
        <EmptyState icon={Clock} title="No timeline events yet" description="Add key moments — detection, containment, remediation — as they happen." />
      ) : (
        <ol className="stagger relative ml-2.5 space-y-5 border-l border-hairline pl-6">
          {incident.timeline_events.map((event, i) => (
            <li key={event.id} style={{ "--i": i }} className="relative animate-rise">
              <span aria-hidden="true" className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full bg-signal ring-4 ring-panel" />
              <div className="tnum flex items-center gap-2 font-mono text-xs text-ink-muted">
                <Clock size={11} aria-hidden="true" /> {formatDateTime(event.event_time)}
              </div>
              <p className="mt-0.5 text-sm text-ink">{event.description}</p>
              {event.author && <p className="text-xs text-ink-muted">by {event.author.full_name}</p>}
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
    <Panel title="Response actions">
      {canManage && (
        <form onSubmit={handleAdd} className="mb-5 flex flex-wrap items-end gap-2">
          <Input
            aria-label="Action taken"
            list="action-presets"
            wrapperClassName="min-w-[200px] flex-1"
            placeholder="Action taken"
            value={action}
            onChange={(e) => setAction(e.target.value)}
          />
          <datalist id="action-presets">
            {ACTION_PRESETS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <Select aria-label="Action result" wrapperClassName="w-36" value={result} onChange={(e) => setResult(e.target.value)}>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </Select>
          <Button type="submit" loading={submitting}>
            <Zap size={14} aria-hidden="true" /> Record
          </Button>
        </form>
      )}

      {incident.actions.length === 0 ? (
        <EmptyState icon={Zap} title="No response actions recorded" description="Log containment and remediation steps so the response is auditable." />
      ) : (
        <ul className="space-y-2">
          {incident.actions.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-hairline-soft bg-panel-raised px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-sm text-ink">{a.action}</p>
                <p className="text-xs text-ink-muted">
                  by {a.performed_by?.full_name || "System"} · <span className="tnum">{formatDateTime(a.created_at)}</span>
                </p>
              </div>
              <StatusBadge status={a.result} />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function AiSection({ title, children }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-medium text-ink-muted">{title}</h3>
      {children}
    </section>
  );
}

function NumberedList({ items }) {
  return (
    <ol className="space-y-2">
      {items.map((s, idx) => (
        <li key={idx} className="flex gap-3 text-sm text-ink">
          <span className="tnum mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-well font-mono text-2xs text-ink-muted ring-1 ring-hairline">{idx + 1}</span>
          <span>{s}</span>
        </li>
      ))}
    </ol>
  );
}

function AIAnalyzerTab({ incident }) {
  const [description, setDescription] = useState(incident.description || "");
  const [logs, setLogs] = useState("");
  const [indicators, setIndicators] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);

  // Real elapsed time of the real request. No invented "phases".
  useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return undefined;
    }
    const started = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(t);
  }, [loading]);

  async function handleAnalyze(e) {
    e?.preventDefault();
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
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Panel title="Analysis input" description="What the analyzer is given" className="lg:col-span-2">
        <form onSubmit={handleAnalyze} className="space-y-3.5">
          <Textarea label="Incident description" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          <Textarea label="Logs / text (optional)" rows={4} value={logs} onChange={(e) => setLogs(e.target.value)} placeholder="Paste relevant log lines here…" className="font-mono text-xs" />
          <Textarea label="Known indicators (optional)" rows={2} value={indicators} onChange={(e) => setIndicators(e.target.value)} placeholder="IPs, hashes, domains…" className="font-mono text-xs" />
          <Button type="submit" loading={loading} className="w-full">
            <Sparkles size={15} aria-hidden="true" /> Run AI incident analyzer
          </Button>
        </form>
      </Panel>

      <Panel title="AI assessment" className="lg:col-span-3">
        <div aria-live="polite">
          {error && <ErrorState title="Analysis failed" message={error} onRetry={handleAnalyze} retryLabel="Run again" />}

          {loading && (
            <div className="py-10 text-center" role="status">
              <p className="text-sm font-medium text-ink">Analyzing incident…</p>
              <div className="mx-auto mt-4 h-1 w-56 overflow-hidden rounded-full bg-hairline">
                <div className="h-full w-1/3 animate-sweep rounded-full bg-signal" />
              </div>
              <p className="tnum mt-3 text-xs text-ink-muted">{elapsed}s elapsed</p>
            </div>
          )}

          {!loading && !result && !error && (
            <EmptyState icon={Bot} title="No assessment yet" description="Run the analyzer to get a risk assessment, likely attack technique, and recommended next steps." />
          )}

          {result && (
            <div className="animate-fade space-y-5">
              {result.degraded ? (
                <div role="status" className="flex items-start gap-2.5 rounded-md border border-severity-medium/30 bg-severity-medium/10 px-3.5 py-3 text-sm text-severity-medium">
                  <ShieldAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
                  <p>
                    <span className="font-medium">Rule-based fallback.</span> The AI provider was unavailable, so this assessment comes from fixed rules, not an AI model.
                  </p>
                </div>
              ) : (
                <p className="inline-flex items-center gap-1.5 rounded-md border border-signal/25 bg-signal/10 px-2 py-1 text-xs font-medium text-signal">
                  <Sparkles size={12} aria-hidden="true" /> AI-generated assessment
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 rounded-md border border-hairline bg-well p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-ink-muted">Risk level</p>
                  <div className="mt-1.5">
                    <SeverityBadge severity={result.risk_level} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-ink-muted">Possible type</p>
                  <p className="mt-1 text-sm font-medium text-ink">{titleCase(result.possible_type)}</p>
                </div>
              </div>

              <AiSection title="Summary">
                <p className="max-w-prose text-sm leading-relaxed text-ink">{result.summary}</p>
              </AiSection>

              {result.possible_attack_technique && (
                <AiSection title="Possible attack technique">
                  <p className="text-sm text-ink">{result.possible_attack_technique}</p>
                </AiSection>
              )}

              {result.suspicious_indicators?.length > 0 && (
                <AiSection title="Suspicious indicators">
                  <ul className="space-y-1.5">
                    {result.suspicious_indicators.map((i, idx) => (
                      <li key={idx} className="flex gap-2.5 text-sm text-ink">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-severity-high" />
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                </AiSection>
              )}

              <AiSection title="Recommended investigation steps">
                <NumberedList items={result.recommended_investigation_steps} />
              </AiSection>

              <AiSection title="Recommended response actions">
                <NumberedList items={result.recommended_response_actions} />
              </AiSection>

              <p className="flex items-start gap-2 border-t border-hairline-soft pt-4 text-xs text-ink-muted">
                <Info size={13} aria-hidden="true" className="mt-px shrink-0" />
                {result.disclaimer}
              </p>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
