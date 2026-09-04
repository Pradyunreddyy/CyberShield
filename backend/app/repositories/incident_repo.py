from datetime import datetime
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.models.incident import Incident, IncidentAction, IncidentNote, IncidentTimelineEvent


def generate_next_code(db: Session) -> str:
    """Generates a sequential human-friendly incident code such as INC-1024."""
    count = db.query(Incident).count()
    return f"INC-{1000 + count + 1}"


def get_by_id(db: Session, incident_id: str) -> Optional[Incident]:
    stmt = (
        select(Incident)
        .options(
            joinedload(Incident.reporter),
            joinedload(Incident.assigned_analyst),
            joinedload(Incident.notes).joinedload(IncidentNote.author),
            joinedload(Incident.timeline_events).joinedload(IncidentTimelineEvent.author),
            joinedload(Incident.actions).joinedload(IncidentAction.performed_by),
        )
        .where(Incident.id == incident_id)
    )
    return db.scalar(stmt)


def list_incidents(
    db: Session,
    *,
    search: Optional[str] = None,
    severity: Optional[str] = None,
    status: Optional[str] = None,
    incident_type: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    page: int = 1,
    page_size: int = 20,
    restrict_reporter_id: Optional[str] = None,
) -> tuple[list[Incident], int]:
    stmt = select(Incident).options(
        joinedload(Incident.reporter), joinedload(Incident.assigned_analyst)
    )

    if restrict_reporter_id:
        stmt = stmt.where(Incident.reporter_id == restrict_reporter_id)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(
            (Incident.title.ilike(like))
            | (Incident.description.ilike(like))
            | (Incident.code.ilike(like))
        )
    if severity:
        stmt = stmt.where(Incident.severity == severity)
    if status:
        stmt = stmt.where(Incident.status == status)
    if incident_type:
        stmt = stmt.where(Incident.incident_type == incident_type)
    if date_from:
        stmt = stmt.where(Incident.created_at >= date_from)
    if date_to:
        stmt = stmt.where(Incident.created_at <= date_to)

    total = db.scalar(select(func.count()).select_from(stmt.subquery()))

    sort_column = getattr(Incident, sort_by, Incident.created_at)
    stmt = stmt.order_by(sort_column.desc() if sort_dir == "desc" else sort_column.asc())
    stmt = stmt.offset((page - 1) * page_size).limit(page_size)

    items = list(db.scalars(stmt).unique())
    return items, total or 0


def create(db: Session, incident: Incident) -> Incident:
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


def update(db: Session, incident: Incident) -> Incident:
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return incident


def delete(db: Session, incident: Incident) -> None:
    db.delete(incident)
    db.commit()


def add_note(db: Session, note: IncidentNote) -> IncidentNote:
    db.add(note)
    db.commit()
    db.refresh(note)
    return note


def add_timeline_event(db: Session, event: IncidentTimelineEvent) -> IncidentTimelineEvent:
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def add_action(db: Session, action: IncidentAction) -> IncidentAction:
    db.add(action)
    db.commit()
    db.refresh(action)
    return action


def count_by_status(db: Session, status: str) -> int:
    return db.query(Incident).filter(Incident.status == status).count()


def count_by_severity(db: Session, severity: str) -> int:
    return db.query(Incident).filter(Incident.severity == severity).count()


def count_all(db: Session) -> int:
    return db.query(Incident).count()
