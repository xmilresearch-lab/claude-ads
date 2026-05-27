import re
from dataclasses import dataclass, field
from enum import Enum


class DLPCategory(str, Enum):
    EMAIL = "email"
    PHONE_US = "phone_us"
    PHONE_INTL = "phone_intl"
    SSN = "ssn"
    CREDIT_CARD = "credit_card"
    IP_ADDRESS = "ip_address"
    API_KEY = "api_key"


@dataclass
class DLPResult:
    has_violations: bool
    violations: list[DLPCategory]
    redacted_content: str


# Each entry: (category, compiled pattern, placeholder, masker_fn | None)
# masker_fn receives the match object and returns the masked string.
# If None, the placeholder string is used as-is.


def _mask_email(m: re.Match[str]) -> str:
    local, domain = m.group(0).split("@", 1)
    return f"{local[0]}***@{domain}"


def _mask_card(m: re.Match[str]) -> str:
    digits = re.sub(r"[\s\-]", "", m.group(0))
    return f"****-****-****-{digits[-4:]}"


_RULES: list[tuple[DLPCategory, re.Pattern[str], str]] = [
    (
        DLPCategory.EMAIL,
        re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"),
        "[EMAIL]",
    ),
    (
        DLPCategory.SSN,
        re.compile(r"\b\d{3}[- ]\d{2}[- ]\d{4}\b"),
        "[SSN]",
    ),
    (
        DLPCategory.CREDIT_CARD,
        re.compile(
            r"(?<!\+)"
            r"\b(?:4[0-9]{12}(?:[0-9]{3})?"  # Visa
            r"|5[1-5][0-9]{14}"               # MC
            r"|3[47][0-9]{13}"                # Amex
            r"|6(?:011|5[0-9]{2})[0-9]{12}"  # Discover
            r"|(?:\d{4}[- ]){3}\d{4})\b"     # generic formatted
        ),
        "[CREDIT_CARD]",
    ),
    (
        DLPCategory.PHONE_US,
        re.compile(
            r"\b(?:\+1[\s.\-]?)?"
            r"(?:\(?\d{3}\)?[\s.\-]?)"
            r"\d{3}[\s.\-]?\d{4}\b"
        ),
        "[PHONE]",
    ),
    (
        DLPCategory.PHONE_INTL,
        re.compile(r"\+(?!1\b)[1-9]\d{6,14}\b"),
        "[PHONE]",
    ),
    (
        DLPCategory.IP_ADDRESS,
        re.compile(
            r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}"
            r"(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b"
        ),
        "[IP_ADDRESS]",
    ),
    (
        DLPCategory.API_KEY,
        re.compile(
            r"(?:"
            r"sk-[A-Za-z0-9]{20,}"           # OpenAI / Anthropic style
            r"|[A-Za-z0-9_\-]{32,45}"        # generic long token
            r")",
        ),
        "[API_KEY]",
    ),
]

# Custom maskers keyed by category (override plain placeholder substitution).
_MASKERS: dict[DLPCategory, callable] = {  # type: ignore[type-arg]
    DLPCategory.EMAIL: _mask_email,
    DLPCategory.CREDIT_CARD: _mask_card,
}


def scan_output(content: str) -> DLPResult:
    """Scan Claude-generated output for PII / sensitive data patterns."""
    violations: list[DLPCategory] = []
    redacted = content

    for category, pattern, placeholder in _RULES:
        if pattern.search(redacted):
            if category not in violations:
                violations.append(category)
            masker = _MASKERS.get(category)
            if masker:
                redacted = pattern.sub(masker, redacted)
            else:
                redacted = pattern.sub(placeholder, redacted)

    return DLPResult(
        has_violations=bool(violations),
        violations=violations,
        redacted_content=redacted,
    )


def redact_output(content: str) -> str:
    """Convenience wrapper — returns only the redacted string."""
    return scan_output(content).redacted_content
