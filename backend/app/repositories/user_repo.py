from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


def get_by_id(db: Session, user_id: str) -> Optional[User]:
    return db.get(User, user_id)


def get_by_email(db: Session, email: str) -> Optional[User]:
    return db.scalar(select(User).where(User.email == email.lower()))


def list_all(db: Session, limit: int = 200) -> list[User]:
    return list(db.scalars(select(User).order_by(User.created_at.desc()).limit(limit)))


def create(db: Session, user: User) -> User:
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update(db: Session, user: User) -> User:
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_by_role(db: Session, role) -> list[User]:
    return list(db.scalars(select(User).where(User.role == role, User.is_active.is_(True))))


def count_all(db: Session) -> int:
    return db.query(User).count()
