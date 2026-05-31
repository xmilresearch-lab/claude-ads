"""saas_billing_fields

Revision ID: c4d5e6f7a8b9
Revises: a1b2c3d4e5f6
Create Date: 2026-05-31 00:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c4d5e6f7a8b9"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── users table ───────────────────────────────────────────────────────────
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("users", sa.Column("email_verified", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("users", sa.Column("email_verify_token", sa.String(), nullable=True))
    op.add_column("users", sa.Column("email_verify_expires", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("password_reset_token", sa.String(), nullable=True))
    op.add_column("users", sa.Column("password_reset_expires", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(), nullable=True))
    op.add_column("users", sa.Column("stripe_subscription_id", sa.String(), nullable=True))
    op.add_column("users", sa.Column("subscription_status", sa.String(), nullable=False, server_default="free"))
    op.add_column("users", sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True))

    op.create_index(
        op.f("ix_users_stripe_customer_id"),
        "users",
        ["stripe_customer_id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_users_email_verify_token"),
        "users",
        ["email_verify_token"],
        unique=False,
    )
    op.create_index(
        op.f("ix_users_password_reset_token"),
        "users",
        ["password_reset_token"],
        unique=False,
    )

    # ── workspaces table ──────────────────────────────────────────────────────
    op.add_column(
        "workspaces",
        sa.Column("monthly_token_usage", sa.BigInteger(), nullable=False, server_default="0"),
    )
    op.add_column(
        "workspaces",
        sa.Column("monthly_token_reset_date", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    # ── workspaces table ──────────────────────────────────────────────────────
    op.drop_column("workspaces", "monthly_token_reset_date")
    op.drop_column("workspaces", "monthly_token_usage")

    # ── users table ───────────────────────────────────────────────────────────
    op.drop_index(op.f("ix_users_password_reset_token"), table_name="users")
    op.drop_index(op.f("ix_users_email_verify_token"), table_name="users")
    op.drop_index(op.f("ix_users_stripe_customer_id"), table_name="users")
    op.drop_column("users", "current_period_end")
    op.drop_column("users", "subscription_status")
    op.drop_column("users", "stripe_subscription_id")
    op.drop_column("users", "stripe_customer_id")
    op.drop_column("users", "password_reset_expires")
    op.drop_column("users", "password_reset_token")
    op.drop_column("users", "email_verify_expires")
    op.drop_column("users", "email_verify_token")
    op.drop_column("users", "email_verified")
    op.drop_column("users", "is_admin")
