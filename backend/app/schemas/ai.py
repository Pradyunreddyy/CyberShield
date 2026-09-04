from typing import Optional

from pydantic import BaseModel, Field


class AIAnalyzeRequest(BaseModel):
    incident_id: Optional[str] = None
    description: str = Field(min_length=5, max_length=8000)
    logs: Optional[str] = Field(default=None, max_length=8000)
    indicators: Optional[str] = Field(default=None, max_length=2000)


class AIAnalyzeResult(BaseModel):
    risk_level: str
    possible_type: str
    summary: str
    suspicious_indicators: list[str] = []
    possible_attack_technique: Optional[str] = None
    severity_recommendation: str
    recommended_investigation_steps: list[str] = []
    recommended_response_actions: list[str] = []
    explanation: str
    disclaimer: str = (
        "AI-generated analysis is advisory and should be validated by a qualified "
        "security analyst before any action is taken."
    )
    provider: str
    degraded: bool = False  # true when the AI service was unavailable and a fallback was used
