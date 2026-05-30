#!/usr/bin/env python3
"""
seed_demo.py — Seed a fresh AI Automation Platform deployment with demo data.

Creates a demo admin user, configures brand voice, and creates sample automations
so the client sees a populated dashboard on first login instead of empty states.

Usage:
    python scripts/seed_demo.py
    python scripts/seed_demo.py --base-url https://your-api.railway.app
    python scripts/seed_demo.py --base-url http://localhost:8000

The script is idempotent: running it twice will not create duplicate users or
automations. It checks whether the demo user already exists before creating anything.

Exit codes:
    0 — all steps completed successfully
    1 — a fatal error occurred (details printed to stderr)
"""

import argparse
import json
import sys
import time
from typing import Any

import httpx

# ── Demo data constants ────────────────────────────────────────────────────────

DEMO_EMAIL = "demo@xmilresearch.com"
DEMO_PASSWORD = "Demo1234!"
DEMO_WORKSPACE = "XMiL Research Demo"

DEMO_BRAND_VOICE = {
    "tone": "Professional and data-driven",
    "style": "Concise, insight-led, with clear calls to action",
    "avoid": ["excessive jargon", "clickbait language"],
    "examples": ["Our latest research reveals...", "Key finding:"],
}

DEMO_AUTOMATIONS = [
    {
        "name": "Daily LinkedIn Thought Leadership",
        "type": "social_post",
        "config": {
            "platforms": ["linkedin"],
            "topic": "AI research trends and findings",
            "tone": "professional",
            "length": "medium",
        },
        "schedule": "0 9 * * 1-5",
        "active": True,
    },
    {
        "name": "Weekly Twitter/X Thread",
        "type": "social_post",
        "config": {
            "platforms": ["twitter"],
            "topic": "Research insights and data points",
            "format": "thread",
            "thread_length": 5,
        },
        "schedule": "0 10 * * 1",
        "active": True,
    },
    {
        "name": "Monthly Newsletter Draft",
        "type": "email",
        "config": {
            "platforms": ["gmail"],
            "topic": "Monthly research highlights and upcoming events",
            "format": "newsletter",
            "length": "long",
        },
        "schedule": "0 9 1 * *",
        "active": False,
    },
]

# ── Helpers ────────────────────────────────────────────────────────────────────


def _print(msg: str) -> None:
    print(msg, flush=True)


def _err(msg: str) -> None:
    print(f"❌  ERROR: {msg}", file=sys.stderr, flush=True)


def _die(msg: str) -> None:
    _err(msg)
    sys.exit(1)


def _unwrap(resp: httpx.Response, label: str) -> dict[str, Any]:
    """Raise with a clear message if the response is not 2xx."""
    if resp.status_code >= 400:
        try:
            detail = resp.json()
        except Exception:
            detail = resp.text
        _die(f"{label} failed (HTTP {resp.status_code}): {json.dumps(detail, indent=2)}")
    return resp.json()  # type: ignore[return-value]


# ── Steps ──────────────────────────────────────────────────────────────────────


def step_register(client: httpx.Client, base_url: str) -> str:
    """Register the demo user. Returns the access token."""
    _print("  ⏳  Registering demo user …")
    resp = client.post(
        f"{base_url}/api/v1/auth/register",
        json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD,
            "workspace_name": DEMO_WORKSPACE,
        },
    )
    if resp.status_code == 409:
        # User already exists — try logging in instead
        _print("  ℹ️   Demo user already exists, logging in …")
        login_resp = client.post(
            f"{base_url}/api/v1/auth/login",
            json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
        )
        body = _unwrap(login_resp, "Login")
        return body["data"]["access_token"]  # type: ignore[return-value]

    body = _unwrap(resp, "Register")
    return body["data"]["access_token"]  # type: ignore[return-value]


def step_set_brand_voice(client: httpx.Client, base_url: str, token: str) -> None:
    """Configure brand voice for the demo workspace."""
    _print("  ⏳  Setting brand voice …")
    resp = client.put(
        f"{base_url}/api/v1/workspaces/me/brand-voice",
        json=DEMO_BRAND_VOICE,
        headers={"Authorization": f"Bearer {token}"},
    )
    _unwrap(resp, "Set brand voice")


