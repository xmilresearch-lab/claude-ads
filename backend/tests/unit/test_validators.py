"""Unit tests for input validation across schemas and core validators."""

import pytest
from pydantic import ValidationError


# ── app/core/validators.py ────────────────────────────────────────────────────


class TestRejectScriptTags:
    def test_clean_string_passes(self) -> None:
        from app.core.validators import reject_script_tags

        assert reject_script_tags("hello world") == "hello world"

    def test_script_tag_raises(self) -> None:
        from app.core.validators import reject_script_tags

        with pytest.raises(ValueError, match="script injection"):
            reject_script_tags("<script>alert('xss')</script>")

    def test_javascript_protocol_raises(self) -> None:
        from app.core.validators import reject_script_tags

        with pytest.raises(ValueError):
            reject_script_tags("javascript:alert(1)")

    def test_case_insensitive(self) -> None:
        from app.core.validators import reject_script_tags

        with pytest.raises(ValueError):
            reject_script_tags("<SCRIPT>evil()</SCRIPT>")


class TestRejectSqlInjection:
    def test_clean_string_passes(self) -> None:
        from app.core.validators import reject_sql_injection

        assert reject_sql_injection("automate my social posts") == "automate my social posts"

    def test_drop_table_raises(self) -> None:
        from app.core.validators import reject_sql_injection

        with pytest.raises(ValueError, match="SQL injection"):
            reject_sql_injection("DROP TABLE users")

    def test_double_dash_raises(self) -> None:
        from app.core.validators import reject_sql_injection

        with pytest.raises(ValueError):
            reject_sql_injection("'; DROP TABLE users --")

    def test_union_raises(self) -> None:
        from app.core.validators import reject_sql_injection

        with pytest.raises(ValueError):
            reject_sql_injection("UNION SELECT * FROM secrets")


# ── app/schemas/auth.py password validator ────────────────────────────────────


class TestPasswordValidator:
    def test_valid_password_passes(self) -> None:
        from app.schemas.auth import RegisterRequest

        r = RegisterRequest(email="user@example.com", password="ValidP@ss1", workspace_name="W")
        assert r.password == "ValidP@ss1"

    def test_password_too_short_fails(self) -> None:
        from app.schemas.auth import RegisterRequest

        with pytest.raises(ValidationError, match="8 characters"):
            RegisterRequest(email="a@b.com", password="Ab1!", workspace_name="W")

    def test_password_missing_uppercase_fails(self) -> None:
        from app.schemas.auth import RegisterRequest

        with pytest.raises(ValidationError, match="uppercase"):
            RegisterRequest(email="a@b.com", password="lowercase1!", workspace_name="W")

    def test_password_missing_lowercase_fails(self) -> None:
        from app.schemas.auth import RegisterRequest

        with pytest.raises(ValidationError, match="lowercase"):
            RegisterRequest(email="a@b.com", password="UPPERCASE1!", workspace_name="W")

    def test_password_missing_digit_fails(self) -> None:
        from app.schemas.auth import RegisterRequest

        with pytest.raises(ValidationError, match="digit"):
            RegisterRequest(email="a@b.com", password="NoDigits!", workspace_name="W")

    def test_password_missing_special_char_fails(self) -> None:
        from app.schemas.auth import RegisterRequest

        with pytest.raises(ValidationError, match="special"):
            RegisterRequest(email="a@b.com", password="NoSpecial1", workspace_name="W")


# ── app/schemas/automation.py validators ─────────────────────────────────────


