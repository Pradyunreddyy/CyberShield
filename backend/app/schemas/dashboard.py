from pydantic import BaseModel


class DashboardStats(BaseModel):
    total_incidents: int
    open_incidents: int
    critical_incidents: int
    high_incidents: int
    investigating_incidents: int
    resolved_incidents: int
    projects_scanned: int
    suspicious_findings: int
    is_demo_data: bool = False


class CountBucket(BaseModel):
    label: str
    count: int


class TimeSeriesPoint(BaseModel):
    date: str
    count: int


class AnalyticsOverview(BaseModel):
    incidents_by_severity: list[CountBucket]
    incidents_by_type: list[CountBucket]
    incidents_by_status: list[CountBucket]
    incidents_over_time: list[TimeSeriesPoint]
    scans_over_time: list[TimeSeriesPoint]
    average_resolution_hours: float | None
    total_project_scans: int
    total_suspicious_findings: int
    total_critical_findings: int
    is_demo_data: bool = False
