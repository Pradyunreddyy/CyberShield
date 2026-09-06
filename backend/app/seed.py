"""
Seeds demo/sample data the first time the application starts against an
empty database, so the platform can be demonstrated immediately:

- `seed_demo_accounts_if_empty()` creates the admin/analyst/developer demo
  accounts. It NEVER runs if any user already exists, so it never overwrites
  real production accounts.
- `seed_demo_incidents_if_empty()` creates a small set of fictional incidents
  (with realistic-looking but entirely made-up IPs, hosts, and timelines) so
  the dashboard, incident list, and incident detail/timeline views have
  something real to show on a fresh database. It NEVER runs if any incident
  already exists, so it never mixes into or overwrites real case data. Every
  row it creates is tagged `source="demo_seed"` so the UI can badge it as
  "Demo" wherever it's displayed, and so the dashboard/analytics stats can
  tell demo-only data apart from a mix that includes real incidents.

Demo passwords are intentionally simple and documented in the README - they
are for local/demo use only and must be changed (or this seed disabled via
ENABLE_DEMO_SEED=false) before any real deployment.
"""
import logging
from datetime import timedelta

from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.alert import Alert
from app.models.common import IncidentSeverity, IncidentStatus, UserRole, utcnow
from app.models.incident import Incident, IncidentTimelineEvent
from app.models.user import User

logger = logging.getLogger("seed")

DEMO_ACCOUNTS = [
    {"full_name": "Alex Admin", "email": "admin@example.com", "password": "AdminDemo123!", "role": UserRole.ADMIN},
    {"full_name": "Sam Analyst", "email": "analyst@example.com", "password": "AnalystDemo123!", "role": UserRole.ANALYST},
    {"full_name": "Dana Developer", "email": "developer@example.com", "password": "DeveloperDemo123!", "role": UserRole.DEVELOPER},
]

DEMO_INCIDENTS = [
    {
        "title": "Brute Force Authentication Attack",
        "description": "Repeated failed login attempts against the SSO portal from a single external address, consistent with an automated credential-stuffing attempt.",
        "incident_type": "credential_attack",
        "severity": IncidentSeverity.CRITICAL,
        "status": IncidentStatus.INVESTIGATING,
        "source_ip": "203.0.113.44",
        "target_ip": "198.51.100.10",
        "affected_asset": "sso-portal.internal",
        "timeline_offsets_minutes": [0, 2, 6, 14],
        "timeline_events": [
            "Threat detected by authentication rate-limiting rules",
            "Auto-assigned to on-call analyst",
            "Investigation started — reviewing access logs for the source address",
            "Source address temporarily blocked at the edge firewall",
        ],
    },
    {
        "title": "SQL Injection Attempt",
        "description": "Web application firewall flagged crafted input containing SQL syntax on the customer search endpoint.",
        "incident_type": "misconfiguration",
        "severity": IncidentSeverity.HIGH,
        "status": IncidentStatus.OPEN,
        "source_ip": "198.51.100.23",
        "target_ip": "192.0.2.15",
        "affected_asset": "web-prod-04.internal",
        "timeline_offsets_minutes": [0, 3],
        "timeline_events": [
            "WAF blocked a request matching SQL injection signatures",
            "Incident opened for analyst triage",
        ],
    },
    {
        "title": "Malware Detection",
        "description": "Endpoint protection quarantined an executable matching a known trojan signature on a developer workstation.",
        "incident_type": "malware",
        "severity": IncidentSeverity.CRITICAL,
        "status": IncidentStatus.CONTAINED,
        "source_ip": None,
        "target_ip": "192.0.2.88",
        "affected_asset": "dev-workstation-12.internal",
        "timeline_offsets_minutes": [0, 4, 20, 45],
        "timeline_events": [
            "Endpoint agent flagged and quarantined a suspicious executable",
            "Analyst assigned",
            "Host isolated from the network pending investigation",
            "Malware sample confirmed contained; awaiting full remediation",
        ],
    },
    {
        "title": "Suspicious Port Scanning",
        "description": "Sequential connection attempts across a wide range of ports on the internal network segment, consistent with reconnaissance activity.",
        "incident_type": "reconnaissance",
        "severity": IncidentSeverity.MEDIUM,
        "status": IncidentStatus.INVESTIGATING,
        "source_ip": "203.0.113.77",
        "target_ip": "198.51.100.0/24",
        "affected_asset": "internal-network-segment-b",
        "timeline_offsets_minutes": [0, 10],
        "timeline_events": [
            "Network IDS flagged sequential port probing behavior",
            "Investigation started to determine scope and origin",
        ],
    },
    {
        "title": "Phishing Campaign Detected",
        "description": "Multiple employees reported a phishing email impersonating the IT helpdesk requesting password resets.",
        "incident_type": "phishing",
        "severity": IncidentSeverity.HIGH,
        "status": IncidentStatus.RESOLVED,
        "source_ip": None,
        "target_ip": None,
        "affected_asset": "mail-relay-01.internal",
        "timeline_offsets_minutes": [0, 30, 90, 180],
        "timeline_events": [
            "Phishing email reported by multiple employees",
            "Malicious sender domain blocked at the mail gateway",
            "Affected mailboxes swept and the message removed",
            "Incident resolved; awareness reminder sent to staff",
        ],
    },
    {
        "title": "Suspicious Outbound Traffic",
        "description": "Unusual volume of outbound traffic to an unfamiliar external address from an internal database host outside of normal business hours.",
        "incident_type": "data_exfiltration",
        "severity": IncidentSeverity.MEDIUM,
        "status": IncidentStatus.OPEN,
        "source_ip": "192.0.2.51",
        "target_ip": "203.0.113.9",
        "affected_asset": "db-replica-01.internal",
        "timeline_offsets_minutes": [0],
        "timeline_events": [
            "Network monitoring flagged anomalous outbound traffic volume",
        ],
    },
    {
        "title": "Credential Abuse",
        "description": "A valid employee credential was used to log in from two geographically distant locations within minutes of each other.",
        "incident_type": "credential_attack",
        "severity": IncidentSeverity.HIGH,
        "status": IncidentStatus.RESOLVED,
        "source_ip": "198.51.100.201",
        "target_ip": "198.51.100.10",
        "affected_asset": "vpn-edge-03.internal",
        "timeline_offsets_minutes": [0, 5, 25],
        "timeline_events": [
            "Impossible-travel rule flagged concurrent logins from distant locations",
            "Account session revoked and password reset forced",
            "Confirmed as credential reuse from an unrelated breach; incident resolved",
        ],
    },
]


