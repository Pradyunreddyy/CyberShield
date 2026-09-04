from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.common import FindingSeverity, IncidentSeverity
from app.models.incident import Incident, IncidentAction, IncidentNote, IncidentTimelineEvent
from app.models.scan import ScanFinding
from app.models.user import User
from app.repositories import incident_repo
from app.schemas.incident import ActionCreate, IncidentCreate, IncidentUpdate, NoteCreate, TimelineEventCreate
from app.services import alert_service, audit_service

_FINDING_TO_INCIDENT_SEVERITY = {
    FindingSeverity.CRITICAL: IncidentSeverity.CRITICAL,
    FindingSeverity.HIGH: IncidentSeverity.HIGH,
    FindingSeverity.MEDIUM: IncidentSeverity.MEDIUM,
    FindingSeverity.LOW: IncidentSeverity.LOW,
    FindingSeverity.INFO: IncidentSeverity.LOW,
}


def create_incident(db: Session, payload: IncidentCreate, current_user: User) -> Incident:
    code = incident_repo.generate_next_code(db)
    incident = Incident(
        code=code,
        title=payload.title,
        description=payload.description,
        incident_type=payload.incident_type,
        severity=payload.severity,
        source="manual",
        affected_asset=payload.affected_asset,
        source_ip=payload.source_ip,
        target_ip=payload.target_ip,
        reporter_id=current_user.id,
        assigned_analyst_id=payload.assigned_analyst_id,
    )
    incident = incident_repo.create(db, incident)

    _add_timeline(db, incident, f"Incident {incident.code} created by {current_user.full_name}.")

    audit_service.record(
        db, user_id=current_user.id, action="incident.created", resource_type="incident",
        resource_id=incident.id, metadata={"severity": incident.severity.value},
    )

    if incident.severity in (IncidentSeverity.CRITICAL, IncidentSeverity.HIGH):
        alert_service.create_alert(
            db,
            alert_type="critical_incident_created" if incident.severity == IncidentSeverity.CRITICAL else "high_incident_created",
            message=f"{incident.severity.value.upper()} incident {incident.code} was created: {incident.title}",
            severity="critical" if incident.severity == IncidentSeverity.CRITICAL else "warning",
            related_incident_id=incident.id,
        )
    return incident


def create_incident_from_finding(
    db: Session, finding: ScanFinding, current_user: User, assigned_analyst_id: str | None = None
) -> Incident:
    code = incident_repo.generate_next_code(db)
    severity = _FINDING_TO_INCIDENT_SEVERITY.get(finding.severity, IncidentSeverity.MEDIUM)

    incident = Incident(
        code=code,
        title=f"Project scan finding: {finding.finding_type}",
        description=(
            f"Automatically created from Project Security Analyzer finding in '{finding.file_path}'.\n\n"
            f"{finding.description}\n\n"
            f"Recommendation: {finding.recommendation or 'Review the finding manually.'}"
        ),
        incident_type="project_security_finding",
        severity=severity,
        source="project_scanner",
        affected_asset=finding.file_path,
        reporter_id=current_user.id,
        assigned_analyst_id=assigned_analyst_id,
        source_finding_id=finding.id,
    )
    incident = incident_repo.create(db, incident)
    _add_timeline(
        db, incident,
        f"Incident created from Project Security Analyzer finding ({finding.finding_type}) by {current_user.full_name}.",
    )
    audit_service.record(
        db, user_id=current_user.id, action="incident.created_from_finding", resource_type="incident",
        resource_id=incident.id, metadata={"finding_id": finding.id, "severity": severity.value},
    )
    if severity in (IncidentSeverity.CRITICAL, IncidentSeverity.HIGH):
        alert_service.create_alert(
            db, alert_type="critical_incident_created" if severity == IncidentSeverity.CRITICAL else "high_incident_created",
            message=f"Incident {incident.code} was created from a project scan finding: {finding.finding_type}.",
            severity="critical" if severity == IncidentSeverity.CRITICAL else "warning",
            related_incident_id=incident.id,
        )
    return incident


def get_incident_or_404(db: Session, incident_id: str) -> Incident:
    incident = incident_repo.get_by_id(db, incident_id)
    if not incident:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Incident not found.")
    return incident


def update_incident(db: Session, incident: Incident, payload: IncidentUpdate, current_user: User) -> Incident:
    changes: dict[str, str] = {}
    for field, value in payload.model_dump(exclude_unset=True).items():
        old_value = getattr(incident, field)
        if value is not None and value != old_value:
            setattr(incident, field, value)
            changes[field] = str(value)

    incident = incident_repo.update(db, incident)

    if changes:
        audit_service.record(
            db, user_id=current_user.id, action="incident.updated", resource_type="incident",
            resource_id=incident.id, metadata=changes,
        )
        if "status" in changes:
            _add_timeline(db, incident, f"Status changed to '{changes['status']}' by {current_user.full_name}.")
            alert_service.create_alert(
                db, alert_type="incident_status_changed",
                message=f"Incident {incident.code} status changed to {changes['status']}.",
                severity="info", related_incident_id=incident.id,
            )
        if "severity" in changes:
            _add_timeline(db, incident, f"Severity changed to '{changes['severity']}' by {current_user.full_name}.")
        if "assigned_analyst_id" in changes:
            _add_timeline(db, incident, f"Incident reassigned by {current_user.full_name}.")
            alert_service.create_alert(
                db, alert_type="incident_assigned",
                message=f"Incident {incident.code} was assigned to a new analyst.",
                severity="info", related_incident_id=incident.id,
                user_id=changes.get("assigned_analyst_id"),
            )
    return incident


def delete_incident(db: Session, incident: Incident, current_user: User) -> None:
    audit_service.record(
        db, user_id=current_user.id, action="incident.deleted", resource_type="incident", resource_id=incident.id,
    )
    incident_repo.delete(db, incident)


def add_note(db: Session, incident: Incident, payload: NoteCreate, current_user: User) -> IncidentNote:
    note = IncidentNote(incident_id=incident.id, author_id=current_user.id, content=payload.content)
    note = incident_repo.add_note(db, note)
    audit_service.record(
        db, user_id=current_user.id, action="incident.note_added", resource_type="incident", resource_id=incident.id,
    )
    return note


def add_timeline_event(
    db: Session, incident: Incident, payload: TimelineEventCreate, current_user: User
) -> IncidentTimelineEvent:
    event = IncidentTimelineEvent(
        incident_id=incident.id,
        author_id=current_user.id,
        description=payload.description,
        event_time=payload.event_time or datetime.now(timezone.utc),
    )
    event = incident_repo.add_timeline_event(db, event)
    audit_service.record(
        db, user_id=current_user.id, action="incident.timeline_event_added", resource_type="incident",
        resource_id=incident.id,
    )
    return event


def _add_timeline(db: Session, incident: Incident, description: str) -> None:
    event = IncidentTimelineEvent(
        incident_id=incident.id, author_id=None, description=description, event_time=datetime.now(timezone.utc)
    )
    incident_repo.add_timeline_event(db, event)


def add_action(db: Session, incident: Incident, payload: ActionCreate, current_user: User) -> IncidentAction:
    action = IncidentAction(
        incident_id=incident.id,
        performed_by_id=current_user.id,
        action=payload.action,
        result=payload.result,
    )
    action = incident_repo.add_action(db, action)
    _add_timeline(db, incident, f"Response action recorded: {payload.action} ({payload.result}).")
    audit_service.record(
        db, user_id=current_user.id, action="incident.action_added", resource_type="incident",
        resource_id=incident.id, metadata={"action": payload.action},
    )
    return action
