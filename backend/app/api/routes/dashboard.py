from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardStats
from app.services import dashboard_service

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get(
    "/stats", response_model=DashboardStats,
    summary="Get SOC dashboard summary counts",
    description="Returns live counts from the database. If there are no incidents yet, clearly-labeled "
    "demo data is returned instead so the dashboard is demonstrable ('is_demo_data' flag).",
)
def get_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return dashboard_service.get_dashboard_stats(db)
