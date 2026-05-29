"""
Shared factory-boy factories for all SQLAlchemy models.

Usage in tests:
    from tests.factories import UserFactory, WorkspaceFactory, AutomationFactory

All factories are pure Python objects — no DB session required.
Use .create() for a factory instance, .build() for an unsaved mock.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

import factory
from faker import Faker

from app.core.security import encrypt_credential, hash_password

fake = Faker()

_NOW = datetime.now(timezone.utc)


class UserFactory(factory.Factory):
    class Meta:
        model = MagicMock

    id = factory.LazyFunction(uuid.uuid4)
    email = factory.LazyFunction(fake.email)
    hashed_password = factory.LazyFunction(lambda: hash_password("Test1234!"))
    plan = "free"
    is_active = True
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class WorkspaceFactory(factory.Factory):
    class Meta:
        model = MagicMock

    id = factory.LazyFunction(uuid.uuid4)
    user_id = factory.LazyFunction(uuid.uuid4)
    name = factory.LazyFunction(fake.company)
    brand_voice = factory.LazyFunction(lambda: {
        "tone": "professional but approachable",
        "writing_style": "concise",
        "avoid": ["jargon", "passive voice"],
        "examples": ["We help teams work smarter with AI."],
        "industry": "SaaS",
        "target_audience": "SMB founders",
    })
    settings = factory.LazyFunction(dict)
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class IntegrationFactory(factory.Factory):
    class Meta:
        model = MagicMock

    id = factory.LazyFunction(uuid.uuid4)
    workspace_id = factory.LazyFunction(uuid.uuid4)
    type = "twitter"
    credentials_encrypted = factory.LazyFunction(
        lambda: encrypt_credential('{"access_token": "test_token", "refresh_token": "test_refresh"}')
    )
    status = "active"
    meta = factory.LazyFunction(lambda: {"account_id": "123", "account_name": "Test Account"})
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class AutomationFactory(factory.Factory):
    class Meta:
        model = MagicMock

    id = factory.LazyFunction(uuid.uuid4)
    workspace_id = factory.LazyFunction(uuid.uuid4)
    name = factory.LazyFunction(lambda: f"Test Automation {fake.word().capitalize()}")
    type = "social_post"
    config = factory.LazyFunction(lambda: {"platforms": ["linkedin"], "require_approval": True})
    trigger = "manual"
    schedule = None
    active = True
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    updated_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class AutomationRunFactory(factory.Factory):
    class Meta:
        model = MagicMock

    id = factory.LazyFunction(uuid.uuid4)
    automation_id = factory.LazyFunction(uuid.uuid4)
    status = "success"
    result = factory.LazyFunction(lambda: {"content": "AI generated content."})
    error = None
    ai_tokens_used = 450
    started_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    finished_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class ContentQueueFactory(factory.Factory):
    class Meta:
        model = MagicMock

    id = factory.LazyFunction(uuid.uuid4)
    automation_id = factory.LazyFunction(uuid.uuid4)
    content = factory.LazyFunction(lambda: {
        "text": "Check out our latest AI features!",
        "hashtags": ["#AI", "#SaaS"],
    })
    platform = "linkedin"
    status = "pending_approval"
    scheduled_at = None
    published_at = None
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))


class AuditLogFactory(factory.Factory):
    class Meta:
        model = MagicMock

    id = factory.LazyFunction(uuid.uuid4)
    workspace_id = factory.LazyFunction(uuid.uuid4)
    action = "automation_run"
    actor = "system"
    log_metadata = factory.LazyFunction(lambda: {
        "tokens_used": 450,
        "dlp_violations": [],
        "automation_id": str(uuid.uuid4()),
    })
    created_at = factory.LazyFunction(lambda: datetime.now(timezone.utc))
