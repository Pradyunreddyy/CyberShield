import os
import tempfile
import zipfile
from pathlib import PurePosixPath

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.database.session import get_db
from app.models.common import UserRole
from app.models.user import User
from app.repositories import scan_repo
from app.schemas.incident import IncidentDetailOut
from app.schemas.scan import CreateIncidentFromFindingRequest, ScanDetailOut, ScanFindingOut, ScanOut
from app.services import incident_service, scan_service

router = APIRouter(prefix="/api/scans", tags=["Project Security Analyzer"])


@router.post(
    "", response_model=ScanDetailOut, status_code=201,
    summary="Upload a ZIP archive, source files, or a project folder for security analysis",
    description="Uploads are safely staged and statically analyzed. Uploaded code is NEVER executed.",
)
def upload_scan(
    file: UploadFile | None = File(default=None),
    files: list[UploadFile] | None = File(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file is not None:
        scan = scan_service.run_project_scan(db, file, current_user)
        return scan_repo.get_scan(db, scan.id)

    uploads = files or []
    if not uploads:
        raise HTTPException(status_code=400, detail="Upload a ZIP archive or one or more project files.")
    if len(uploads) > settings.MAX_FILES_PER_ARCHIVE:
        raise HTTPException(status_code=413, detail=f"Too many files. Limit: {settings.MAX_FILES_PER_ARCHIVE}.")

    max_bytes = settings.UPLOAD_MAX_SIZE_BYTES
    total_bytes = 0
    temp_path = None
    allowed_exts = {
        ".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".c", ".h", ".cpp", ".hpp", ".cs",
        ".go", ".rb", ".php", ".sh", ".bash", ".ps1", ".yml", ".yaml", ".json", ".env",
        ".txt", ".md", ".html", ".css", ".sql", ".xml", ".toml", ".ini", ".cfg", ".rs",
        ".swift", ".kt", ".dart", ".vue", ".svelte", ".properties", ".gradle",
    }
    ignored_dirs = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build", "coverage"}
    try:
        with tempfile.NamedTemporaryFile(prefix="scan_bundle_", suffix=".zip", delete=False) as temp:
            temp_path = temp.name
        with zipfile.ZipFile(temp_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for upload in uploads:
                name = (upload.filename or "").replace("\\", "/")
                path = PurePosixPath(name)
                parts = path.parts
                if not name or path.is_absolute() or any(part in ("", ".", "..") for part in parts) or ":" in name:
                    raise HTTPException(status_code=400, detail="A file path is invalid or attempts to escape the project folder.")
                if any(part in ignored_dirs or part.startswith(".") for part in parts[:-1]):
                    continue
                if path.suffix.lower() not in allowed_exts and path.name.lower() not in {"dockerfile", "makefile"}:
                    continue
                data = upload.file.read(max_bytes - total_bytes + 1)
                total_bytes += len(data)
                if total_bytes > max_bytes:
                    raise HTTPException(status_code=413, detail=f"Total upload exceeds {max_bytes // (1024 * 1024)} MB.")
                archive.writestr(str(path), data)
        if total_bytes == 0:
            raise HTTPException(status_code=415, detail="No supported source or text files were found in the upload.")
        with open(temp_path, "rb") as archive_file:
            bundle = UploadFile(filename="project-files.zip", file=archive_file)
            scan = scan_service.run_project_scan(db, bundle, current_user)
        return scan_repo.get_scan(db, scan.id)
    finally:
        for upload in uploads:
            try:
                upload.file.close()
            except Exception:
                pass
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

@router.get("", response_model=list[ScanOut], summary="List project scans")
def list_scans(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    uploaded_by_id = current_user.id if current_user.role == UserRole.DEVELOPER else None
    return scan_repo.list_scans(db, uploaded_by_id=uploaded_by_id)


def _get_scan_or_404(db: Session, scan_id: str, current_user: User):
    scan = scan_repo.get_scan(db, scan_id)
    if not scan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Scan not found.")
    if current_user.role == UserRole.DEVELOPER and scan.uploaded_by_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You may only view your own scans.")
    return scan


@router.get("/{scan_id}", response_model=ScanDetailOut, summary="Get scan details and findings")
def get_scan(scan_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _get_scan_or_404(db, scan_id, current_user)


@router.get("/{scan_id}/findings", response_model=list[ScanFindingOut], summary="List findings for a scan")
def get_scan_findings(scan_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    scan = _get_scan_or_404(db, scan_id, current_user)
    return scan.findings


@router.post(
    "/{scan_id}/findings/{finding_id}/create-incident",
    response_model=IncidentDetailOut,
    status_code=201,
    summary="Convert a suspicious finding into a security incident",
    description="Links the new incident back to the originating project scan and finding so the "
    "investigation trail (scan -> finding -> incident) is preserved in the database.",
)
def create_incident_from_finding(
    scan_id: str,
    finding_id: str,
    payload: CreateIncidentFromFindingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    scan = _get_scan_or_404(db, scan_id, current_user)
    finding = scan_repo.get_finding(db, finding_id)
    if not finding or finding.scan_id != scan.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Finding not found for this scan.")

    assigned_analyst_id = payload.assigned_analyst_id if current_user.role != UserRole.DEVELOPER else None
    incident = incident_service.create_incident_from_finding(db, finding, current_user, assigned_analyst_id)
    return incident_service.get_incident_or_404(db, incident.id)
