import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bot, FileWarning, ShieldAlert, ShieldCheck } from "lucide-react";
import { Panel, SkeletonBlock, ErrorState, EmptyState } from "../components/Primitives";
import { RiskBadge } from "../components/Badges";
import { Button } from "../components/Form";
import { Modal } from "../components/Modal";
import { scansApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { formatBytes, formatDateTime, titleCase } from "../utils/formatters";

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"];
const SEVERITY_CARD_STYLES = {
  critical: "border-severity-critical/30 bg-severity-critical/10 text-severity-critical",
  high: "border-severity-high/30 bg-severity-high/10 text-severity-high",
  medium: "border-severity-medium/30 bg-severity-medium/10 text-severity-medium",
  low: "border-severity-low/30 bg-severity-low/10 text-severity-low",
  info: "border-hairline bg-panel-raised text-ink-muted",
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

  const load = useCallback(() => {
    setLoading(true);
    scansApi
      .get(scanId)
      .then((res) => setScan(res.data))
      .catch((err) => setError(getApiErrorMessage(err, "Could not load this scan.")))
      .finally(() => setLoading(false));
  }, [scanId]);

  useEffect(() => {
    load();
  }, [load]);

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

  if (loading) return <SkeletonBlock className="h-96" />;
  if (error) return <ErrorState message={error} />;
  if (!scan) return null;

  const findings = [...scan.findings].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));

  return (
    <div className="space-y-4">
      <button onClick={() => navigate("/project-scanner")} className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink">
        <ArrowLeft size={14} /> Back to Project Scanner
      </button>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">{scan.original_filename}</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Uploaded {formatDateTime(scan.created_at)} &middot; {formatBytes(scan.file_size_bytes)}
            </p>
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs uppercase tracking-wide text-ink-faint">Overall Risk</p>
            {scan.overall_risk ? <RiskBadge risk={scan.overall_risk} /> : <span className="text-sm text-ink-muted">Pending</span>}
          </div>
        </div>

        {scan.error_message && (
          <div className="mt-4 rounded-md border border-state-danger/30 bg-state-danger/10 px-3.5 py-2.5 text-sm text-severity-critical">
            {scan.error_message}
          </div>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBlock label="Files Scanned" value={scan.files_scanned} />
          <StatBlock label="Files Skipped" value={scan.files_skipped} />
          <StatBlock label="Suspicious Files" value={scan.suspicious_file_count} />
          <StatBlock label="Findings" value={findings.length} />
        </div>
      </Panel>

      <Panel title="Findings">
        {findings.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No suspicious patterns detected" description="Static analysis did not flag any findings in this project." />
        ) : (
          <div className="space-y-3">
            {findings.map((finding) => (
              <div key={finding.id} className={`rounded-md border p-4 ${SEVERITY_CARD_STYLES[finding.severity] || SEVERITY_CARD_STYLES.info}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileWarning size={14} />
                      <span className="font-mono text-xs uppercase tracking-wide">{finding.severity}</span>
                    </div>
                    <p className="mt-1 font-medium text-ink">{finding.finding_type}</p>
                    <p className="mt-0.5 font-mono text-xs text-ink-faint">{finding.file_path}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setSelectedFinding(finding)}>
                    <ShieldAlert size={13} /> Create Security Incident
                  </Button>
                </div>
                <p className="mt-3 text-sm text-ink-muted">{finding.description}</p>
                {finding.evidence_snippet && (
                  <pre className="mt-2 overflow-x-auto rounded bg-void/60 px-3 py-2 font-mono text-xs text-ink-muted">{finding.evidence_snippet}</pre>
                )}
                {finding.recommendation && (
                  <p className="mt-2 text-xs text-ink-muted">
                    <span className="font-medium text-ink">Recommendation:</span> {finding.recommendation}
                  </p>
                )}
                {finding.ai_explanation && (
                  <div className="mt-3 flex items-start gap-2 rounded-md border border-hairline-soft bg-panel/60 px-3 py-2">
                    <Bot size={13} className="mt-0.5 shrink-0 text-signal" />
                    <p className="text-xs text-ink-muted">
                      <span className="font-medium text-ink">AI explanation:</span> {finding.ai_explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Modal
        open={!!selectedFinding}
        onClose={() => setSelectedFinding(null)}
        title="Create Security Incident"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedFinding(null)}>
              Cancel
            </Button>
            <Button loading={creatingIncident} onClick={() => handleCreateIncident(selectedFinding)}>
              Confirm & Create
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          This will create a new incident linked to the finding{" "}
          <span className="font-mono text-ink">{selectedFinding?.finding_type}</span> in{" "}
          <span className="font-mono text-ink">{selectedFinding?.file_path}</span>. A security analyst will be able to investigate it from the
          Incidents page.
        </p>
      </Modal>
    </div>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="rounded-md border border-hairline-soft bg-panel-raised px-3 py-2.5 text-center">
      <div className="font-mono text-lg font-semibold text-ink">{value}</div>
      <div className="text-xs text-ink-faint">{label}</div>
    </div>
  );
}
