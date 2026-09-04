from typing import Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.models.alert import Alert


def create(db: Session, alert: Alert) -> Alert:
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


def list_for_user(db: Session, user_id: str, unread_only: bool = False, limit: int = 100) -> list[Alert]:
    stmt = (
        select(Alert)
        .where(or_(Alert.user_id == user_id, Alert.user_id.is_(None)))
        .order_by(Alert.created_at.desc())
        .limit(limit)
    )
    if unread_only:
        stmt = stmt.where(Alert.is_read.is_(False))
    return list(db.scalars(stmt))


def get(db: Session, alert_id: str) -> Optional[Alert]:
    return db.get(Alert, alert_id)


def mark_read(db: Session, alert: Alert) -> Alert:
    alert.is_read = True
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert
