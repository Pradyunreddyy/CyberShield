from typing import Optional

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.common import FindingSeverity, ScanRisk, ScanStatus, TimestampMixin, gen_uuid


class ProjectScan(Base, TimestampMixin):
    __tablename__ = "project_scans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    uploaded_by_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)

    # Original filename is kept only for display; the file itself is stored
    # under a randomized server-side name (see scanners/file_validator.py).
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, default=0)

    status: Mapped[ScanStatus] = mapped_column(Enum(ScanStatus), default=ScanStatus.PENDING, nullable=False)
    overall_risk: Mapped[Optional[ScanRisk]] = mapped_column(Enum(ScanRisk), nullable=True)

    files_scanned: Mapped[int] = mapped_column(Integer, default=0)
    files_skipped: Mapped[int] = mapped_column(Integer, default=0)
    suspicious_file_count: Mapped[int] = mapped_column(Integer, default=0)

    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    uploaded_by = relationship("User")
    findings = relationship("ScanFinding", back_populates="scan", cascade="all, delete-orphan")


class ScanFinding(Base, TimestampMixin):
    __tablename__ = "scan_findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    scan_id: Mapped[str] = mapped_column(ForeignKey("project_scans.id"), nullable=False)

    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    finding_type: Mapped[str] = mapped_column(String(120), nullable=False)
    severity: Mapped[FindingSeverity] = mapped_column(Enum(FindingSeverity), default=FindingSeverity.LOW)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_snippet: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommendation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    scan = relationship("ProjectScan", back_populates="findings")
    created_incident = relationship(
        "Incident", back_populates="source_finding", uselist=False, foreign_keys="Incident.source_finding_id"
    )


class AIAnalysis(Base, TimestampMixin):
    """Stores a single AI Incident Analyzer request/response pair for audit/history."""

    __tablename__ = "ai_analyses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    incident_id: Mapped[Optional[str]] = mapped_column(ForeignKey("incidents.id"), nullable=True)
    requested_by_id: Mapped[Optional[str]] = mapped_column(ForeignKey("users.id"), nullable=True)

    input_text: Mapped[str] = mapped_column(Text, nullable=False)
    result_json: Mapped[str] = mapped_column(Text, nullable=False)  # serialized structured AI output
    provider: Mapped[str] = mapped_column(String(50), default="anthropic")
    succeeded: Mapped[bool] = mapped_column(default=True)

    incident = relationship("Incident", back_populates="ai_analyses")
    requested_by = relationship("User")
