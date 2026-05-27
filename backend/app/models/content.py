import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ContentStatus(str, enum.Enum):
    pending_approval = "pending_approval"
    approved = "approved"
    scheduled = "scheduled"
    published = "published"
    failed = "failed"


class ContentQueue(Base):
    __tablename__ = "content_queue"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    automation_id: Mapped[str] = mapped_column(String, ForeignKey("automations.id"), nullable=False)
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    platform: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[ContentStatus] = mapped_column(SAEnum(ContentStatus), default=ContentStatus.pending_approval)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    automation: Mapped["Automation"] = relationship("Automation", back_populates="content_queue")
