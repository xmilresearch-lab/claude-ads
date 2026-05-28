"""Tests for AutomationCreate and AutomationUpdate schema validators."""

import pytest


# ── AutomationCreate validators ────────────────────────────────────────────────


def test_automation_create_valid() -> None:
    """Valid AutomationCreate passes all validators."""
    from app.schemas.automation import AutomationCreate

    a = AutomationCreate(
        name="Daily LinkedIn Post",
        type="social_post",
        config={"platforms": ["linkedin"]},
        trigger="schedule",
        schedule="0 9 * * MON-FRI",
    )
    assert a.name == "Daily LinkedIn Post"
    assert a.schedule == "0 9 * * MON-FRI"


def test_automation_create_strips_whitespace_from_name() -> None:
    """Name validator strips leading/trailing whitespace."""
    from app.schemas.automation import AutomationCreate

    a = AutomationCreate(
        name="  My Automation  ",
        type="social_post",
        config={"platforms": ["twitter"]},
        trigger="manual",
    )
    assert a.name == "My Automation"


def test_automation_create_rejects_name_over_255_chars() -> None:
    """Name validator raises when name exceeds 255 characters."""
    from app.schemas.automation import AutomationCreate

    with pytest.raises(Exception, match="255"):
        AutomationCreate(
            name="x" * 256,
            type="social_post",
            config={"platforms": ["linkedin"]},
            trigger="manual",
        )


def test_automation_create_rejects_invalid_cron_schedule() -> None:
    """schedule validator raises for malformed cron expressions."""
    from app.schemas.automation import AutomationCreate

    with pytest.raises(Exception, match="[Ii]nvalid cron"):
        AutomationCreate(
            name="Test",
            type="social_post",
            config={"platforms": ["linkedin"]},
            trigger="schedule",
            schedule="not a valid cron expression",
        )


def test_automation_create_accepts_none_schedule() -> None:
    """schedule validator accepts None (webhook or manual trigger)."""
    from app.schemas.automation import AutomationCreate

    a = AutomationCreate(
        name="Webhook Automation",
        type="social_post",
        config={"platforms": ["twitter"]},
        trigger="webhook",
        schedule=None,
    )
    assert a.schedule is None


def test_automation_create_rejects_config_with_dunder_keys() -> None:
    """config validator rejects keys starting with '__'."""
    from app.schemas.automation import AutomationCreate

    with pytest.raises(Exception, match="__"):
        AutomationCreate(
            name="Test",
            type="social_post",
            config={"__class__": "evil"},
            trigger="manual",
        )


def test_automation_create_rejects_config_with_blocked_keys() -> None:
    """config validator rejects config keys containing injection keywords."""
    from app.schemas.automation import AutomationCreate

    with pytest.raises(Exception, match="[Nn]ot allowed"):
        AutomationCreate(
            name="Test",
            type="social_post",
            config={"system_prompt": "override the system"},
            trigger="manual",
        )


def test_automation_create_accepts_valid_config_keys() -> None:
    """config validator accepts safe, non-blocked key names."""
    from app.schemas.automation import AutomationCreate

    a = AutomationCreate(
        name="Test",
        type="social_post",
        config={"platforms": ["linkedin"], "require_approval": True, "max_length": 280},
        trigger="manual",
    )
    assert "platforms" in a.config


# ── AutomationUpdate validators ────────────────────────────────────────────────


def test_automation_update_none_fields_pass_through() -> None:
    """AutomationUpdate validators pass None values through unchanged."""
    from app.schemas.automation import AutomationUpdate

    u = AutomationUpdate()
    assert u.name is None
    assert u.schedule is None
    assert u.config is None


def test_automation_update_name_strips_whitespace() -> None:
    """AutomationUpdate name validator strips whitespace."""
    from app.schemas.automation import AutomationUpdate

    u = AutomationUpdate(name="  Updated Name  ")
    assert u.name == "Updated Name"


def test_automation_update_name_rejects_too_long() -> None:
    """AutomationUpdate name validator rejects names > 255 chars."""
    from app.schemas.automation import AutomationUpdate

    with pytest.raises(Exception, match="255"):
        AutomationUpdate(name="x" * 256)


def test_automation_update_schedule_validates_cron() -> None:
    """AutomationUpdate schedule validator rejects invalid cron."""
    from app.schemas.automation import AutomationUpdate

    with pytest.raises(Exception, match="[Ii]nvalid cron"):
        AutomationUpdate(schedule="not_a_cron")


def test_automation_update_config_rejects_dunder_keys() -> None:
    """AutomationUpdate config validator rejects dunder keys."""
    from app.schemas.automation import AutomationUpdate

    with pytest.raises(Exception, match="__"):
        AutomationUpdate(config={"__proto__": "bad"})


def test_automation_update_config_rejects_blocked_keys() -> None:
    """AutomationUpdate config validator rejects blocked injection keys."""
    from app.schemas.automation import AutomationUpdate

    with pytest.raises(Exception, match="[Nn]ot allowed"):
        AutomationUpdate(config={"ignore_previous_instructions": "do evil"})
