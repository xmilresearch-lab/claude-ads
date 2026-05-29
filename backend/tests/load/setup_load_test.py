"""
Load test fixture setup.

Creates a test user + 5 automations and stores credentials in .env.loadtest.
Run once before each load test session (fixtures are reused across runs).

Usage:
    python tests/load/setup_load_test.py [--base-url http://localhost:8000]
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from pathlib import Path

import httpx

ENV_FILE = Path(".env.loadtest")
AUTOMATION_TYPES = [
    "social_post",
    "email_campaign",
    "crm_update",
    "content_queue",
    "social_post",
]


def register_user(client: httpx.Client, base_url: str) -> dict[str, str]:
    tag = uuid.uuid4().hex[:8]
    payload = {
        "email": f"loadtest_{tag}@example.invalid",
        "password": f"LoadTest!{tag}",
        "workspace_name": f"loadtest-{tag}",
    }
    resp = client.post(f"{base_url}/api/v1/auth/register", json=payload)
    if resp.status_code not in (200, 201):
        print(f"ERROR: Registration failed {resp.status_code}: {resp.text}")
        sys.exit(1)
    data = resp.json()
    token: str = data.get("data", {}).get("access_token", "")
    if not token:
        print(f"ERROR: No access_token in response: {data}")
        sys.exit(1)
    print(f"  Registered user {payload['email']}")
    return {"token": token, "email": payload["email"]}


def create_automations(
    client: httpx.Client,
    base_url: str,
    token: str,
) -> list[str]:
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    ids: list[str] = []
    for i, atype in enumerate(AUTOMATION_TYPES):
        payload = {
            "name": f"Load Test Automation {i + 1}",
            "type": atype,
            "config": {"platforms": ["linkedin"], "topic": "load test"},
            "trigger": "manual",
            "active": True,
        }
        resp = client.post(
            f"{base_url}/api/v1/automations/",
            json=payload,
            headers=headers,
        )
        if resp.status_code not in (200, 201):
            print(
                f"  WARNING: Failed to create automation {i + 1}: "
                f"{resp.status_code}: {resp.text}"
            )
            continue
        data = resp.json()
        auto_id: str = (
            data.get("data", {}).get("id")
            or data.get("id")
            or ""
        )
        if auto_id:
            ids.append(str(auto_id))
            print(f"  Created automation '{payload['name']}' ({atype}) → {auto_id}")
        else:
            print(f"  WARNING: No id in response: {data}")

    if not ids:
        print("ERROR: No automations were created — aborting")
        sys.exit(1)

    return ids


def write_env_file(token: str, automation_ids: list[str]) -> None:
    content = (
        f"LOAD_TEST_TOKEN={token}\n"
        f"LOAD_TEST_AUTOMATION_IDS={','.join(automation_ids)}\n"
    )
    ENV_FILE.write_text(content)
    print(f"\n  Written to {ENV_FILE}")
    print(f"  Token:          {token[:20]}...")
    print(f"  Automation IDs: {automation_ids}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Set up load test fixtures")
    parser.add_argument(
        "--base-url",
        default="http://localhost:8000",
        help="API base URL",
    )
    args = parser.parse_args()
    base_url: str = args.base_url.rstrip("/")

    print(f"Setting up load test fixtures against {base_url} ...")

    with httpx.Client(timeout=30.0) as client:
        user = register_user(client, base_url)
        automation_ids = create_automations(client, base_url, user["token"])

    write_env_file(user["token"], automation_ids)
    print("\nSetup complete. Run the load test with:")
    print("  bash tests/load/run_load_test.sh")


if __name__ == "__main__":
    main()
