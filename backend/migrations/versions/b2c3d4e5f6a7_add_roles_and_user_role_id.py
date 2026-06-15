"""add_roles_and_user_role_id

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-06-15 00:00:00.000000

"""
import uuid
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Permission scopes supported by the RBAC system (kept in sync with app/models/role.py).
_ALL_SCOPES = [
    "forms:create",
    "forms:edit",
    "forms:delete",
    "forms:view_own",
    "forms:view_all",
    "forms:sign",
    "records:view_own",
    "records:view_all",
    "records:create",
    "roles:manage",
]

_DEFAULT_ROLE_PERMISSIONS = {
    "admin": _ALL_SCOPES,
    "staff": [
        "forms:create",
        "forms:edit",
        "forms:view_all",
        "forms:sign",
        "records:view_all",
        "records:create",
    ],
    "caregiver": [
        "forms:view_own",
        "forms:sign",
        "records:view_own",
    ],
    "patient": [
        "forms:view_own",
        "records:view_own",
    ],
}


def upgrade() -> None:
    op.create_table(
        'roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('permissions', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_roles_workspace_id'), 'roles', ['workspace_id'], unique=False)

    op.add_column('users', sa.Column('role_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key('fk_users_role_id_roles', 'users', 'roles', ['role_id'], ['id'])

    # Data migration: seed the 4 default roles for every existing workspace and
    # backfill role_id = admin role for the workspace's owning user (backward
    # compatible default — these users previously had implicit admin access).
    bind = op.get_bind()

    roles_table = sa.table(
        'roles',
        sa.column('id', postgresql.UUID(as_uuid=True)),
        sa.column('workspace_id', postgresql.UUID(as_uuid=True)),
        sa.column('name', sa.String()),
        sa.column('permissions', postgresql.JSONB(astext_type=sa.Text())),
    )
    workspaces_table = sa.table(
        'workspaces',
        sa.column('id', postgresql.UUID(as_uuid=True)),
        sa.column('user_id', postgresql.UUID(as_uuid=True)),
    )
    users_table = sa.table(
        'users',
        sa.column('id', postgresql.UUID(as_uuid=True)),
        sa.column('role_id', postgresql.UUID(as_uuid=True)),
    )

    workspaces = bind.execute(
        sa.select(workspaces_table.c.id, workspaces_table.c.user_id)
    ).fetchall()

    for workspace_id, owner_id in workspaces:
        admin_role_id = uuid.uuid4()
        for name, permissions in _DEFAULT_ROLE_PERMISSIONS.items():
            bind.execute(
                roles_table.insert().values(
                    id=admin_role_id if name == "admin" else uuid.uuid4(),
                    workspace_id=workspace_id,
                    name=name,
                    permissions=permissions,
                )
            )

        bind.execute(
            users_table.update()
            .where(users_table.c.id == owner_id)
            .where(users_table.c.role_id.is_(None))
            .values(role_id=admin_role_id)
        )


def downgrade() -> None:
    op.drop_constraint('fk_users_role_id_roles', 'users', type_='foreignkey')
    op.drop_column('users', 'role_id')
    op.drop_index(op.f('ix_roles_workspace_id'), table_name='roles')
    op.drop_table('roles')
