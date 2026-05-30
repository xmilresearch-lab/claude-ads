import re

_SCRIPT_RE = re.compile(r"<script|javascript:", re.IGNORECASE)
_SQL_RE = re.compile(
    r"\b(DROP|INSERT|DELETE|TRUNCATE|ALTER|CREATE|EXEC|UNION)\b|--|;--",
    re.IGNORECASE,
)


def reject_script_tags(value: str) -> str:
    """Raises ValueError if value contains <script> or javascript: patterns."""
    if _SCRIPT_RE.search(value):
        raise ValueError("HTML script injection patterns are not allowed")
    return value


def reject_sql_injection(value: str) -> str:
    """Raises ValueError if value contains common SQL injection patterns."""
    if _SQL_RE.search(value):
        raise ValueError("SQL injection patterns are not allowed")
    return value
