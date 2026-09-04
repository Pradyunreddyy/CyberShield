import json
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.repositories import audit_repo

# Keys that must never be written to the audit log, even accidentally.
_FORBIDDEN_KEYS = {"password", "hashed_password", "token", "access_token", "api_key", "secret"}


def _sanitize(metadata: Optional[dict[str, Any]]) -> Optional[str]:
    if not metadata:
        return None
    clean = {k: v for k, v in metadata.items() if k.lower() not in _FORBIDDEN_KEYS}
    return json.dumps(clean, default=str)[:2000]


def record(
    db: Session,
    *,
    user_id: Optional[str],
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        metadata_json=_sanitize(metadata),
        ip_address=ip_address,
    )
    return audit_repo.create(db, log)
