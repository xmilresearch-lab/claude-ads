"""
Locust load test for the AI Automation Platform API.

Target: 100 concurrent users, p95 latency < 500ms, error rate < 1%.

Usage (via run_load_test.sh):
    source .env.loadtest
    locust -f tests/load/locustfile.py \\
        --headless --users 100 --spawn-rate 10 --run-time 60s \\
        --host http://localhost:8000 \\
        --html tests/load/load-report.html \\
        --csv tests/load/load-stats

Manual (UI mode):
    locust -f tests/load/locustfile.py --host http://localhost:8000
"""

from __future__ import annotations

import json
import os
import random

from locust import HttpUser, between, events, task

# ── Test fixtures (populated by setup_load_test.py) ───────────────────────────

TEST_TOKEN = os.environ.get("LOAD_TEST_TOKEN", "")
_raw_ids = os.environ.get("LOAD_TEST_AUTOMATION_IDS", "")
TEST_AUTOMATION_IDS: list[str] = [i for i in _raw_ids.split(",") if i]

if not TEST_TOKEN:
    print(
        "WARNING: LOAD_TEST_TOKEN is not set — auth headers will be empty. "
        "Run tests/load/setup_load_test.py first."
    )
if not TEST_AUTOMATION_IDS:
    print(
        "WARNING: LOAD_TEST_AUTOMATION_IDS is not set — automation-specific "
        "endpoints will use a placeholder ID. "
        "Run tests/load/setup_load_test.py first."
    )
    TEST_AUTOMATION_IDS = ["00000000-0000-0000-0000-000000000000"]


# ── User ───────────────────────────────────────────────────────────────────────


class AutomationPlatformUser(HttpUser):
    """Simulates a workspace user interacting with the automation platform."""

    wait_time = between(1, 3)

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {TEST_TOKEN}",
            "Content-Type": "application/json",
        }

    # ── High-frequency read operations (dominate real-world usage) ────────────

    @task(5)
    def list_automations(self) -> None:
        """List automations — highest frequency, pure read."""
        self.client.get(
            "/api/v1/automations/",
            headers=self._headers,
            name="/api/v1/automations/ [LIST]",
        )

    @task(3)
    def get_automation_runs(self) -> None:
        """Poll run status — common after triggering an automation."""
        automation_id = random.choice(TEST_AUTOMATION_IDS)
        self.client.get(
            f"/api/v1/automations/{automation_id}/runs",
            headers=self._headers,
            name="/api/v1/automations/{id}/runs [LIST]",
        )

    @task(2)
    def get_analytics_overview(self) -> None:
        """Analytics dashboard — loaded on every page view."""
        self.client.get(
            "/api/v1/analytics/overview?days=30",
            headers=self._headers,
            name="/api/v1/analytics/overview",
        )

    @task(2)
    def get_content_queue(self) -> None:
        """Content queue listing — editors check this frequently."""
        self.client.get(
            "/api/v1/content/queue",
            headers=self._headers,
            name="/api/v1/content/queue [LIST]",
        )

    @task(2)
    def get_workspace_settings(self) -> None:
        """Workspace settings — loaded at session start and after changes."""
        self.client.get(
            "/api/v1/workspaces/me/settings",
            headers=self._headers,
            name="/api/v1/workspaces/me/settings",
        )

    @task(2)
    def list_integrations(self) -> None:
        """Integration status — users check this when debugging."""
        self.client.get(
            "/api/v1/integrations",
            headers=self._headers,
            name="/api/v1/integrations [LIST]",
        )

    # ── Lower-frequency write operations ─────────────────────────────────────

    @task(1)
    def trigger_automation(self) -> None:
        """Trigger — the most important path to test under load."""
        automation_id = random.choice(TEST_AUTOMATION_IDS)
        self.client.post(
            f"/api/v1/automations/{automation_id}/run",
            headers=self._headers,
            json={"payload": {"topic": "load test content", "source": "locust"}},
            name="/api/v1/automations/{id}/run [TRIGGER]",
        )

    @task(1)
    def get_audit_logs(self) -> None:
        """Audit log retrieval — compliance / admin use."""
        self.client.get(
            "/api/v1/audit/logs?limit=25&offset=0",
            headers=self._headers,
            name="/api/v1/audit/logs [LIST]",
        )

    # ── Infrastructure probes ─────────────────────────────────────────────────

    @task(1)
    def health_ready(self) -> None:
        """Readiness probe — load balancers and k8s call this constantly."""
        self.client.get("/health/ready", name="/health/ready")


# ── Threshold enforcement ─────────────────────────────────────────────────────


@events.quitting.add_listener
def on_quitting(environment: object, **kwargs: object) -> None:
    """Fail the load test run if SLA thresholds are breached."""
    import locust.env  # noqa: PLC0415

    env: locust.env.Environment = environment  # type: ignore[assignment]
    stats = env.runner.stats.total

    failures: list[str] = []

    error_rate = stats.fail_ratio
    if error_rate > 0.01:
        failures.append(
            f"Error rate {error_rate:.1%} exceeds 1% threshold"
        )

    p95 = stats.get_response_time_percentile(0.95)
    if p95 > 500:
        failures.append(
            f"p95 latency {p95:.0f}ms exceeds 500ms threshold"
        )

    if failures:
        print("\n" + "=" * 60)
        print("LOAD TEST FAILED — SLA thresholds breached:")
        for f in failures:
            print(f"  ✗ {f}")
        print("=" * 60)
        env.process_exit_code = 1
    else:
        print("\n" + "=" * 60)
        print(
            f"LOAD TEST PASSED — "
            f"error rate {error_rate:.2%}, "
            f"p95 {p95:.0f}ms"
        )
        print("=" * 60)


@events.test_start.add_listener
def on_test_start(environment: object, **kwargs: object) -> None:
    print(
        f"\nLoad test starting — "
        f"token={'SET' if TEST_TOKEN else 'MISSING'}, "
        f"automation_ids={TEST_AUTOMATION_IDS}"
    )
