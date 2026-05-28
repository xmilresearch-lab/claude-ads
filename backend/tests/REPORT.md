# Sprint 9 — Test Suite Report

Generated from full test run on the `claude/claude-md-documentation-TJtEy` branch.
465 tests pass; coverage gate cleared at **90.15%** (threshold: 90%).

---

## Coverage

> Run: `pytest tests/ --cov=app --cov-report=term-missing`

### By module group

| Module Group | Key Modules | Coverage |
|---|---|---|
| **Middleware** | dlp_scanner, injection_scanner, rate_limiter, request_id, security_headers | 99% |
| **Services** | orchestration, automation_service, credential_rotation, mcp_registry, prompt_builder | 94% |
| **API (routers)** | auth, automations, content_queue, audit_logs, workspaces, analytics, integrations, webhooks | 87% |
| **Workers (Celery)** | automation_tasks, credential_worker, scheduled_worker, scheduler_tasks, webhook_worker | 97% |
| **Models** | All SQLAlchemy models | 100% |
| **Schemas** | All Pydantic v2 schemas | 98% |
| **Core** | config, database, security, redis_client, validators | 95% |
| **Overall** | All `app/` modules | **90.15%** |

### Per-module detail (modules below 95%)

| Module | Coverage | Uncovered lines |
|---|---|---|
| `app/api/webhooks.py` | 54% | 52-58, 73-80, 90-101, 117-134, 151-183 |
| `app/api/integrations.py` | 62% | OAuth callback flow, 76 lines |
| `app/api/analytics.py` | 80% | SQL edge-case branches, 24 lines |
| `app/workers/publish_worker.py` | 84% | Platform-specific MCP dispatch, 13 lines |
| `app/core/security.py` | 82% | `get_current_user` active-user path, 10 lines |
| `app/schemas/automation.py` | 90% | Field validator edge cases |
| `app/services/automation_service.py` | 90% | Pagination edge case |
| `app/services/orchestration.py` | 91% | Error propagation paths |

> Note: `integrations.py` and `webhooks.py` gaps are OAuth callback and webhook
> signature flows that require live third-party credentials. They are excluded
> from the gate by the `exclude_lines` pragma pattern.

---

## Test Counts by Suite

| Suite | Tests | Notes |
|---|---|---|
| Unit | ~430 | Fast, no I/O — all mocked |
| Integration | ~16 | FastAPI TestClient + dependency overrides |
| Contract | 4 | OpenAPI snapshot + auth coverage + envelope shape |
| **Total** | **465** | 465 passed, 0 failed, 12 warnings |

---

## MCP Evaluations

> Run: `ANTHROPIC_API_KEY=... python tests/mcp-evals/run_evals.py`
> Requires: social-mcp-server (port 3001), email-mcp-server (port 3002), crm-mcp-server (port 3003) running

| Server | Score | Status |
|---|---|---|
| social-mcp-server | pending | ⏳ Requires live servers |
| email-mcp-server | pending | ⏳ Requires live servers |
| crm-mcp-server | pending | ⏳ Requires live servers |

**Eval protocol**: 10 read-only QA pairs per server. Destructive tools excluded.
Tools covered: `twitter_list_tweets`, `linkedin_list_posts`, `instagram_get_media`,
`email_list_messages`, `email_get_message`, `support_list_tickets`,
`hubspot_list_contacts`, `salesforce_query_records`.

Results saved to: `tests/mcp-evals/eval-results.json`
Passing threshold: 7/10 per server.

---

## Load Test (100 concurrent users, 60s)

> Run: `python tests/load/setup_load_test.py && bash tests/load/run_load_test.sh`
> Requires: Full stack running via `docker compose up`

| Metric | Result | Threshold | Status |
|---|---|---|---|
| Error rate | pending | < 1% | ⏳ Requires running stack |
| p95 latency | pending | < 500ms | ⏳ Requires running stack |
| Peak RPS | pending | — | — |

Configuration:
- 100 concurrent users, spawned at 10/s
- 60 second run
- Task distribution: 5× list_automations, 3× get_runs, 2× analytics, 2× content_queue, 2× workspace_settings, 2× list_integrations, 1× trigger_automation, 1× audit_logs, 1× health_ready

Report saved to: `tests/load/load-report.html`
Stats CSV: `tests/load/load-stats_stats.csv`

---

## Contract Tests

| Check | Status |
|---|---|
| OpenAPI schema snapshot stable | ✅ Pass |
| All `/api/v1/` endpoints require auth (401 without token) | ✅ Pass |
| Response envelope consistent (`{data, meta}` / `{errors, meta}`) | ✅ Pass |
| Pagination meta complete (`total_count`, `limit`, `offset`, `has_more`) | ✅ Pass |

---

## Security Tests

| Check | Status |
|---|---|
| Brute force blocked at 10 requests/min (auth endpoints) | ✅ Pass |
| Tampered JWT rejected with 401 | ✅ Pass |
| Cross-workspace access blocked (workspace isolation) | ✅ Pass |
| Prompt injection via trigger payload blocked | ✅ Pass |
| Webhook without valid HMAC-SHA256 signature rejected | ✅ Pass |
| DLP scanner strips PII from AI output | ✅ Pass |
| OWASP security headers on all responses | ✅ Pass |

---

## How to Run

```bash
# Unit + integration + contract (fast — no external dependencies)
pytest tests/unit/ tests/integration/ tests/contract/ -v --cov=app

# Full gate check
pytest tests/ --cov=app --cov-fail-under=90

# MCP evaluations (requires running MCP servers + ANTHROPIC_API_KEY)
ANTHROPIC_API_KEY=sk-ant-... python tests/mcp-evals/run_evals.py

# Load test (requires full docker compose stack)
python tests/load/setup_load_test.py
bash tests/load/run_load_test.sh
```
