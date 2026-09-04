from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    alert_type: str
    message: str
    severity: str
    is_read: bool
    related_incident_id: Optional[str] = None
    related_scan_id: Optional[str] = None
    created_at: datetime
