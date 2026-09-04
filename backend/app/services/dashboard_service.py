from sqlalchemy.orm import Session

from app.models.common import IncidentSeverity, IncidentStatus
from app.repositories import incident_repo, scan_repo
from app.schemas.dashboard import DashboardStats

# Realistic placeholder numbers shown ONLY when the database has zero incidents,
# so the dashboard is demonstrable before real data exists. Never mixed with
# real records - `is_demo_data` tells the frontend to show a "Demo data" badge.
_DEMO_STATS = DashboardStats(
    total_incidents=42,
    open_incidents=9,
    critical_incidents=3,
    high_incidents=8,
    investigating_incidents=6,
    resolved_incidents=24,
    projects_scanned=17,
    suspicious_findings=11,
    is_demo_data=True,
)


def get_dashboard_stats(db: Session) -> DashboardStats:
    total = incident_repo.count_all(db)
    if total == 0:
        return _DEMO_STATS

    return DashboardStats(
        total_incidents=total,
        open_incidents=incident_repo.count_by_status(db, IncidentStatus.OPEN.value),
        critical_incidents=incident_repo.count_by_severity(db, IncidentSeverity.CRITICAL.value),
        high_incidents=incident_repo.count_by_severity(db, IncidentSeverity.HIGH.value),
        investigating_incidents=incident_repo.count_by_status(db, IncidentStatus.INVESTIGATING.value),
        resolved_incidents=incident_repo.count_by_status(db, IncidentStatus.RESOLVED.value),
        projects_scanned=scan_repo.count_scans(db),
        suspicious_findings=scan_repo.count_suspicious_findings(db),
        is_demo_data=False,
    )
