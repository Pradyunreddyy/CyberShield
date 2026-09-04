from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_analyst_or_admin
from app.database.session import get_db
from app.models.common import UserRole
from app.models.user import User
from app.repositories import incident_repo, user_repo
from app.schemas.incident import (
    ActionCreate,
    ActionOut,
    IncidentCreate,
    IncidentDetailOut,
    IncidentListItem,
    IncidentUpdate,
    NoteCreate,
    NoteOut,
    PaginatedIncidents,
    TimelineEventCreate,
    TimelineEventOut,
)
from app.schemas.user import UserOut
from app.services import incident_service

router = APIRouter(prefix="/api/incidents", tags=["Incidents"])


@router.get(
    "/assignable-analysts", response_model=list[UserOut],
    summary="List active analysts/admins that an incident can be assigned to",
    dependencies=[Depends(require_analyst_or_admin)],
)
def list_assignable_analysts(db: Session = Depends(get_db)):
    return user_repo.list_by_role(db, UserRole.ANALYST) + user_repo.list_by_role(db, UserRole.ADMIN)


def _ensure_can_view(incident, current_user: User) -> None:
    if current_user.role == UserRole.DEVELOPER and incident.reporter_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Developers can only view incidents they have reported.",
        )


@router.get("", response_model=PaginatedIncidents, summary="List incidents (filter, search, sort, paginate)")
def list_incidents(
    search: Optional[str] = None,
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(default=None, alias="status"),
    incident_type: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    restrict_reporter_id = current_user.id if current_user.role == UserRole.DEVELOPER else None
    items, total = incident_repo.list_incidents(
        db, search=search, severity=severity, status=status_filter, incident_type=incident_type,
        date_from=date_from, date_to=date_to, sort_by=sort_by, sort_dir=sort_dir, page=page, page_size=page_size,
        restrict_reporter_id=restrict_reporter_id,
    )
    return PaginatedIncidents(
        items=[IncidentListItem.model_validate(i) for i in items], total=total, page=page, page_size=page_size,
    )


@router.post(
    "", response_model=IncidentDetailOut, status_code=201,
    summary="Create a new incident (analyst/admin only)",
    dependencies=[Depends(require_analyst_or_admin)],
)
def create_incident(payload: IncidentCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    incident = incident_service.create_incident(db, payload, current_user)
    return incident_service.get_incident_or_404(db, incident.id)


@router.get("/{incident_id}", response_model=IncidentDetailOut, summary="Get full incident details")
def get_incident(incident_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    incident = incident_service.get_incident_or_404(db, incident_id)
    _ensure_can_view(incident, current_user)
    return incident


@router.put(
    "/{incident_id}", response_model=IncidentDetailOut,
    summary="Update an incident (status, severity, assignment, etc.) - analyst/admin only",
    dependencies=[Depends(require_analyst_or_admin)],
)
def update_incident(
    incident_id: str, payload: IncidentUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    incident = incident_service.get_incident_or_404(db, incident_id)
    incident_service.update_incident(db, incident, payload, current_user)
    return incident_service.get_incident_or_404(db, incident_id)


@router.delete(
    "/{incident_id}", status_code=204, summary="Delete an incident (admin only)",
    dependencies=[Depends(require_analyst_or_admin)],
)
def delete_incident(incident_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only administrators can delete incidents.")
    incident = incident_service.get_incident_or_404(db, incident_id)
    incident_service.delete_incident(db, incident, current_user)


@router.post(
    "/{incident_id}/notes", response_model=NoteOut, status_code=201,
    summary="Add an investigation note - analyst/admin only",
    dependencies=[Depends(require_analyst_or_admin)],
)
def add_note(
    incident_id: str, payload: NoteCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    incident = incident_service.get_incident_or_404(db, incident_id)
    return incident_service.add_note(db, incident, payload, current_user)


@router.post(
    "/{incident_id}/timeline", response_model=TimelineEventOut, status_code=201,
    summary="Add a timeline event - analyst/admin only",
    dependencies=[Depends(require_analyst_or_admin)],
)
def add_timeline_event(
    incident_id: str, payload: TimelineEventCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    incident = incident_service.get_incident_or_404(db, incident_id)
    return incident_service.add_timeline_event(db, incident, payload, current_user)


@router.post(
    "/{incident_id}/actions", response_model=ActionOut, status_code=201,
    summary="Record a response action (e.g. Blocked IP, Isolated machine) - analyst/admin only",
    dependencies=[Depends(require_analyst_or_admin)],
)
def add_action(
    incident_id: str, payload: ActionCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    incident = incident_service.get_incident_or_404(db, incident_id)
    return incident_service.add_action(db, incident, payload, current_user)
