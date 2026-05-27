import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class AutomationType(str, enum.Enum):
    social_posting = "social_posting"
    email_campaign = "email_campaign"
    support_reply = "support_reply"
    crm_update = "crm_update"
    content_repurposing = "content_repurposing"


class AutomationRunStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class Automation(Base):
    __tablename__ = "automations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id: Mapped[str] = mapped_column(String, ForeignKey("workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[AutomationType] = mapped_column(SAEnum(AutomationType), nullable=False)
    config: Mapped[dict] = mapped_column(JSONB, default=dict)
    schedule: Mapped[str | None] = mapped_column(String(100), nullable=True)  # cron expression
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="automations")
    runs: Mapped[list["AutomationRun"]] = relationship(
        "AutomationRun", back_populates="automation", cascade="all, delete-orphan"
    )
    content_queue: Mapped[list["ContentQueue"]] = relationship(
        "ContentQueue", back_populates="automation", cascade="all, delete-orphan"
    )


class AutomationRun(Base):
    __tablename__ = "automation_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    automation_id: Mapped[str] = mapped_column(String, ForeignKey("automations.id"), nullable=False)
    status: Mapped[AutomationRunStatus] = mapped_column(
        SAEnum(AutomationRunStatus), default=AutomationRunStatus.pending
    )
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    automation: Mapped["Automation"] = relationship("Automation", back_populates="runs")
