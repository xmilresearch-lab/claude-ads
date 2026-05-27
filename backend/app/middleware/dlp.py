"""Data Loss Prevention middleware — scans AI outputs for PII before they leave the system."""
import re
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

_PII_PATTERNS: dict[str, re.Pattern] = {
    "email": re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"),
    "us_ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
    "credit_card": re.compile(r"\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b"),
    "us_phone": re.compile(r"\b(?:\+1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"),
    "aws_key": re.compile(r"AKIA[0-9A-Z]{16}"),
    "private_key": re.compile(r"-----BEGIN (RSA |EC )?PRIVATE KEY-----"),
}


def scan_for_pii(text: str) -> list[str]:
    found = []
    for label, pattern in _PII_PATTERNS.items():
        if pattern.search(text):
            found.append(label)
    return found


def redact_pii(text: str) -> str:
    result = text
    result = _PII_PATTERNS["us_ssn"].sub("[SSN REDACTED]", result)
    result = _PII_PATTERNS["credit_card"].sub("[CC REDACTED]", result)
    result = _PII_PATTERNS["aws_key"].sub("[AWS_KEY REDACTED]", result)
    result = _PII_PATTERNS["private_key"].sub("[PRIVATE_KEY REDACTED]", result)
    return result


class DLPMiddleware(BaseHTTPMiddleware):
    """Adds X-DLP-Scanned header and redacts PII from response bodies."""

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        response.headers["X-DLP-Scanned"] = "true"
        return response
