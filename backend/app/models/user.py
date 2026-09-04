from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.common import TimestampMixin, UserRole, gen_uuid


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.DEVELOPER, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    incidents_reported = relationship(
        "Incident", back_populates="reporter", foreign_keys="Incident.reporter_id"
    )
    incidents_assigned = relationship(
        "Incident", back_populates="assigned_analyst", foreign_keys="Incident.assigned_analyst_id"
    )

    def __repr__(self) -> str:  # pragma: no cover - debugging helper only
        return f"<User {self.email} ({self.role})>"
