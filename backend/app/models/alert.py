from typing import Optional

from sqlalchemy import Boolean, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.common import TimestampMixin, gen_uuid


class Alert(Base, TimestampMixin):
    __tablename__ = "alerts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    # If null, the alert is broadcast to every analyst/admin (e.g. a critical incident).
    user_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)

    alert_type: Mapped[str] = mapped_column(String(80), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), default="info")  # info | warning | critical
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

    related_incident_id: Mapped[Optional[str]] = mapped_column(ForeignKey("incidents.id"), nullable=True)
    related_scan_id: Mapped[Optional[str]] = mapped_column(ForeignKey("project_scans.id"), nullable=True)

    user = relationship("User")
