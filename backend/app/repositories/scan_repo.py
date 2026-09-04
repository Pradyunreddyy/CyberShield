from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models.scan import ProjectScan, ScanFinding


def create_scan(db: Session, scan: ProjectScan) -> ProjectScan:
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan


def update_scan(db: Session, scan: ProjectScan) -> ProjectScan:
    db.add(scan)
    db.commit()
    db.refresh(scan)
    return scan


def get_scan(db: Session, scan_id: str) -> Optional[ProjectScan]:
    stmt = (
        select(ProjectScan)
        .options(joinedload(ProjectScan.findings))
        .where(ProjectScan.id == scan_id)
    )
    return db.scalar(stmt)


def list_scans(db: Session, uploaded_by_id: Optional[str] = None, limit: int = 100) -> list[ProjectScan]:
    stmt = select(ProjectScan).order_by(ProjectScan.created_at.desc()).limit(limit)
    if uploaded_by_id:
        stmt = stmt.where(ProjectScan.uploaded_by_id == uploaded_by_id)
    return list(db.scalars(stmt))


def add_finding(db: Session, finding: ScanFinding) -> ScanFinding:
    db.add(finding)
    db.commit()
    db.refresh(finding)
    return finding


def get_finding(db: Session, finding_id: str) -> Optional[ScanFinding]:
    return db.get(ScanFinding, finding_id)


def count_scans(db: Session) -> int:
    return db.query(ProjectScan).count()


def count_suspicious_findings(db: Session) -> int:
    from app.models.common import FindingSeverity

    return (
        db.query(ScanFinding)
        .filter(ScanFinding.severity.in_([FindingSeverity.MEDIUM, FindingSeverity.HIGH, FindingSeverity.CRITICAL]))
        .count()
    )


def count_critical_findings(db: Session) -> int:
    from app.models.common import FindingSeverity

    return db.query(ScanFinding).filter(ScanFinding.severity == FindingSeverity.CRITICAL).count()
