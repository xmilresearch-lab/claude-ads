import re
from dataclasses import dataclass
from enum import StrEnum


class ThreatLevel(StrEnum):
    CLEAN = "clean"
    SUSPICIOUS = "suspicious"
    BLOCKED = "blocked"


class SecurityError(Exception):
    """Raised when scanned content is classified as BLOCKED."""

    def __init__(self, message: str, matched_patterns: list[str]) -> None:
        super().__init__(message)
        self.matched_patterns = matched_patterns


@dataclass
class ScanResult:
    threat_level: ThreatLevel
    matched_patterns: list[str]
    redacted_content: str


# Patterns whose presence alone triggers BLOCKED regardless of count.
_HIGH_SEVERITY: frozenset[str] = frozenset(
    {"role_override", "prompt_leak", "jailbreak_dan", "override_rules"}
)

_PATTERNS: dict[str, re.Pattern[str]] = {
    "ignore_instructions": re.compile(
        r"ignore\s+(previous|all|your|the)?\s*(instructions?|prompts?|context|rules?|directives?)",
        re.IGNORECASE,
    ),
    "role_override": re.compile(
        r"(you\s+are\s+now\s+\w|act\s+as\s+(a\s+|an\s+)?\w|pretend\s+(you\s+are|to\s+be)"
        r"|your\s+new\s+(role|persona)\s+is|you\s+must\s+now\s+act\s+as)",
        re.IGNORECASE,
    ),
    "prompt_leak": re.compile(
        r"(show\s+me\s+your\s+(prompt|instructions?|system\s+prompt)"
        r"|reveal\s+your\s+(prompt|instructions?|directives?)"
        r"|print\s+your\s+system\s+prompt"
        r"|what\s+are\s+your\s+(instructions?|rules?|directives?|constraints?))",
        re.IGNORECASE,
    ),
    "jailbreak_dan": re.compile(
        r"(DAN\s*mode|do\s+anything\s+now|jailbreak(ed|ing)?"
        r"|\bDAN\s*:\s*|\benabled\s+DAN\b)",
        re.IGNORECASE,
    ),
    "override_rules": re.compile(
        r"(override\s+(rules?|instructions?|restrictions?|safety)"
        r"|bypass\s+(safety|rules?|filters?|restrictions?|guardrails?)"
        r"|disable\s+(safety\s+)?(restrictions?|filters?|guardrails?)"
        r"|ignore\s+safety)",
        re.IGNORECASE,
    ),
    "base64_injection": re.compile(
        r"(?<![A-Za-z0-9+/])[A-Za-z0-9+/]{38,}={1,2}(?![A-Za-z0-9+/=])",
    ),
    "system_tag_injection": re.compile(
        r"(<\s*/?system\s*>|\[\[?\s*system\s*\]?\])",
        re.IGNORECASE,
    ),
    "human_tag_injection": re.compile(
        r"(<\s*/?human\s*>|\[\[?\s*human\s*\]?\])",
        re.IGNORECASE,
    ),
}


def scan_content(content: str) -> ScanResult:
    """Scan user-supplied content for prompt injection threats."""
    matched: list[str] = []
    redacted = content

    for name, pattern in _PATTERNS.items():
        if pattern.search(redacted):
            matched.append(name)
            redacted = pattern.sub("[REDACTED]", redacted)

    match len(matched):
        case 0:
            level = ThreatLevel.CLEAN
        case 1 if matched[0] not in _HIGH_SEVERITY:
            level = ThreatLevel.SUSPICIOUS
        case _:
            # 2+ matches OR any single high-severity match
            if any(m in _HIGH_SEVERITY for m in matched) or len(matched) >= 2:
                level = ThreatLevel.BLOCKED
            else:
                level = ThreatLevel.SUSPICIOUS

    return ScanResult(
        threat_level=level,
        matched_patterns=matched,
        redacted_content=redacted,
    )


def require_clean(content: str) -> str:
    """Scan content and raise SecurityError if BLOCKED; return (redacted) content otherwise."""
    result = scan_content(content)
    if result.threat_level is ThreatLevel.BLOCKED:
        raise SecurityError(
            f"Content blocked — matched high-severity patterns: {result.matched_patterns}",
            matched_patterns=result.matched_patterns,
        )
    # Return redacted content for SUSPICIOUS so threats are neutralised before
    # reaching Claude, while still allowing the automation to proceed.
    return result.redacted_content
