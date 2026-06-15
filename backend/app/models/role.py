import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

# All permission scopes supported by the RBAC system.
PERMISSION_SCOPES: tuple[str, ...] = (
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
)

# Default permission sets assigned to the built-in roles created for every workspace.
DEFAULT_ROLE_PERMISSIONS: dict[str, list[str]] = {
    "admin": list(PERMISSION_SCOPES),
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


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    permissions: Mapped[list[str]] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), onupdate=func.now(), nullable=False
    )
