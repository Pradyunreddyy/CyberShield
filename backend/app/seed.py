"""
Seeds three demo accounts (admin, analyst, developer) the first time the
application starts against an empty `users` table, so the platform can be
demonstrated immediately. This NEVER runs if any user already exists, so it
never overwrites real production accounts.

Demo passwords are intentionally simple and documented in the README - they
are for local/demo use only and must be changed (or this seed disabled via
ENABLE_DEMO_SEED=false) before any real deployment.
"""
import logging

from app.core.security import hash_password
from app.database.session import SessionLocal
from app.models.common import UserRole
from app.models.user import User

logger = logging.getLogger("seed")

DEMO_ACCOUNTS = [
    {"full_name": "Alex Admin", "email": "admin@example.com", "password": "AdminDemo123!", "role": UserRole.ADMIN},
    {"full_name": "Sam Analyst", "email": "analyst@example.com", "password": "AnalystDemo123!", "role": UserRole.ANALYST},
    {"full_name": "Dana Developer", "email": "developer@example.com", "password": "DeveloperDemo123!", "role": UserRole.DEVELOPER},
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
