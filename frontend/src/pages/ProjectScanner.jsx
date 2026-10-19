import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UploadCloud, ScanSearch, FileArchive, ShieldCheck, Files, FolderOpen } from "lucide-react";
import { Panel, PageHeader, EmptyState, SkeletonRows, ErrorState } from "../components/Primitives";
import { RiskBadge, StatusBadge } from "../components/Badges";
import { scansApi } from "../api/endpoints";
import { getApiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { formatBytes, formatDateTime } from "../utils/formatters";

export default function ProjectScanner() {
  const navigate = useNavigate();
  const toast = useToast();
  const inputRef = useRef(null);
  const multiInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingName, setUploadingName] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const loadScans = useCallback(() => {
    setLoading(true);
    setError("");
    scansApi
      .list()
      .then((res) => setScans(res.data))
      .catch(() => setError("Could not load scan history."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadScans();
  }, [loadScans]);

  // Real elapsed time for the real upload + analysis request.
  useEffect(() => {
    if (!uploading) {
      setElapsed(0);
      return undefined;
    }
    const started = Date.now();
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
    return () => clearInterval(t);
  }, [uploading]);

  async function handleFiles(fileList, mode = "multiple") {
    const files = Array.from(fileList || []);
    if (!files.length || uploading) return;
    const isZip = files.length === 1 && files[0].name.toLowerCase().endsWith(".zip") && mode !== "folder";
    if (files.some((item) => item.name.toLowerCase().endsWith(".zip")) && !isZip) {
      toast.error("Upload one ZIP archive at a time, or select source files/folders without ZIP files.");
      return;
    }
    const totalBytes = files.reduce((sum, item) => sum + item.size, 0);
    if (totalBytes > 25 * 1024 * 1024) { toast.error("The total upload must be 25 MB or smaller."); return; }
    setUploading(true);
    setUploadingName(`${files.length === 1 ? (files[0].webkitRelativePath || files[0].name) : `${files.length} files`} · ${formatBytes(totalBytes)}`);
    try {
      const res = isZip ? await scansApi.upload(files[0]) : await scansApi.uploadFiles(files);
      toast.success(`Scan complete — overall risk: ${res.data.overall_risk?.toUpperCase()}.`);
      navigate(`/project-scanner/${res.data.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not analyze the uploaded project."));
    } finally { setUploading(false); }
  }
  return (
    <div className="space-y-6">
      <PageHeader title="Project security analyzer" description="Upload a ZIP archive, source files, or a folder for static security analysis. Findings can be escalated into incidents." />

      <Panel title="Upload a project">
        <p className="mb-4 flex items-start gap-2 text-sm text-ink-muted">
          <ShieldCheck size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-state-success" />
          <span>
            Archives are analyzed statically — uploaded code is <strong className="font-medium text-ink">never executed</strong>. Findings are heuristic and should be
            reviewed by an analyst.
          </span>
        </p>

        {/* A <label> around a visually-hidden (not display:none) input: the zone is
            keyboard-focusable and Enter/Space opens the file picker. */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            handleFiles(e.dataTransfer.files, "drop");
          }}
          className={`flex min-h-[176px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors duration-120 focus-within:border-signal focus-within:bg-signal/5 ${
            uploading ? "cursor-progress" : "cursor-pointer"
          } ${dragActive ? "border-signal bg-signal/5" : "border-hairline hover:border-ink-faint/50 hover:bg-panel-raised"}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".zip,.py,.js,.jsx,.ts,.tsx,.java,.c,.cpp,.cs,.go,.rb,.php,.sh,.bash,.ps1,.yml,.yaml,.json,.env,.txt,.md,.html,.css,.sql,.xml,.toml,.ini,.cfg,.rs,.swift,.kt,.dart,.vue,.svelte"
            disabled={uploading}
            className="sr-only"
            aria-label="Upload a ZIP archive or source file"
            onChange={(e) => {
              handleFiles(e.target.files, "zip");
              e.target.value = ""; // lets the same file be chosen again
            }}
          />
          {uploading ? (
            <div role="status" className="w-full max-w-xs">
              <p className="text-sm font-medium text-ink">Analyzing project…</p>
              <p className="mt-0.5 truncate font-mono text-xs text-ink-muted">{uploadingName}</p>
              <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-hairline">
                <div className="h-full w-1/3 animate-sweep rounded-full bg-signal" />
              </div>
              <p className="tnum mt-2.5 text-xs text-ink-muted">{elapsed}s elapsed</p>
            </div>
          ) : (
            <>
              <UploadCloud size={28} aria-hidden="true" className={dragActive ? "text-signal" : "text-ink-muted"} />
              <p className="text-sm text-ink">
                <span className="font-medium text-signal">Choose a ZIP or source file</span> or drag and drop files here
              </p>
              <p className="text-xs text-ink-muted">ZIP, individual source files, multiple files, or a whole folder · 25 MB total</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <button type="button" disabled={uploading} onClick={(e) => { e.preventDefault(); e.stopPropagation(); multiInputRef.current?.click(); }} className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-2 text-xs font-medium text-ink-muted hover:bg-panel-raised"><Files size={14} /> Select multiple files</button>
                <button type="button" disabled={uploading} onClick={(e) => { e.preventDefault(); e.stopPropagation(); folderInputRef.current?.click(); }} className="inline-flex items-center gap-1.5 rounded-md border border-hairline px-3 py-2 text-xs font-medium text-ink-muted hover:bg-panel-raised"><FolderOpen size={14} /> Select folder</button>
              </div>
            </>
          )}
        </label>
        <input ref={multiInputRef} type="file" multiple disabled={uploading} className="sr-only" aria-label="Select multiple project files" onChange={(e) => { handleFiles(e.target.files, "multiple"); e.target.value = ""; }} />
        <input ref={folderInputRef} type="file" multiple webkitdirectory="" directory="" disabled={uploading} className="sr-only" aria-label="Select a project folder" onChange={(e) => { handleFiles(e.target.files, "folder"); e.target.value = ""; }} />
      </Panel>

      <Panel title="Scan history">
        {error ? (
          <ErrorState title="Unable to load scan history" message="Please check your connection and try again." onRetry={loadScans} />
        ) : loading ? (
          <SkeletonRows rows={5} cols={5} />
        ) : scans.length === 0 ? (
          <EmptyState icon={ScanSearch} title="No scans yet" description="Upload a ZIP archive, source files, or a folder above to run your first security analysis." />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="data-table text-left">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>Files scanned</th>
                  <th>Suspicious files</th>
                  <th>Size</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {scans.map((scan) => (
                  <tr key={scan.id} data-interactive="true" onClick={() => navigate(`/project-scanner/${scan.id}`)}>
                    <td className="text-ink">
                      <Link
                        to={`/project-scanner/${scan.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-2 hover:text-signal hover:underline"
                      >
                        <FileArchive size={14} aria-hidden="true" className="shrink-0 text-ink-muted" /> {scan.original_filename}
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={scan.status} />
                    </td>
                    <td>{scan.overall_risk ? <RiskBadge risk={scan.overall_risk} /> : "—"}</td>
                    <td className="font-mono text-ink-muted">{scan.files_scanned}</td>
                    <td className="font-mono text-ink-muted">{scan.suspicious_file_count}</td>
                    <td className="whitespace-nowrap text-ink-muted">{formatBytes(scan.file_size_bytes)}</td>
                    <td className="whitespace-nowrap font-mono text-xs text-ink-muted">{formatDateTime(scan.created_at)}</td>
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
