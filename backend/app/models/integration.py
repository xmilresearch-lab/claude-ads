import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class IntegrationType(str, enum.Enum):
    social = "social"
    email = "email"
    crm = "crm"
    support = "support"


class IntegrationStatus(str, enum.Enum):
    active = "active"
    error = "error"
    expired = "expired"
    disconnected = "disconnected"


class Integration(Base):
    __tablename__ = "integrations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id: Mapped[str] = mapped_column(String, ForeignKey("workspaces.id"), nullable=False)
    type: Mapped[IntegrationType] = mapped_column(SAEnum(IntegrationType), nullable=False)
    provider: Mapped[str] = mapped_column(String(100), nullable=False)
    credentials: Mapped[str] = mapped_column(String, nullable=False)  # AES-256-GCM encrypted JSON
    status: Mapped[IntegrationStatus] = mapped_column(
        SAEnum(IntegrationStatus), default=IntegrationStatus.active
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="integrations")
