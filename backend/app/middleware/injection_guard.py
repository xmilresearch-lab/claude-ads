"""OWASP LLM Top-10 prompt injection guard middleware."""
import json
import re
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

_INJECTION_PATTERNS: list[re.Pattern] = [
    re.compile(r"ignore\s+(previous|all|above)\s+instructions", re.IGNORECASE),
    re.compile(r"you\s+are\s+now", re.IGNORECASE),
    re.compile(r"disregard\s+(your|all|the)", re.IGNORECASE),
    re.compile(r"system\s+prompt", re.IGNORECASE),
    re.compile(r"do\s+anything\s+now", re.IGNORECASE),
    re.compile(r"jailbreak", re.IGNORECASE),
    re.compile(r"new\s+persona", re.IGNORECASE),
    re.compile(r"pretend\s+(you\s+are|to\s+be)", re.IGNORECASE),
    re.compile(r"act\s+as\s+if\s+you\s+have\s+no", re.IGNORECASE),
    re.compile(r"reveal\s+(your\s+)?(system\s+)?prompt", re.IGNORECASE),
    re.compile(r"<\s*script\s*>", re.IGNORECASE),
    re.compile(r"eval\s*\(", re.IGNORECASE),
    re.compile(r"__import__", re.IGNORECASE),
    re.compile(r"os\.system\s*\(", re.IGNORECASE),
    re.compile(r"subprocess\.(run|Popen|call)", re.IGNORECASE),
]

_SCAN_FIELDS = {"content", "text", "body", "message", "trigger_payload", "subject", "notes"}


def _scan_value(value: str) -> str | None:
    for pattern in _INJECTION_PATTERNS:
        m = pattern.search(value)
        if m:
            return m.group(0)
    return None


def _scan_dict(data: dict | list, depth: int = 0) -> str | None:
    if depth > 5:
        return None
    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, str):
                if k.lower() in _SCAN_FIELDS or depth > 0:
                    hit = _scan_value(v)
                    if hit:
                        return hit
            elif isinstance(v, (dict, list)):
                hit = _scan_dict(v, depth + 1)
                if hit:
                    return hit
    elif isinstance(data, list):
        for item in data:
            if isinstance(item, str):
                hit = _scan_value(item)
                if hit:
                    return hit
            elif isinstance(item, (dict, list)):
                hit = _scan_dict(item, depth + 1)
                if hit:
                    return hit
    return None


class InjectionGuardMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if request.method in {"POST", "PUT", "PATCH"} and "application/json" in request.headers.get(
            "content-type", ""
        ):
            try:
                body_bytes = await request.body()
                data = json.loads(body_bytes)
                hit = _scan_dict(data)
                if hit:
                    return JSONResponse(
                        status_code=400,
                        content={
                            "detail": "Request blocked: potential prompt injection detected",
                            "pattern": hit,
                        },
                    )
                # Re-attach body for downstream handlers
                async def receive():
                    return {"type": "http.request", "body": body_bytes}

                request = Request(request.scope, receive)
            except (json.JSONDecodeError, Exception):
                pass

        return await call_next(request)
