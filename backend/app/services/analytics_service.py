from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.incident import Incident
from app.models.scan import ProjectScan
from app.repositories import scan_repo
from app.schemas.dashboard import AnalyticsOverview, CountBucket, TimeSeriesPoint

_DEMO_OVERVIEW = AnalyticsOverview(
    incidents_by_severity=[
        CountBucket(label="low", count=14), CountBucket(label="medium", count=12),
        CountBucket(label="high", count=9), CountBucket(label="critical", count=4),
    ],
    incidents_by_type=[
        CountBucket(label="phishing", count=11), CountBucket(label="malware", count=8),
        CountBucket(label="credential_attack", count=7), CountBucket(label="ddos", count=5),
        CountBucket(label="data_exfiltration", count=4),
    ],
    incidents_by_status=[
        CountBucket(label="open", count=9), CountBucket(label="investigating", count=6),
        CountBucket(label="contained", count=3), CountBucket(label="resolved", count=18),
        CountBucket(label="closed", count=6),
    ],
    incidents_over_time=[
        TimeSeriesPoint(date=(datetime.now(timezone.utc) - timedelta(days=d)).strftime("%Y-%m-%d"), count=(d % 5) + 1)
        for d in range(13, -1, -1)
    ],
    scans_over_time=[
        TimeSeriesPoint(date=(datetime.now(timezone.utc) - timedelta(days=d)).strftime("%Y-%m-%d"), count=(d % 3))
        for d in range(13, -1, -1)
    ],
    average_resolution_hours=6.4,
    total_project_scans=17,
    total_suspicious_findings=11,
    total_critical_findings=3,
    is_demo_data=True,
)


def _bucketize(items: list[Incident], attr: str) -> list[CountBucket]:
    counter = Counter(getattr(i, attr).value if hasattr(getattr(i, attr), "value") else getattr(i, attr) for i in items)
    return [CountBucket(label=label, count=count) for label, count in sorted(counter.items(), key=lambda x: -x[1])]


def _time_series(dates: list[datetime], days: int = 14) -> list[TimeSeriesPoint]:
    now = datetime.now(timezone.utc)
    buckets = {(now - timedelta(days=d)).strftime("%Y-%m-%d"): 0 for d in range(days - 1, -1, -1)}
    for d in dates:
        key = d.strftime("%Y-%m-%d")
        if key in buckets:
            buckets[key] += 1
    return [TimeSeriesPoint(date=k, count=v) for k, v in buckets.items()]


def get_analytics_overview(db: Session) -> AnalyticsOverview:
    incidents: list[Incident] = db.query(Incident).all()
    if not incidents:
        return _DEMO_OVERVIEW

    resolved = [i for i in incidents if i.status.value in ("resolved", "closed")]
    if resolved:
        total_hours = sum((i.updated_at - i.created_at).total_seconds() / 3600 for i in resolved)
        avg_resolution = round(total_hours / len(resolved), 1)
    else:
        avg_resolution = None

    scans: list[ProjectScan] = db.query(ProjectScan).all()

    return AnalyticsOverview(
        incidents_by_severity=_bucketize(incidents, "severity"),
        incidents_by_type=_bucketize(incidents, "incident_type"),
        incidents_by_status=_bucketize(incidents, "status"),
        incidents_over_time=_time_series([i.created_at for i in incidents]),
        scans_over_time=_time_series([s.created_at for s in scans]),
        average_resolution_hours=avg_resolution,
        total_project_scans=scan_repo.count_scans(db),
        total_suspicious_findings=scan_repo.count_suspicious_findings(db),
        total_critical_findings=scan_repo.count_critical_findings(db),
        is_demo_data=False,
    )
