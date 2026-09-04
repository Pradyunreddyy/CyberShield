from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.repositories import alert_repo
from app.schemas.alert import AlertOut

router = APIRouter(prefix="/api/alerts", tags=["Alerts"])


@router.get("", response_model=list[AlertOut], summary="List alerts for the current user")
def list_alerts(unread_only: bool = False, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return alert_repo.list_for_user(db, current_user.id, unread_only=unread_only)


@router.put("/{alert_id}/read", response_model=AlertOut, summary="Mark an alert as read")
def mark_alert_read(alert_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    alert = alert_repo.get(db, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")
    return alert_repo.mark_read(db, alert)
