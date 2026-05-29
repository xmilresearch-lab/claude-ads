"""
Startup validation — called from main.py lifespan before accepting traffic.

Two phases:
  1. validate_startup_config  — check env vars are present and well-formed
  2. validate_connectivity    — verify postgres/redis/mcp are actually reachable
"""

from __future__ import annotations

import asyncio
import logging
import os

import httpx
import redis.asyncio as aioredis
from sqlalchemy import text

logger = logging.getLogger(__name__)

# ── Required environment variables ────────────────────────────────────────────

REQUIRED_VARS: dict[str, str] = {
    "DATABASE_URL":      "PostgreSQL connection string",
    "REDIS_URL":         "Redis connection string",
    "ANTHROPIC_API_KEY": "Claude API key (must start with sk-ant-)",
    "SECRET_KEY":        "JWT signing key (min 32 characters)",
    "ENCRYPTION_KEY":    "AES-256-GCM encryption key (min 32 characters)",
    "MCP_AUTH_TOKEN":    "Shared MCP server bearer token",
    "SOCIAL_MCP_URL":    "Social MCP server URL",
    "EMAIL_MCP_URL":     "Email MCP server URL",
    "CRM_MCP_URL":       "CRM MCP server URL",
    "ALLOWED_ORIGINS":   "Comma-separated CORS allowed origins",
    "WEBHOOK_SECRET":    "Webhook HMAC-SHA256 signing secret",
}


# ── Phase 1: configuration validation ─────────────────────────────────────────


async def validate_startup_config() -> None:
    """
    Validate all required environment variables on startup.

    Checks:
    - All REQUIRED_VARS present and non-empty
    - ANTHROPIC_API_KEY starts with "sk-ant-"
    - SECRET_KEY length >= 32 characters
    - ENCRYPTION_KEY length >= 32 characters
    - DATABASE_URL starts with "postgresql"
    - REDIS_URL starts with "redis://"
    - SOCIAL_MCP_URL, EMAIL_MCP_URL, CRM_MCP_URL are valid HTTP/HTTPS URLs
    - ALLOWED_ORIGINS contains at least one non-empty origin

    Raises:
        RuntimeError: descriptive message listing every invalid/missing variable
    """
    errors: list[str] = []

    for var, description in REQUIRED_VARS.items():
        val = os.environ.get(var, "").strip()

        if not val:
            errors.append(f"  {var}: missing — {description}")
            continue

        # Per-variable format checks
        if var == "ANTHROPIC_API_KEY":
            if not val.startswith("sk-ant-"):
                errors.append(f"  {var}: must start with 'sk-ant-' (got '{val[:10]}...')")

        elif var == "SECRET_KEY":
            if len(val) < 32:
                errors.append(
                    f"  {var}: must be at least 32 characters (got {len(val)})"
                )

        elif var == "ENCRYPTION_KEY":
            if len(val) < 32:
                errors.append(
                    f"  {var}: must be at least 32 characters (got {len(val)})"
                )

        elif var == "DATABASE_URL":
            if not val.startswith("postgresql"):
                errors.append(
                    f"  {var}: must start with 'postgresql' (got '{val[:20]}')"
                )

        elif var == "REDIS_URL":
            if not val.startswith("redis://"):
                errors.append(
                    f"  {var}: must start with 'redis://' (got '{val[:20]}')"
                )

        elif var in ("SOCIAL_MCP_URL", "EMAIL_MCP_URL", "CRM_MCP_URL"):
            if not (val.startswith("http://") or val.startswith("https://")):
                errors.append(f"  {var}: must be a valid HTTP/HTTPS URL (got '{val}')")

        elif var == "ALLOWED_ORIGINS":
            origins = [o.strip() for o in val.split(",") if o.strip()]
            if not origins:
                errors.append(f"  {var}: must contain at least one non-empty origin")

    if errors:
        msg = "Startup configuration invalid — fix the following:\n" + "\n".join(errors)
        logger.error(msg)
        raise RuntimeError(msg)

    logger.info("✓ Configuration validated — %d variables checked", len(REQUIRED_VARS))


# ── Phase 2: connectivity checks ──────────────────────────────────────────────


async def validate_connectivity() -> None:
    """
    Verify that critical dependencies are actually reachable.

    PostgreSQL and Redis failures are fatal (raise RuntimeError).
    MCP server failures are non-fatal (log WARNING only — they may start later).

    Raises:
        RuntimeError: if PostgreSQL or Redis is unreachable
    """
    await _check_postgres_connectivity()
    await _check_redis_connectivity()
    await _check_mcp_connectivity()
    logger.info("✓ All dependencies reachable")


async def _check_postgres_connectivity() -> None:
    from app.core.database import engine  # lazy — avoids module-level settings init

    try:
        async def _q() -> None:
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))

        await asyncio.wait_for(_q(), timeout=5.0)
        logger.info("  postgres: ok")
    except Exception as exc:
        raise RuntimeError(f"PostgreSQL unreachable on startup: {exc}") from exc


async def _check_redis_connectivity() -> None:
    redis_url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    try:
        async def _p() -> None:
            client: aioredis.Redis = aioredis.from_url(redis_url, decode_responses=True)
            try:
                await client.ping()
            finally:
                await client.aclose()

        await asyncio.wait_for(_p(), timeout=5.0)
        logger.info("  redis: ok")
    except Exception as exc:
        raise RuntimeError(f"Redis unreachable on startup: {exc}") from exc


async def _check_mcp_connectivity() -> None:
    mcp_token = os.environ.get("MCP_AUTH_TOKEN", "")
    mcp_servers = {
        "social_mcp": os.environ.get("SOCIAL_MCP_URL", "http://localhost:3001"),
        "email_mcp":  os.environ.get("EMAIL_MCP_URL",  "http://localhost:3002"),
        "crm_mcp":    os.environ.get("CRM_MCP_URL",    "http://localhost:3003"),
    }
    for name, base_url in mcp_servers.items():
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                await client.get(
                    f"{base_url}/health",
                    headers={"Authorization": f"Bearer {mcp_token}"},
                )
            logger.info("  %s: ok", name)
        except Exception as exc:
            logger.warning(
                "  %s: unreachable (%s) — will retry when needed",
                name,
                str(exc)[:80],
            )


# ── Auto-migration ─────────────────────────────────────────────────────────────


async def run_pending_migrations() -> None:
    """Run `alembic upgrade head` in a thread pool on startup."""
    from alembic import command
    from alembic.config import Config

    def _upgrade() -> None:
        alembic_cfg = Config("alembic.ini")
        command.upgrade(alembic_cfg, "head")

    await asyncio.to_thread(_upgrade)
    logger.info("✓ Database migrations up to date")
