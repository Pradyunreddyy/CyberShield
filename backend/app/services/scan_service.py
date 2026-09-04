"""
Orchestrates the Project Security Analyzer end-to-end:

  upload -> validate -> safe extract -> static analysis -> dependency analysis
  -> persist findings -> (optionally) AI explanation -> overall risk rating

The uploaded project is NEVER executed at any point in this pipeline.
"""
import logging
import os
import shutil
import tempfile

from fastapi import UploadFile
from sqlalchemy.orm import Session

from app.ai import ai_service
from app.models.common import FindingSeverity, ScanRisk, ScanStatus
from app.models.scan import ProjectScan, ScanFinding
from app.models.user import User
from app.repositories import scan_repo
from app.scanners.archive_handler import UnsafeArchiveError, safe_extract
from app.scanners.dependency_analyzer import analyze_dependencies
from app.scanners.file_validator import cleanup_file, validate_and_store_upload
from app.scanners.static_analyzer import run_static_analysis
from app.services import alert_service, audit_service

logger = logging.getLogger("scan_service")

_SEVERITY_ORDER = [FindingSeverity.INFO, FindingSeverity.LOW, FindingSeverity.MEDIUM, FindingSeverity.HIGH, FindingSeverity.CRITICAL]
_RISK_MAP = {
    FindingSeverity.INFO: ScanRisk.SAFE,
    FindingSeverity.LOW: ScanRisk.LOW,
    FindingSeverity.MEDIUM: ScanRisk.MEDIUM,
    FindingSeverity.HIGH: ScanRisk.HIGH,
    FindingSeverity.CRITICAL: ScanRisk.CRITICAL,
}


def _overall_risk(findings: list[ScanFinding]) -> ScanRisk:
    if not findings:
        return ScanRisk.SAFE
    highest = max((FindingSeverity(f.severity) for f in findings), key=lambda s: _SEVERITY_ORDER.index(s))
    return _RISK_MAP[highest]


def run_project_scan(db: Session, file: UploadFile, current_user: User, explain_with_ai: bool = True) -> ProjectScan:
    validated = validate_and_store_upload(file)

    scan = ProjectScan(
        uploaded_by_id=current_user.id,
        original_filename=validated.original_filename,
        stored_filename=validated.stored_filename,
        file_size_bytes=validated.size_bytes,
        status=ScanStatus.RUNNING,
    )
    scan = scan_repo.create_scan(db, scan)

    audit_service.record(
        db, user_id=current_user.id, action="scan.uploaded", resource_type="project_scan",
        resource_id=scan.id, metadata={"original_filename": validated.original_filename},
    )

    extract_dir = tempfile.mkdtemp(prefix="scan_extract_")
    try:
        extraction = safe_extract(validated.stored_path, extract_dir)

        static_result = run_static_analysis(extract_dir)
        dependency_findings = analyze_dependencies(extract_dir)

        all_findings = list(static_result.findings) + dependency_findings

        for f in all_findings:
            ai_explanation = None
            if explain_with_ai and f.severity in ("high", "critical"):
                ai_result = ai_service.explain_scan_finding(f.finding_type, f.file_path, f.evidence_snippet)
                ai_explanation = ai_result["explanation"]
                if not f.recommendation:
                    f.recommendation = ai_result["recommendation"]

            finding = ScanFinding(
                scan_id=scan.id,
                file_path=f.file_path,
                finding_type=f.finding_type,
                severity=FindingSeverity(f.severity),
                description=f.description,
                evidence_snippet=f.evidence_snippet,
                recommendation=f.recommendation,
                ai_explanation=ai_explanation,
            )
            scan_repo.add_finding(db, finding)

        scan.status = ScanStatus.COMPLETED
        scan.files_scanned = static_result.files_scanned
        scan.files_skipped = static_result.files_skipped + extraction.skipped_count
        scan.suspicious_file_count = len({f.file_path for f in all_findings})
        scan.overall_risk = _overall_risk(scan_repo.get_scan(db, scan.id).findings)
        scan = scan_repo.update_scan(db, scan)

        audit_service.record(
            db, user_id=current_user.id, action="scan.completed", resource_type="project_scan",
            resource_id=scan.id, metadata={"overall_risk": scan.overall_risk.value, "findings": len(all_findings)},
        )

        if scan.overall_risk in (ScanRisk.HIGH, ScanRisk.CRITICAL):
            alert_service.create_alert(
                db, alert_type="suspicious_project_detected",
                message=f"Project scan of '{validated.original_filename}' found {scan.overall_risk.value.upper()} risk issues.",
                severity="critical" if scan.overall_risk == ScanRisk.CRITICAL else "warning",
                related_scan_id=scan.id,
            )

    except UnsafeArchiveError as exc:
        scan.status = ScanStatus.FAILED
        scan.error_message = str(exc)
        scan = scan_repo.update_scan(db, scan)
        audit_service.record(
            db, user_id=current_user.id, action="scan.failed", resource_type="project_scan",
            resource_id=scan.id, metadata={"error": str(exc)},
        )
    except Exception as exc:  # pragma: no cover - defensive catch-all
        logger.exception("Unexpected error while scanning project")
        scan.status = ScanStatus.FAILED
        scan.error_message = "An unexpected error occurred while analyzing the project."
        scan = scan_repo.update_scan(db, scan)
    finally:
        shutil.rmtree(extract_dir, ignore_errors=True)
        cleanup_file(validated.stored_path)

    return scan
