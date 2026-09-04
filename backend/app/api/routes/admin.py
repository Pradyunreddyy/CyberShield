from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.database.session import get_db
from app.models.common import UserRole
from app.models.user import User
from app.repositories import audit_repo, incident_repo, scan_repo, user_repo
from app.schemas.audit import AuditLogOut
from app.schemas.user import UserAdminCreate, UserAdminUpdate, UserOut
from app.services import audit_service, auth_service

router = APIRouter(prefix="/api/admin", tags=["Admin"], dependencies=[Depends(require_admin)])


@router.get("/users", response_model=list[UserOut], summary="List all users (admin only)")
def list_users(db: Session = Depends(get_db)):
    return user_repo.list_all(db)


@router.post(
    "/users", response_model=UserOut, status_code=201,
    summary="Create a new user with a specific role (admin only)",
)
def create_user(payload: UserAdminCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.core.security import hash_password
    from app.models.user import User as UserModel

    if user_repo.get_by_email(db, payload.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user with this email already exists.")

    user = UserModel(
        full_name=payload.full_name, email=payload.email.lower(),
        hashed_password=hash_password(payload.password), role=payload.role, is_active=True,
    )
    user = user_repo.create(db, user)
    audit_service.record(
        db, user_id=current_user.id, action="admin.user_created", resource_type="user", resource_id=user.id,
        metadata={"role": user.role.value},
    )
    return user


@router.put(
    "/users/{user_id}", response_model=UserOut,
    summary="Update a user's role or enabled/disabled status (admin only)",
)
def update_user(
    user_id: str, payload: UserAdminUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    user = user_repo.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    changes: dict[str, str] = {}
    if payload.role is not None and payload.role != user.role:
        user.role = payload.role
        changes["role"] = payload.role.value
    if payload.is_active is not None and payload.is_active != user.is_active:
        user.is_active = payload.is_active
        changes["is_active"] = str(payload.is_active)

    user = user_repo.update(db, user)
    if changes:
        audit_service.record(
            db, user_id=current_user.id, action="admin.user_updated", resource_type="user", resource_id=user.id,
            metadata=changes,
        )
    return user


@router.get("/audit-logs", response_model=list[AuditLogOut], summary="List recent audit log entries (admin only)")
def get_audit_logs(limit: int = 200, db: Session = Depends(get_db)):
    return audit_repo.list_logs(db, limit=limit)


@router.get("/overview", summary="Admin platform overview (users, incidents, scans at a glance)")
def admin_overview(db: Session = Depends(get_db)):
    return {
        "total_users": user_repo.count_all(db),
        "total_incidents": incident_repo.count_all(db),
        "total_scans": scan_repo.count_scans(db),
    }
