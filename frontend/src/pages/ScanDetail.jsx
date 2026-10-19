import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bot, FileCode2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Panel, SkeletonBlock, ErrorState, EmptyState } from "../components/Primitives";
import { RiskBadge, SeverityBadge, StatusBadge } from "../components/Badges";
import { Button } from "../components/Form";
import { Modal } from "../components/Modal";
import { scansApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { formatBytes, formatDateTime, titleCase } from "../utils/formatters";

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];

// Count chips double as filters. The number leads in the severity colour; the
// word is always present, so colour is never the only signal.
const CHIP_TONE = {
  critical: "text-severity-critical",
  high: "text-severity-high",
  medium: "text-severity-medium",
  low: "text-severity-low",
  info: "text-ink-muted",
};

export default function ScanDetail() {
  const { scanId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [creatingIncident, setCreatingIncident] = useState(false);
  const [filter, setFilter] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    scansApi
      .get(scanId)
      .then((res) => setScan(res.data))
      .catch((err) => setError(getApiErrorMessage(err, "Could not load this scan.")))
      .finally(() => setLoading(false));
  }, [scanId]);

  useEffect(() => {
    load();
  }, [load]);

  const findings = useMemo(
    () => (scan ? [...scan.findings].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)) : []),
    [scan]
  );
  const counts = useMemo(() => {
    const c = {};
    findings.forEach((f) => (c[f.severity] = (c[f.severity] || 0) + 1));
    return c;
  }, [findings]);

  async function handleCreateIncident(finding) {
    setCreatingIncident(true);
    try {
      const res = await scansApi.createIncidentFromFinding(scanId, finding.id);
      toast.success(`Incident ${res.data.code} created from this finding.`);
      navigate(`/incidents/${res.data.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not create an incident from this finding."));
    } finally {
      setCreatingIncident(false);
      setSelectedFinding(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading scan">
        <SkeletonBlock className="h-44" />
        <SkeletonBlock className="h-80" />
      </div>
    );
  }
  if (error) {
    return <ErrorState title="Unable to load scan" message={error} onRetry={load} />;
  }
  if (!scan) return null;

  const visible = filter ? findings.filter((f) => f.severity === filter) : findings;
  const groups = SEVERITY_ORDER.map((sev) => ({ sev, items: visible.filter((f) => f.severity === sev) })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      <Link to="/project-scanner" className="inline-flex items-center gap-1.5 rounded text-sm text-ink-muted transition-colors duration-120 hover:text-ink lg:hidden">
        <ArrowLeft size={14} aria-hidden="true" /> Back to project scanner
      </Link>

      <Panel bodyClassName="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="break-all text-xl font-semibold text-ink">{scan.original_filename}</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Uploaded <span className="tnum">{formatDateTime(scan.created_at)}</span> · {formatBytes(scan.file_size_bytes)}
            </p>
          </div>
          <div className="flex items-center gap-5">
            <div>
              <p className="mb-1 text-xs text-ink-muted">Status</p>
              <StatusBadge status={scan.status} />
            </div>
            <div>
              <p className="mb-1 text-xs text-ink-muted">Overall risk</p>
              {scan.overall_risk ? <RiskBadge risk={scan.overall_risk} /> : <span className="text-sm text-ink-muted">Pending</span>}
            </div>
          </div>
        </div>

        {scan.error_message && (
          <div role="alert" className="mt-4 rounded-md border border-state-danger/30 bg-state-danger/10 px-3.5 py-2.5 text-sm text-ink">
            {scan.error_message}
          </div>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-hairline bg-hairline sm:grid-cols-4">
          <Stat label="Files scanned" value={scan.files_scanned} />
          <Stat label="Files skipped" value={scan.files_skipped} />
          <Stat label="Suspicious files" value={scan.suspicious_file_count} />
          <Stat label="Findings" value={findings.length} />
        </dl>
      </Panel>

      <Panel
        title="Findings"
        description={filter ? `Showing ${visible.length} ${filter} of ${findings.length}` : "Most severe first"}
        action={
          findings.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-1.5" role="group" aria-label="Filter findings by severity">
              {SEVERITY_ORDER.filter((s) => counts[s]).map((sev) => {
                const on = filter === sev;
                return (
                  <button
                    key={sev}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFilter(on ? null : sev)}
                    className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors duration-120 ${
                      on ? "border-signal bg-signal/10 text-ink" : "border-hairline text-ink-muted hover:border-ink-faint/50 hover:text-ink"
                    }`}
                  >
                    <span className={`tnum font-mono font-semibold ${CHIP_TONE[sev]}`}>{counts[sev]}</span>
                    {titleCase(sev)}
                  </button>
                );
              })}
            </div>
          )
        }
      >
        {findings.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No suspicious patterns detected" description="Static analysis did not flag any findings in this project." />
        ) : (
          <div className="space-y-6">
            {groups.map(({ sev, items }) => (
              <section key={sev} aria-label={`${titleCase(sev)} findings`}>
                <h3 className="mb-2.5 flex items-center gap-2 text-xs font-medium text-ink-muted">
                  <span className={`tnum font-mono font-semibold ${CHIP_TONE[sev]}`}>{items.length}</span> {titleCase(sev)}
                </h3>
                <ul className="space-y-3">
                  {items.map((finding) => (
                    <li key={finding.id} className="rounded-md border border-hairline bg-panel-raised p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <SeverityBadge severity={finding.severity} />
                            <p className="font-medium text-ink">{finding.finding_type}</p>
                          </div>
                          <p className="mt-1.5 flex items-center gap-1.5 break-all font-mono text-xs text-ink-muted">
                            <FileCode2 size={12} aria-hidden="true" className="shrink-0" /> {finding.file_path}
                          </p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => setSelectedFinding(finding)}>
                          <ShieldAlert size={13} aria-hidden="true" /> Create security incident
                        </Button>
                      </div>

                      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-muted">{finding.description}</p>

                      {finding.evidence_snippet && (
                        <div className="mt-3">
                          <p className="mb-1 text-xs font-medium text-ink-muted">Evidence</p>
                          <pre
                            tabIndex={0}
                            aria-label="Evidence snippet"
                            className="overflow-x-auto rounded border border-hairline bg-well px-3 py-2 font-mono text-xs leading-relaxed text-ink"
                          >
                            {finding.evidence_snippet}
                          </pre>
                        </div>
                      )}

                      {finding.recommendation && (
                        <p className="mt-3 text-sm text-ink-muted">
                          <span className="font-medium text-ink">Recommendation: </span>
                          {finding.recommendation}
                        </p>
                      )}

                      {finding.ai_explanation && (
                        <div className="mt-3 flex items-start gap-2.5 rounded-md border border-signal/20 bg-signal/5 px-3 py-2.5">
                          <Bot size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-signal" />
                          <p className="text-sm text-ink-muted">
                            <span className="font-medium text-ink">AI explanation: </span>
                            {finding.ai_explanation}
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Panel>

      <Modal
        open={!!selectedFinding}
        onClose={() => setSelectedFinding(null)}
        title="Create security incident"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedFinding(null)}>
              Cancel
            </Button>
            <Button loading={creatingIncident} onClick={() => handleCreateIncident(selectedFinding)}>
              Confirm &amp; create
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          This will create a new incident linked to the finding <span className="font-mono text-ink">{selectedFinding?.finding_type}</span> in{" "}
          <span className="break-all font-mono text-ink">{selectedFinding?.file_path}</span>. A security analyst will be able to investigate it from the Incidents
          page.
        </p>
      </Modal>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-panel px-4 py-3">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="tnum mt-1 font-mono text-lg font-semibold text-ink">{value}</dd>
    </div>
  );
}
