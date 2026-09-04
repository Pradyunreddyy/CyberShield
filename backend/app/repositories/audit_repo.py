from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def create(db: Session, log: AuditLog) -> AuditLog:
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def list_logs(db: Session, limit: int = 200) -> list[AuditLog]:
    stmt = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    return list(db.scalars(stmt))
