from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
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
    summary="Upload a project archive (.zip) for the Project Security Analyzer",
    description="The archive is validated, safely extracted (path-traversal and zip-bomb protected), and "
    "statically analyzed. Uploaded code is NEVER executed. AI is used only to help explain high/critical "
    "findings in plain language.",
)
def upload_scan(
    file: UploadFile, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    scan = scan_service.run_project_scan(db, file, current_user)
    return scan_repo.get_scan(db, scan.id)


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
