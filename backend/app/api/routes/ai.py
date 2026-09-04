import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.ai import ai_service
from app.api.deps import get_current_user, require_analyst_or_admin
from app.database.session import get_db
from app.models.scan import AIAnalysis
from app.models.user import User
from app.schemas.ai import AIAnalyzeRequest, AIAnalyzeResult
from app.services import audit_service

router = APIRouter(prefix="/api/ai", tags=["AI Incident Analyzer"], dependencies=[Depends(require_analyst_or_admin)])


@router.post(
    "/analyze-incident",
    response_model=AIAnalyzeResult,
    summary="Run the AI Incident Analyzer over incident text/logs/indicators",
    description="The AI service is called server-side only (the API key is never exposed to the browser). "
    "Output is advisory - a qualified analyst must validate it before acting. If the AI provider is "
    "unavailable, a clearly-labeled fallback assessment is returned instead of failing the request.",
)
def analyze_incident(
    payload: AIAnalyzeRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    raw_result = ai_service.analyze_incident(payload.description, payload.logs, payload.indicators)

    result = AIAnalyzeResult(
        risk_level=raw_result.get("risk_level", "MEDIUM"),
        possible_type=raw_result.get("possible_type", "Unknown"),
        summary=raw_result.get("summary", ""),
        suspicious_indicators=raw_result.get("suspicious_indicators", []),
        possible_attack_technique=raw_result.get("possible_attack_technique"),
        severity_recommendation=raw_result.get("severity_recommendation", "medium"),
        recommended_investigation_steps=raw_result.get("recommended_investigation_steps", []),
        recommended_response_actions=raw_result.get("recommended_response_actions", []),
        explanation=raw_result.get("explanation", ""),
        provider=raw_result.get("provider", "unknown"),
        degraded=raw_result.get("degraded", False),
    )

    analysis = AIAnalysis(
        incident_id=payload.incident_id,
        requested_by_id=current_user.id,
        input_text=payload.description,
        result_json=json.dumps(result.model_dump()),
        provider=result.provider,
        succeeded=not result.degraded,
    )
    db.add(analysis)
    db.commit()

    audit_service.record(
        db, user_id=current_user.id, action="ai.incident_analyzed", resource_type="incident",
        resource_id=payload.incident_id, metadata={"degraded": result.degraded},
    )

    return result
