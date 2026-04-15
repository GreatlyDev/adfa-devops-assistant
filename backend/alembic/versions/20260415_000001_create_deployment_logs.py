"""create deployment logs

Revision ID: 20260415_000001
Revises:
Create Date: 2026-04-15 13:00:00
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260415_000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "deployment_logs",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("service_name", sa.String(), nullable=True),
        sa.Column("environment", sa.String(), nullable=True),
        sa.Column("source", sa.String(), nullable=True),
        sa.Column("branch", sa.String(), nullable=True),
        sa.Column("commit_sha", sa.String(), nullable=True),
        sa.Column("triggered_by", sa.String(), nullable=True),
        sa.Column("log_text", sa.Text(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("issues", sa.Text(), nullable=False),
        sa.Column("recommendations", sa.Text(), nullable=False),
        sa.Column("issue_categories", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("matched_signals", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("confidence_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )
    op.create_index("ix_deployment_logs_id", "deployment_logs", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_deployment_logs_id", table_name="deployment_logs")
    op.drop_table("deployment_logs")
