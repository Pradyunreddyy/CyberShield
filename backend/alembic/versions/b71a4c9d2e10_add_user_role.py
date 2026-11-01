"""add regular user role

Revision ID: b71a4c9d2e10
Revises: 60c6cf36a396
Create Date: 2026-11-01
"""
from typing import Sequence, Union

from alembic import op

revision: str = "b71a4c9d2e10"
down_revision: Union[str, None] = "60c6cf36a396"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL enum used by users.role. Existing developer/analyst/admin
    # values and rows are preserved.
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'USER'")


def downgrade() -> None:
    # PostgreSQL cannot safely remove a value from an enum type in-place.
    # Keep USER in the enum on downgrade rather than risk damaging user rows.
    pass
