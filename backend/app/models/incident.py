from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.common import IncidentSeverity, IncidentStatus, TimestampMixin, gen_uuid, utcnow
from app.database.base import Base


class Incident(Base, TimestampMixin):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)  # e.g. INC-1024

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    incident_type: Mapped[str] = mapped_column(String(100), default="uncategorized")
    severity: Mapped[IncidentSeverity] = mapped_column(
        Enum(IncidentSeverity), default=IncidentSeverity.LOW, nullable=False
    )
    status: Mapped[IncidentStatus] = mapped_column(
        Enum(IncidentStatus), default=IncidentStatus.OPEN, nullable=False
    )

    source: Mapped[str] = mapped_column(String(120), default="manual")  # manual | project_scanner | ai_analyzer
    affected_asset: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    source_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    target_ip: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    reporter_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)
    assigned_analyst_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)

    # Optional link back to the project scan finding that generated this incident.
    source_finding_id: Mapped[Optional[str]] = mapped_column(
        ForeignKey("scan_findings.id"), nullable=True
    )

    reporter = relationship("User", back_populates="incidents_reported", foreign_keys=[reporter_id])
    assigned_analyst = relationship(
        "User", back_populates="incidents_assigned", foreign_keys=[assigned_analyst_id]
    )
    source_finding = relationship("ScanFinding", back_populates="created_incident", foreign_keys=[source_finding_id])

    notes = relationship("IncidentNote", back_populates="incident", cascade="all, delete-orphan")
    timeline_events = relationship(
        "IncidentTimelineEvent", back_populates="incident", cascade="all, delete-orphan",
        order_by="IncidentTimelineEvent.event_time",
    )
    actions = relationship("IncidentAction", back_populates="incident", cascade="all, delete-orphan")
    ai_analyses = relationship("AIAnalysis", back_populates="incident", cascade="all, delete-orphan")


class IncidentNote(Base, TimestampMixin):
    __tablename__ = "incident_notes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    incident_id: Mapped[str] = mapped_column(ForeignKey("incidents.id"), nullable=False)
    author_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    incident = relationship("Incident", back_populates="notes")
    author = relationship("User")


class IncidentTimelineEvent(Base, TimestampMixin):
    __tablename__ = "incident_timeline"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    incident_id: Mapped[str] = mapped_column(ForeignKey("incidents.id"), nullable=False)
    author_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)
    event_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)

    incident = relationship("Incident", back_populates="timeline_events")
    author = relationship("User")


class IncidentAction(Base, TimestampMixin):
    __tablename__ = "incident_actions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    incident_id: Mapped[str] = mapped_column(ForeignKey("incidents.id"), nullable=False)
    performed_by_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(255), nullable=False)  # e.g. "Blocked IP"
    result: Mapped[str] = mapped_column(String(120), default="completed")  # completed | failed | pending

    incident = relationship("Incident", back_populates="actions")
    performed_by = relationship("User")
