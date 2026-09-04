from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.common import IncidentSeverity, IncidentStatus
from app.schemas.user import UserOut


class IncidentCreate(BaseModel):
    title: str = Field(min_length=3, max_length=255)
    description: str = ""
    incident_type: str = "uncategorized"
    severity: IncidentSeverity = IncidentSeverity.LOW
    affected_asset: Optional[str] = None
    source_ip: Optional[str] = None
    target_ip: Optional[str] = None
    assigned_analyst_id: Optional[str] = None


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    incident_type: Optional[str] = None
    severity: Optional[IncidentSeverity] = None
    status: Optional[IncidentStatus] = None
    affected_asset: Optional[str] = None
    source_ip: Optional[str] = None
    target_ip: Optional[str] = None
    assigned_analyst_id: Optional[str] = None


class IncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    title: str
    description: str
    incident_type: str
    severity: IncidentSeverity
    status: IncidentStatus
    source: str
    affected_asset: Optional[str] = None
    source_ip: Optional[str] = None
    target_ip: Optional[str] = None
    reporter: Optional[UserOut] = None
    assigned_analyst: Optional[UserOut] = None
    source_finding_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class IncidentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    code: str
    title: str
    incident_type: str
    severity: IncidentSeverity
    status: IncidentStatus
    reporter: Optional[UserOut] = None
    assigned_analyst: Optional[UserOut] = None
    created_at: datetime
    updated_at: datetime


class PaginatedIncidents(BaseModel):
    items: list[IncidentListItem]
    total: int
    page: int
    page_size: int


class NoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=4000)


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    content: str
    author: Optional[UserOut] = None
    created_at: datetime


class TimelineEventCreate(BaseModel):
    description: str = Field(min_length=1, max_length=500)
    event_time: Optional[datetime] = None


class TimelineEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    description: str
    event_time: datetime
    author: Optional[UserOut] = None


class ActionCreate(BaseModel):
    action: str = Field(min_length=1, max_length=255)
    result: str = "completed"


class ActionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    action: str
    result: str
    performed_by: Optional[UserOut] = None
    created_at: datetime


class IncidentDetailOut(IncidentOut):
    notes: list[NoteOut] = []
    timeline_events: list[TimelineEventOut] = []
    actions: list[ActionOut] = []