def seed_demo_accounts_if_empty() -> None:
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return

        for account in DEMO_ACCOUNTS:
            user = User(
                full_name=account["full_name"],
                email=account["email"],
                hashed_password=hash_password(account["password"]),
                role=account["role"],
                is_active=True,
            )
            db.add(user)
        db.commit()
        logger.info("Seeded demo accounts: admin@example.com / analyst@example.com / developer@example.com")
    finally:
        db.close()


def seed_demo_incidents_if_empty() -> None:
    """Populate fictional, clearly-tagged incidents on a fresh demo database."""
    db = SessionLocal()
    try:
        if db.query(Incident).count() > 0:
            return

        analyst = db.query(User).filter(User.email == "analyst@example.com").first()
        admin = db.query(User).filter(User.email == "admin@example.com").first()
        developer = db.query(User).filter(User.email == "developer@example.com").first()
        if not analyst or not admin:
            logger.info("Skipping demo incident seed: demo accounts not present.")
            return

        now = utcnow()
        for index, item in enumerate(DEMO_INCIDENTS):
            reporter = developer if index % 3 == 0 and developer else analyst
            assigned = admin if item["severity"] == IncidentSeverity.CRITICAL else analyst
            created_at = now - timedelta(hours=(index + 1) * 7)

            incident = Incident(
                code=f"INC-{1000 + index + 1}",
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

            if item["severity"] in (IncidentSeverity.CRITICAL, IncidentSeverity.HIGH):
                db.add(
                    Alert(
                        alert_type="critical_incident_created" if item["severity"] == IncidentSeverity.CRITICAL else "high_incident_created",
                        message=f"{item['severity'].value.upper()} incident {incident.code} was created: {incident.title}",
                        severity="critical" if item["severity"] == IncidentSeverity.CRITICAL else "warning",
                        related_incident_id=incident.id,
                        is_read=item["status"] in (IncidentStatus.RESOLVED, IncidentStatus.CLOSED),
                        created_at=created_at,
                        updated_at=created_at,
                    )
                )

        db.commit()
        logger.info("Seeded %d demo incidents (tagged source=demo_seed).", len(DEMO_INCIDENTS))
    finally:
        db.close()
