from typing import Any

_ROLES: dict[str, str] = {
    "social_post": (
        "You are an expert social media manager responsible for crafting "
        "high-engagement posts that authentically represent the brand across "
        "Twitter/X, LinkedIn, and Instagram."
    ),
    "email_campaign": (
        "You are an expert email marketing specialist who writes compelling, "
        "personalised campaigns that drive opens, clicks, and conversions "
        "while maintaining deliverability best practices."
    ),
    "support_reply": (
        "You are a professional customer support specialist who resolves "
        "customer issues with empathy, clarity, and efficiency, escalating "
        "only when genuinely necessary."
    ),
    "crm_update": (
        "You are a precise CRM data analyst who extracts structured "
        "information from unstructured conversations and updates records "
        "accurately without hallucinating field values."
    ),
    "content_repurpose": (
        "You are an expert content strategist who adapts existing content "
        "into fresh, platform-optimised formats without losing the core "
        "message or brand voice."
    ),
}

_OUTPUT_FORMATS: dict[str, str] = {
    "social_post": (
        'Return valid JSON: {"platform": "<twitter|linkedin|instagram>", '
        '"text": "<post body>", "hashtags": ["<tag>", ...]}'
    ),
    "email_campaign": (
        'Return valid JSON: {"subject": "<subject line>", '
        '"body_html": "<HTML body>", "preview_text": "<preview snippet>"}'
    ),
    "support_reply": (
        'Return valid JSON: {"reply": "<customer-facing reply>", '
        '"internal_note": "<optional agent note or empty string>", '
        '"suggested_status": "<open|pending|solved>"}'
    ),
    "crm_update": (
        'Return valid JSON: {"fields": {"<field_name>": "<value>"}, '
        '"summary": "<one-line description of changes made>"}'
    ),
    "content_repurpose": (
        'Return valid JSON: {"posts": [{"platform": "<platform>", '
        '"text": "<body>", "hashtags": ["<tag>", ...]}]}'
    ),
}

_HARD_RULES: list[str] = [
    "Never fabricate facts, statistics, or quotes.",
    "Never generate content that is offensive, discriminatory, or legally risky.",
    "Always honour the brand voice constraints — especially the 'avoid' list.",
    "Output must be valid JSON matching the specified format exactly.",
    "Do not include explanatory prose outside the JSON structure.",
]

_DEFAULT_BRAND_VOICE = (
    "Tone: Professional, clear, and approachable.\n"
    "Avoid: Jargon, slang, overly casual language.\n"
    "Target audience: General business audience."
)


def build_brand_voice_section(brand_voice: dict[str, Any] | None) -> str:
    """Build the BRAND VOICE block for a system prompt."""
    if not brand_voice:
        return f"## BRAND VOICE\n{_DEFAULT_BRAND_VOICE}"

    lines: list[str] = ["## BRAND VOICE"]
    if tone := brand_voice.get("tone"):
        lines.append(f"Tone: {tone}")
    if industry := brand_voice.get("industry"):
        lines.append(f"Industry: {industry}")
    if audience := brand_voice.get("target_audience"):
        lines.append(f"Target audience: {audience}")
    if avoid := brand_voice.get("avoid"):
        avoid_str = ", ".join(avoid) if isinstance(avoid, list) else str(avoid)
        lines.append(f"Avoid: {avoid_str}")
    if examples := brand_voice.get("examples"):
        lines.append("Voice examples:")
        for ex in list(examples)[:3]:  # cap at 3 to keep prompt lean
            lines.append(f"  - {ex}")
    return "\n".join(lines)


def build_system_prompt(
    automation_type: str,
    brand_voice: dict[str, Any] | None,
    workspace_name: str,
    extra_rules: list[str] | None = None,
) -> str:
    """Assemble the full Claude system prompt for an automation run."""
    role = _ROLES.get(automation_type, _ROLES["content_repurpose"])
    output_format = _OUTPUT_FORMATS.get(automation_type, "Return valid JSON.")

    rules = _HARD_RULES.copy()
    if extra_rules:
        rules.extend(extra_rules)
    rules_block = "\n".join(f"{i + 1}. {r}" for i, r in enumerate(rules))

    sections = [
        f"## ROLE\n{role}",
        build_brand_voice_section(brand_voice),
        (
            f"## WORKSPACE CONTEXT\n"
            f"Workspace: {workspace_name}\n"
            f"Automation type: {automation_type}"
        ),
        f"## HARD RULES\n{rules_block}",
        f"## OUTPUT FORMAT\n{output_format}",
    ]
    return "\n\n".join(sections)