class TestAutomationSchemaValidators:
    def test_valid_name_passes(self) -> None:
        from app.schemas.automation import AutomationCreate

        a = AutomationCreate(name="My Automation", type="social_post")
        assert a.name == "My Automation"

    def test_name_stripped(self) -> None:
        from app.schemas.automation import AutomationCreate

        a = AutomationCreate(name="  padded  ", type="social_post")
        assert a.name == "padded"

    def test_name_too_long_fails(self) -> None:
        from app.schemas.automation import AutomationCreate

        with pytest.raises(ValidationError, match="255"):
            AutomationCreate(name="x" * 256, type="social_post")

    def test_valid_cron_passes(self) -> None:
        from app.schemas.automation import AutomationCreate

        a = AutomationCreate(name="A", type="social_post", schedule="0 9 * * 1")
        assert a.schedule == "0 9 * * 1"

    def test_invalid_cron_fails(self) -> None:
        from app.schemas.automation import AutomationCreate

        with pytest.raises(ValidationError, match="cron"):
            AutomationCreate(name="A", type="social_post", schedule="not-a-cron-expr")

    def test_none_schedule_passes(self) -> None:
        from app.schemas.automation import AutomationCreate

        a = AutomationCreate(name="A", type="social_post", schedule=None)
        assert a.schedule is None

    def test_config_with_prompt_key_fails(self) -> None:
        from app.schemas.automation import AutomationCreate

        with pytest.raises(ValidationError, match="prompt"):
            AutomationCreate(name="A", type="social_post", config={"system_prompt": "evil"})

    def test_config_with_system_key_fails(self) -> None:
        from app.schemas.automation import AutomationCreate

        with pytest.raises(ValidationError, match="system"):
            AutomationCreate(name="A", type="social_post", config={"system": "override"})

    def test_config_with_instruction_key_fails(self) -> None:
        from app.schemas.automation import AutomationCreate

        with pytest.raises(ValidationError, match="instruction"):
            AutomationCreate(name="A", type="social_post", config={"user_instructions": "x"})

    def test_config_with_dunder_key_fails(self) -> None:
        from app.schemas.automation import AutomationCreate

        with pytest.raises(ValidationError, match="__"):
            AutomationCreate(name="A", type="social_post", config={"__class__": "evil"})

    def test_valid_config_passes(self) -> None:
        from app.schemas.automation import AutomationCreate

        a = AutomationCreate(
            name="A", type="social_post", config={"require_approval": True, "max_length": 280}
        )
        assert a.config["require_approval"] is True


# ── app/schemas/workspace.py BrandVoiceSchema validators ─────────────────────


class TestBrandVoiceSchemaValidators:
    def test_valid_brand_voice_passes(self) -> None:
        from app.schemas.workspace import BrandVoiceSchema

        bv = BrandVoiceSchema(
            tone="professional and friendly",
            avoid=["slang", "jargon"],
            examples=["We help you grow.", "Trusted by thousands."],
        )
        assert bv.tone == "professional and friendly"

    def test_script_tag_in_tone_fails(self) -> None:
        from app.schemas.workspace import BrandVoiceSchema

        with pytest.raises(ValidationError, match="script injection"):
            BrandVoiceSchema(tone="<script>alert('xss')</script>")

    def test_tone_too_long_fails(self) -> None:
        from app.schemas.workspace import BrandVoiceSchema

        with pytest.raises(ValidationError, match="500"):
            BrandVoiceSchema(tone="x" * 501)

    def test_avoid_too_many_items_fails(self) -> None:
        from app.schemas.workspace import BrandVoiceSchema

        with pytest.raises(ValidationError, match="50"):
            BrandVoiceSchema(avoid=[f"item{i}" for i in range(51)])

    def test_avoid_item_too_long_fails(self) -> None:
        from app.schemas.workspace import BrandVoiceSchema

        with pytest.raises(ValidationError, match="200"):
            BrandVoiceSchema(avoid=["x" * 201])

    def test_sql_injection_in_avoid_fails(self) -> None:
        from app.schemas.workspace import BrandVoiceSchema

        with pytest.raises(ValidationError, match="SQL injection"):
            BrandVoiceSchema(avoid=["DROP TABLE users"])

    def test_examples_too_many_fails(self) -> None:
        from app.schemas.workspace import BrandVoiceSchema

        with pytest.raises(ValidationError, match="20"):
            BrandVoiceSchema(examples=[f"example {i}" for i in range(21)])

    def test_example_item_too_long_fails(self) -> None:
        from app.schemas.workspace import BrandVoiceSchema

        with pytest.raises(ValidationError, match="1000"):
            BrandVoiceSchema(examples=["x" * 1001])
