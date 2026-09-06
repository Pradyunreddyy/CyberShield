"""Ensure the built-in fictional demo data exists when demo seeding is enabled."""
import logging
from datetime import timedelta

from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.alert import Alert
from app.models.common import IncidentStatus, UserRole, utcnow
from app.models.incident import Incident, IncidentTimelineEvent
from app.models.user import User
from app.seed import DEMO_ACCOUNTS, DEMO_INCIDENTS

logger = logging.getLogger("demo_data")


def ensure_demo_data() -> None:
    """Create missing demo accounts/incidents without touching real records."""
    db = SessionLocal()
    try:
        users = {}
        for account in DEMO_ACCOUNTS:
            user = db.query(User).filter(User.email == account["email"]).first()
            if user is None:
                user = User(
                    full_name=account["full_name"],
                    email=account["email"],
                    hashed_password=hash_password(account["password"]),
                    role=account["role"],
                    is_active=True,
                )
                db.add(user)
                db.flush()
            users[account["email"]] = user

        analyst = users.get("analyst@example.com")
        admin = users.get("admin@example.com")
        developer = users.get("developer@example.com")
        if not analyst or not admin:
            logger.warning("Demo incident seed skipped because required demo users are unavailable.")
            db.commit()
            return

        existing_codes = {
            code
            for (code,) in db.query(Incident.code).filter(Incident.source == "demo_seed").all()
        }
        now = utcnow()
        added = 0

        for index, item in enumerate(DEMO_INCIDENTS):
            code = f"INC-{1000 + index + 1}"
            if code in existing_codes:
                continue

            reporter = developer if index % 3 == 0 and developer else analyst
            assigned = admin if item["severity"].value == "critical" else analyst
            created_at = now - timedelta(hours=(index + 1) * 7)

            incident = Incident(
                code=code,
                title=item["title"],
                description=item["description"],
                incident_type=item["incident_type"],
                severity=item["severity"],
                status=item["status"],
                source="demo_seed",
                affected_asset=item["affected_asset"],
                source_ip=item["source_ip"],
                target_ip=item["target_ip"],
                reporter_id=reporter.id,
                assigned_analyst_id=assigned.id,
                created_at=created_at,
                updated_at=created_at,
            )
            db.add(incident)
            db.flush()

            for minutes, description in zip(item["timeline_offsets_minutes"], item["timeline_events"]):
                db.add(
                    IncidentTimelineEvent(
                        incident_id=incident.id,
                        author_id=assigned.id,
                        event_time=created_at + timedelta(minutes=minutes),
                        description=description,
                    )
                )

            if item["status"] in (IncidentStatus.RESOLVED, IncidentStatus.CLOSED):
                incident.updated_at = created_at + timedelta(minutes=item["timeline_offsets_minutes"][-1])

            if item["severity"].value in ("critical", "high"):
                db.add(
                    Alert(
                        alert_type="critical_incident_created" if item["severity"].value == "critical" else "high_incident_created",
                        message=f"{item['severity'].value.upper()} incident {incident.code} was created: {incident.title}",
                        severity="critical" if item["severity"].value == "critical" else "warning",
                        related_incident_id=incident.id,
                        is_read=item["status"] in (IncidentStatus.RESOLVED, IncidentStatus.CLOSED),
                        created_at=created_at,
                        updated_at=created_at,
                    )
                )
            added += 1

        db.commit()
        if added:
            logger.info("Ensured %d missing demo incidents are present.", added)
    except Exception:
        db.rollback()
        logger.exception("Unable to ensure demo data")
        raise
    finally:
        db.close()
