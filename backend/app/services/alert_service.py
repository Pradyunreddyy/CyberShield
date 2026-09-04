from typing import Optional

from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.repositories import alert_repo


def create_alert(
    db: Session,
    *,
    alert_type: str,
    message: str,
    severity: str = "info",
    user_id: Optional[str] = None,
    related_incident_id: Optional[str] = None,
    related_scan_id: Optional[str] = None,
) -> Alert:
    alert = Alert(
        alert_type=alert_type,
        message=message,
        severity=severity,
        user_id=user_id,
        related_incident_id=related_incident_id,
        related_scan_id=related_scan_id,
    )
    return alert_repo.create(db, alert)
