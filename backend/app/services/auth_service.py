from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.models.common import UserRole
from app.models.user import User
from app.repositories import user_repo
from app.schemas.user import UserCreate


def register_user(db: Session, payload: UserCreate) -> User:
    existing = user_repo.get_by_email(db, payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    user = User(
        full_name=payload.full_name,
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        role=UserRole.DEVELOPER,
        is_active=True,
    )
    return user_repo.create(db, user)


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = user_repo.get_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been disabled. Contact your administrator.",
        )
    return user


def issue_token_for_user(user: User) -> str:
    return create_access_token(subject=user.id, extra_claims={"role": user.role.value})
