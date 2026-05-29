import pytest
from app.services.prompt_builder import build_brand_voice_section, build_system_prompt

_FULL_BRAND_VOICE = {
    "tone": "Bold and witty",
    "industry": "SaaS",
    "target_audience": "Startup founders",
    "avoid": ["jargon", "passive voice", "corporate speak"],
    "examples": ["We move fast.", "No fluff, just results.", "Built for builders."],
}

_REQUIRED_SECTIONS = [
    "## ROLE",
    "## BRAND VOICE",
    "## WORKSPACE CONTEXT",
    "## HARD RULES",
    "## OUTPUT FORMAT",
]


# ── build_brand_voice_section ──────────────────────────────────────────────


def test_brand_voice_full_all_fields_present() -> None:
    section = build_brand_voice_section(_FULL_BRAND_VOICE)
    assert "Bold and witty" in section
    assert "SaaS" in section
    assert "Startup founders" in section
    assert "jargon" in section
    assert "passive voice" in section
    assert "We move fast." in section


def test_brand_voice_full_caps_examples_at_3() -> None:
    bv = {**_FULL_BRAND_VOICE, "examples": ["ex1", "ex2", "ex3", "ex4", "ex5"]}
    section = build_brand_voice_section(bv)
    assert "ex4" not in section
    assert "ex5" not in section


def test_brand_voice_none_returns_defaults() -> None:
    section = build_brand_voice_section(None)
    assert "## BRAND VOICE" in section
    assert "Professional" in section


def test_brand_voice_empty_dict_returns_defaults() -> None:
    section = build_brand_voice_section({})
    assert "## BRAND VOICE" in section
    assert "Professional" in section


def test_brand_voice_avoid_as_string() -> None:
    section = build_brand_voice_section({"avoid": "slang"})
    assert "slang" in section


# ── build_system_prompt ────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "automation_type",
    ["social_post", "email_campaign", "support_reply", "crm_update"],
)
def test_all_sections_present_for_each_type(automation_type: str) -> None:
    prompt = build_system_prompt(automation_type, None, "Acme Corp")
    for section in _REQUIRED_SECTIONS:
        assert section in prompt, f"Missing {section!r} for type {automation_type!r}"


@pytest.mark.parametrize(
    "automation_type",
    ["social_post", "email_campaign", "support_reply", "crm_update"],
)
def test_automation_type_in_workspace_context(automation_type: str) -> None:
    prompt = build_system_prompt(automation_type, None, "Acme Corp")
    assert automation_type in prompt


def test_workspace_name_in_prompt() -> None:
    prompt = build_system_prompt("social_post", None, "Globex Industries")
    assert "Globex Industries" in prompt


def test_full_brand_voice_injected_into_prompt() -> None:
    prompt = build_system_prompt("social_post", _FULL_BRAND_VOICE, "Acme")
    assert "Bold and witty" in prompt
    assert "Startup founders" in prompt
    assert "jargon" in prompt


def test_none_brand_voice_uses_defaults() -> None:
    prompt = build_system_prompt("email_campaign", None, "Acme")
    assert "Professional" in prompt


def test_extra_rules_appended() -> None:
    extra = ["Always sign off with 'Best, Acme'", "Never mention competitors"]
    prompt = build_system_prompt("social_post", None, "Acme", extra_rules=extra)
    assert "Always sign off" in prompt
    assert "Never mention competitors" in prompt


def test_extra_rules_come_after_hard_rules() -> None:
    extra = ["__EXTRA_RULE__"]
    prompt = build_system_prompt("social_post", None, "Acme", extra_rules=extra)
    hard_rules_pos = prompt.index("## HARD RULES")
    extra_pos = prompt.index("__EXTRA_RULE__")
    assert extra_pos > hard_rules_pos


def test_no_extra_rules_does_not_error() -> None:
    prompt = build_system_prompt("crm_update", None, "Acme", extra_rules=None)
    assert "## HARD RULES" in prompt


def test_unknown_automation_type_falls_back_gracefully() -> None:
    prompt = build_system_prompt("unknown_type", None, "Acme")
    for section in _REQUIRED_SECTIONS:
        assert section in prompt


def test_output_format_contains_json_hint() -> None:
    for atype in ["social_post", "email_campaign", "support_reply", "crm_update"]:
        prompt = build_system_prompt(atype, None, "Acme")
        assert "JSON" in prompt
