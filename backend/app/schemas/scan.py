from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from app.models.common import FindingSeverity, ScanRisk, ScanStatus


class ScanFindingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    file_path: str
    finding_type: str
    severity: FindingSeverity
    description: str
    evidence_snippet: Optional[str] = None
    recommendation: Optional[str] = None
    ai_explanation: Optional[str] = None


class ScanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    original_filename: str
    file_size_bytes: int
    status: ScanStatus
    overall_risk: Optional[ScanRisk] = None
    files_scanned: int
    files_skipped: int
    suspicious_file_count: int
    error_message: Optional[str] = None
    created_at: datetime


class ScanDetailOut(ScanOut):
    findings: list[ScanFindingOut] = []


class CreateIncidentFromFindingRequest(BaseModel):
    assigned_analyst_id: Optional[str] = None
