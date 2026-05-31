"""Concurrent signup load test.

Run with: locust -f tests/load/test_concurrent_signups.py --headless -u 50 -r 10 -t 60s

Tests:
- POST /api/v1/auth/register (concurrent user registration)
- POST /api/v1/auth/login    (token acquisition)
- GET  /api/v1/auth/me       (authenticated profile fetch)
"""
import random
import string
import time

from locust import HttpUser, between, task


def _random_email() -> str:
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=10))
    return f"loadtest+{suffix}@example.com"


class SignupUser(HttpUser):
    wait_time = between(0.5, 2.0)
    host = "http://localhost:8000"

    def on_start(self) -> None:
        self.email = _random_email()
        self.password = "LoadTest!1"
        self.access_token: str | None = None

        with self.client.post(
            "/api/v1/auth/register",
            json={"email": self.email, "password": self.password, "workspace_name": "Load Workspace"},
            name="/api/v1/auth/register",
            catch_response=True,
        ) as resp:
            if resp.status_code == 201:
                body = resp.json()
                self.access_token = body.get("data", {}).get("access_token")
                resp.success()
            elif resp.status_code == 409:
                # Re-use existing account from previous run
                resp.success()
                self._login()
            else:
                resp.failure(f"Register failed: {resp.status_code}")

    def _login(self) -> None:
        with self.client.post(
            "/api/v1/auth/login",
            json={"email": self.email, "password": self.password},
            name="/api/v1/auth/login",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                body = resp.json()
                self.access_token = body.get("data", {}).get("access_token")
                resp.success()
            else:
                resp.failure(f"Login failed: {resp.status_code}")

    def _auth_headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.access_token}"} if self.access_token else {}

    @task(5)
    def get_me(self) -> None:
        self.client.get(
            "/api/v1/auth/me",
            headers=self._auth_headers(),
            name="/api/v1/auth/me",
        )

    @task(2)
    def list_automations(self) -> None:
        self.client.get(
            "/api/v1/automations/",
            headers=self._auth_headers(),
            name="/api/v1/automations/",
        )

    @task(1)
    def get_usage(self) -> None:
        self.client.get(
            "/api/v1/billing/usage",
            headers=self._auth_headers(),
            name="/api/v1/billing/usage",
        )


# ── Assertions (run in CI via pytest) ─────────────────────────────────────────


def test_registration_sla(locust_stats: dict) -> None:
    """
    Stub for CI integration. Replace locust_stats fixture with
    locust-pytest or a custom stats reader.
    """
    p95 = locust_stats.get("/api/v1/auth/register", {}).get("p95", 0)
    assert p95 < 500, f"Registration p95 latency {p95}ms exceeds 500ms SLA"
