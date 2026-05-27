import pytest

from app.services.brand_voice import DEFAULT_BRAND_VOICE, build_brand_voice_prompt


def test_build_brand_voice_prompt_contains_tone():
    prompt = build_brand_voice_prompt(DEFAULT_BRAND_VOICE)
    assert "professional but approachable" in prompt


def test_build_brand_voice_prompt_contains_industry():
    voice = {**DEFAULT_BRAND_VOICE, "industry": "FinTech", "target_audience": "CFOs"}
    prompt = build_brand_voice_prompt(voice)
    assert "FinTech" in prompt
    assert "CFOs" in prompt


def test_build_brand_voice_prompt_avoid_list():
    voice = {**DEFAULT_BRAND_VOICE, "avoid": ["jargon", "buzzwords", "passive voice"]}
    prompt = build_brand_voice_prompt(voice)
    assert "jargon" in prompt
    assert "buzzwords" in prompt


def test_build_brand_voice_prompt_examples():
    voice = {**DEFAULT_BRAND_VOICE, "examples": ["We help SMBs grow.", "Simple. Fast. Reliable."]}
    prompt = build_brand_voice_prompt(voice)
    assert "We help SMBs grow." in prompt
