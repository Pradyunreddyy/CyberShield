from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_analyst_or_admin
from app.database.session import get_db
from app.models.user import User
from app.schemas.dashboard import AnalyticsOverview
from app.services import analytics_service

router = APIRouter(
    prefix="/api/analytics", tags=["Analytics"], dependencies=[Depends(require_analyst_or_admin)]
)


@router.get(
    "/overview", response_model=AnalyticsOverview,
    summary="Get the full analytics overview used by the Analytics page (analyst/admin only)",
)
def get_overview(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return analytics_service.get_analytics_overview(db)
