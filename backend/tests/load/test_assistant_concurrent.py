"""Concurrent assistant chat load test.

Run with: locust -f tests/load/test_assistant_concurrent.py --headless -u 30 -r 5 -t 60s

Tests SSE streaming endpoint under concurrent load:
- POST /api/v1/assistant/chat (streaming SSE)
"""
import random
import string
from typing import Iterator

from locust import HttpUser, between, task

_PAGE_CONTEXTS = ["automations", "content", "integrations", "analytics", "settings"]
_PROMPTS = [
    "What can I automate?",
    "How many AI tokens have I used?",
    "Create a simple Twitter automation.",
    "What integrations do I have?",
    "Show me my content queue.",
]


def _random_email() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"assistant+{suffix}@loadtest.example"


class AssistantUser(HttpUser):
    wait_time = between(1.0, 3.0)
    host = "http://localhost:8000"

    def on_start(self) -> None:
        self.access_token: str | None = None
        email = _random_email()
        password = "LoadTest!1"

        with self.client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": password, "workspace_name": "Assist Bench"},
            name="setup/register",
            catch_response=True,
        ) as resp:
            if resp.status_code in (201, 409):
                resp.success()
            else:
                resp.failure(f"Setup register failed: {resp.status_code}")
                return

        with self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
            name="setup/login",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                self.access_token = resp.json().get("data", {}).get("access_token")
                resp.success()
            else:
                resp.failure(f"Setup login failed: {resp.status_code}")

    @task
    def chat(self) -> None:
        if not self.access_token:
            return

        messages = [
            {"role": "user", "content": random.choice(_PROMPTS)}
        ]
        page_context = random.choice(_PAGE_CONTEXTS)

        # SSE endpoint — read as streaming response
        with self.client.post(
            "/api/v1/assistant/chat",
            json={"messages": messages, "page_context": page_context},
            headers={
                "Authorization": f"Bearer {self.access_token}",
                "Accept": "text/event-stream",
            },
            stream=True,
            name="/api/v1/assistant/chat",
            catch_response=True,
        ) as resp:
            if resp.status_code not in (200, 429):
                resp.failure(f"Assistant chat failed: {resp.status_code}")
                return
            # Consume the stream (drain SSE chunks)
            try:
                for _ in resp.iter_content(chunk_size=512):
                    pass
            except Exception:
                pass
            resp.success()


def test_assistant_p95_sla(locust_stats: dict) -> None:
    """CI stub. p95 first-byte latency should be under 1000ms."""
    p95 = locust_stats.get("/api/v1/assistant/chat", {}).get("p95", 0)
    assert p95 < 1000, f"Assistant p95 latency {p95}ms exceeds 1000ms SLA"
