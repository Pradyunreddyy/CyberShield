import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadCloud, ScanSearch, FileArchive, Loader2 } from "lucide-react";
import { Panel, EmptyState, SkeletonRows, ErrorState } from "../components/Primitives";
import { RiskBadge, StatusBadge } from "../components/Badges";
import { Button } from "../components/Form";
import { scansApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { formatBytes, formatDateTime } from "../utils/formatters";

export default function ProjectScanner() {
  const navigate = useNavigate();
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const loadScans = useCallback(() => {
    setLoading(true);
    scansApi
      .list()
      .then((res) => setScans(res.data))
      .catch(() => setError("Could not load scan history."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  async function handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Only .zip project archives are supported.");
      return;
    }
    setUploading(true);
    try {
      const res = await scansApi.upload(file);
      toast.success(`Scan complete — overall risk: ${res.data.overall_risk?.toUpperCase()}.`);
      navigate(`/project-scanner/${res.data.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not analyze the uploaded project."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Panel title="Upload a Project for Security Analysis">
        <p className="mb-4 text-sm text-ink-muted">
          Upload a <span className="font-mono">.zip</span> project archive for safe, static security analysis. Uploaded code is{" "}
          <strong className="text-ink">never executed</strong> — findings are heuristic and should be reviewed by an analyst.
        </p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-lg border-2 border-dashed py-12 transition-colors ${
            dragActive ? "border-signal bg-signal/5" : "border-hairline hover:border-hairline-soft hover:bg-panel-raised"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 size={28} className="animate-spin text-signal" />
              <p className="text-sm text-ink-muted">Analyzing project — this can take a moment...</p>
            </>
          ) : (
            <>
              <UploadCloud size={28} className="text-ink-faint" />
              <p className="text-sm text-ink">
                <span className="font-medium text-signal">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-ink-faint">ZIP archives only &middot; max 25 MB</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </div>
      </Panel>

      <Panel title="Scan History">
        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <SkeletonRows rows={5} cols={5} />
        ) : scans.length === 0 ? (
          <EmptyState icon={ScanSearch} title="No scans yet" description="Upload a project archive above to run your first security analysis." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-hairline text-xs uppercase tracking-wide text-ink-faint">
                  <th className="py-2 pr-4 font-medium">File</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium">Risk</th>
                  <th className="py-2 pr-4 font-medium">Files Scanned</th>
                  <th className="py-2 pr-4 font-medium">Suspicious Files</th>
                  <th className="py-2 pr-4 font-medium">Size</th>
                  <th className="py-2 pr-4 font-medium">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr
                    key={scan.id}
                    onClick={() => navigate(`/project-scanner/${scan.id}`)}
                    className="cursor-pointer border-b border-hairline-soft hover:bg-panel-raised"
                  >
                    <td className="py-2.5 pr-4 text-ink">
                      <div className="flex items-center gap-2">
                        <FileArchive size={14} className="text-ink-faint" /> {scan.original_filename}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusBadge status={scan.status} />
                    </td>
                    <td className="py-2.5 pr-4">{scan.overall_risk ? <RiskBadge risk={scan.overall_risk} /> : "-"}</td>
                    <td className="py-2.5 pr-4 font-mono text-ink-muted">{scan.files_scanned}</td>
                    <td className="py-2.5 pr-4 font-mono text-ink-muted">{scan.suspicious_file_count}</td>
                    <td className="py-2.5 pr-4 text-ink-muted">{formatBytes(scan.file_size_bytes)}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-ink-faint">{formatDateTime(scan.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
