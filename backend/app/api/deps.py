"""
Authentication/authorization dependencies.

Every protected route depends on `get_current_user` (or one of the
role-restricted wrappers below), so the backend independently enforces
access control - the frontend hiding a button is never treated as security.
"""
from typing import Iterable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import InvalidTokenError, safe_decode_access_token
from app.database.session import get_db
from app.models.common import UserRole
from app.models.user import User
from app.repositories import user_repo

_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = safe_decode_access_token(credentials.credentials)
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    user = user_repo.get_by_id(db, user_id) if user_id else None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found.")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been disabled.")
    return user


def require_roles(*roles: UserRole):
    """Returns a FastAPI dependency that enforces the current user has one of `roles`."""

    def _dependency(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of the following roles: {', '.join(r.value for r in roles)}.",
            )
        return current_user

    return _dependency


require_admin = require_roles(UserRole.ADMIN)
require_analyst_or_admin = require_roles(UserRole.ANALYST, UserRole.ADMIN)
require_any_role = require_roles(UserRole.DEVELOPER, UserRole.ANALYST, UserRole.ADMIN)


def get_client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None