def step_create_automations(
    client: httpx.Client, base_url: str, token: str
) -> list[str]:
    """Create the 3 demo automations. Returns list of created automation IDs."""
    _print("  ⏳  Creating automations …")

    # Check existing automations first (idempotency)
    list_resp = client.get(
        f"{base_url}/api/v1/automations/",
        headers={"Authorization": f"Bearer {token}"},
    )
    existing_body = _unwrap(list_resp, "List automations")
    existing_names = {a["name"] for a in existing_body.get("data", [])}

    created_ids: list[str] = []
    for auto in DEMO_AUTOMATIONS:
        if auto["name"] in existing_names:
            _print(f"    ℹ️   '{auto['name']}' already exists — skipping")
            # Find and return the existing id
            for a in existing_body.get("data", []):
                if a["name"] == auto["name"]:
                    created_ids.append(a["id"])
            continue

        resp = client.post(
            f"{base_url}/api/v1/automations/",
            json=auto,
            headers={"Authorization": f"Bearer {token}"},
        )
        body = _unwrap(resp, f"Create automation '{auto['name']}'")
        auto_id = body["data"]["id"]
        created_ids.append(auto_id)
        status = "active" if auto["active"] else "draft"
        _print(f"    ✅  '{auto['name']}' created ({status})")

    return created_ids


def step_seed_content_queue(
    client: httpx.Client,
    base_url: str,
    token: str,
    automation_id: str,
) -> None:
    """Trigger automation 1 to seed the content queue. Warns if AI is not configured."""
    _print("  ⏳  Triggering automation run to seed content queue …")

    trigger_resp = client.post(
        f"{base_url}/api/v1/automations/{automation_id}/run",
        json={"payload": {"trigger": "seed"}},
        headers={"Authorization": f"Bearer {token}"},
    )

    if trigger_resp.status_code >= 400:
        _print("  ⚠️   Content queue seeding skipped — could not trigger run")
        _print(f"      (HTTP {trigger_resp.status_code}: AI may not be configured)")
        return

    run_body = trigger_resp.json()
    run_id = run_body.get("data", {}).get("run_id") or run_body.get("data", {}).get("id")
    if not run_id:
        _print("  ⚠️   Run triggered but could not get run_id for status polling")
        return

    # Poll for completion (up to 10 seconds)
    _print(f"    ⏳  Polling run {run_id} for completion …")
    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        runs_resp = client.get(
            f"{base_url}/api/v1/automations/{automation_id}/runs",
            headers={"Authorization": f"Bearer {token}"},
        )
        if runs_resp.status_code == 200:
            runs = runs_resp.json().get("data", [])
            for run in runs:
                if str(run.get("id")) == str(run_id):
                    run_status = run.get("status", "")
                    if run_status == "completed":
                        _print("    ✅  Run completed — content queue seeded")
                        return
                    if run_status == "failed":
                        _print("    ⚠️   Run failed — AI may not be configured (ANTHROPIC_API_KEY)")
                        return
        time.sleep(1)

    _print("  ⚠️   Run timed out after 10 s — content queue may not be seeded")


def step_print_summary(base_url: str, automation_count: int, ai_seeded: bool) -> None:
    seeded_msg = "✅  Content queue seeded" if ai_seeded else "⚠️   Skipped — AI not configured"
    _print("")
    _print("━" * 60)
    _print("✅  Demo workspace created: " + DEMO_WORKSPACE)
    _print("✅  Brand voice configured")
    _print(f"✅  {automation_count} automations created (2 active, 1 draft)")
    _print(seeded_msg)
    _print("")
    _print("🔑  Demo login:")
    _print(f"    Email:    {DEMO_EMAIL}")
    _print(f"    Password: {DEMO_PASSWORD}")
    _print(f"    URL:      {base_url}")
    _print("")
    _print("⚠️   SECURITY: Change the demo password immediately after")
    _print("    first login at /settings/security")
    _print("━" * 60)


# ── Main ──────────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed the AI Automation Platform with demo data."
    )
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="Backend API base URL (default: http://localhost:8000)",
    )
    args = parser.parse_args()
    base_url = args.base_url.rstrip("/")

    _print(f"🌱  Seeding demo data → {base_url}")
    _print("")

    with httpx.Client(timeout=30.0) as client:
        # Step 1 — Register / login
        _print("📋  Step 1/4 — Register demo user")
        token = step_register(client, base_url)
        _print("  ✅  Authenticated")

        # Step 2 — Brand voice
        _print("📋  Step 2/4 — Configure brand voice")
        step_set_brand_voice(client, base_url, token)
        _print("  ✅  Brand voice set")

        # Step 3 — Automations
        _print("📋  Step 3/4 — Create automations")
        automation_ids = step_create_automations(client, base_url, token)
        _print(f"  ✅  {len(automation_ids)} automation(s) ready")

        # Step 4 — Content queue (best-effort, non-fatal)
        _print("📋  Step 4/4 — Seed content queue")
        ai_seeded = False
        if automation_ids:
            try:
                step_seed_content_queue(client, base_url, token, automation_ids[0])
                ai_seeded = True
            except Exception as exc:
                _print(f"  ⚠️   Content queue seeding failed: {exc}")

        step_print_summary(base_url, len(automation_ids), ai_seeded)


if __name__ == "__main__":
    main()
