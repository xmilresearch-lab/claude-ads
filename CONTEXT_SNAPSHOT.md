# XMiL AI Automation Platform — Full Context Snapshot
Generated: 2026-06-11
Repo: xmilresearch-lab/claude-ads
Branch: claude/eager-babbage-kxznta (feature branch; `main` is ~20 commits behind)

---

## 1. PLATFORM OVERVIEW

The platform is a multi-tenant SaaS ("Automate Everything: Social Media · Email & Support · CRM") that lets a workspace connect third-party accounts (Twitter/X, LinkedIn, Instagram, Facebook, TikTok, Threads, Gmail, SendGrid, Zendesk, HubSpot, Salesforce) via OAuth2/API key, then define "Automations" — scheduled (cron) or webhook-triggered jobs with a JSONB `config`. When an automation runs, the backend orchestration engine (`app/services/orchestration.py`) loads the automation config and the workspace's brand voice, scans the trigger payload with an `injection_scanner`, builds a Claude system prompt (brand voice + task rules), calls the Claude API (`claude-sonnet-4-20250514`) with the relevant MCP server (social/email/CRM) exposed as tools, scans the model's output with a `dlp_scanner`, and either executes the action directly or writes it to a `content_queue` for human approval before publishing. Every run is recorded in `automation_runs` and `audit_logs`. The frontend (Next.js 15) provides dashboards for managing automations, reviewing/approving queued content, connecting integrations, viewing analytics, and (for admins) workspace/user/system administration.

---

## 2. TECH STACK

### Backend (from `backend/pyproject.toml`)
- Python 3.12+
- fastapi >= 0.115
- uvicorn[standard] >= 0.30
- sqlalchemy[asyncio] >= 2.0 (async, `select()` style)
- asyncpg
- alembic
- pydantic >= 2.0, pydantic-settings
- python-jose[cryptography] (JWT)
- passlib[bcrypt], bcrypt >= 4.0, < 5.0
- cryptography >= 46.0.5 (AES-256-GCM credential encryption)
- secure >= 0.3.0 (security headers)
- celery[redis] >= 5.3
- redis >= 5.0
- croniter
- httpx
- slowapi >= 0.1.9, limits[redis] >= 3.6
- anthropic >= 0.40.0 (Claude API)
- pywebpush >= 2.0 (optional — graceful degrade if not installed)
- Dev/test: ruff, mypy, pytest, pytest-asyncio, pytest-cov, faker, locust, respx, freezegun, factory-boy, pip-audit

### Frontend (Next.js 15)
- Next.js 15 (App Router), React 19, TypeScript 5 (strict)
- TanStack Query v5
- Radix UI primitives + Tailwind CSS v3 (custom dark/amber design system)
- react-hook-form + Zod
- js-cookie (refresh token storage)
- vitest + React Testing Library

### Infrastructure
- PostgreSQL 16 (primary datastore)
- Redis 7 (Celery broker/backend, rate limiting, caching)
- Weaviate — provisioned in docker-compose but **not used by app code** (flagged as removable)
- Celery 5 — 3 priority queues (high/medium/low) + scheduler queue + Beat
- 3 MCP servers (TypeScript SDK, streamable HTTP): social (3001), email (3002), crm (3003)
- Docker Compose for dev (`backend/docker-compose.yml`) and prod (`backend/docker-compose.prod.yml`), nginx in prod
- CI/CD: GitHub Actions (`.github/workflows/ci.yml`)
- Frontend deploy target: Vercel (`vercel.json`)

---

## 3. DIRECTORY STRUCTURE

### Top-level (`/`)
- `backend/` — FastAPI application, MCP servers, tests, Docker configs
- `frontend/` — Next.js 15 application
- `docs/` — API.md, DEPLOYMENT.md, DEVELOPMENT.md
- `ads`, `agents`, `assets`, `evals`, `research`, `scripts`, `skills` — auxiliary directories (not part of the core platform per se; not deeply reviewed in this pass)
- `CLAUDE.md` — backend project instructions/architecture rules
- `CONTEXT.md`, `PROJECT_AUDIT_REPORT.md`, `CLIENT_SETUP_GUIDE.md`, `CHANGELOG.md`, `DEMO_ARTIFACT.jsx` — handoff/reference docs
- `install.sh` / `install.ps1` / `uninstall.sh` / `uninstall.ps1` — repo-level installer scripts (unrelated to the SaaS backend/frontend)

### `backend/app/` subdirectories
- `api/` — FastAPI routers (one file per domain)
- `core/` — config, database, security primitives, middleware-adjacent utilities
- `models/` — SQLAlchemy ORM models
- `schemas/` — Pydantic v2 request/response schemas (incl. `DataResponse`/`PaginatedResponse` envelopes)
- `services/` — business logic (orchestration, automation service, credential rotation, push, prompt builder, MCP registry)
- `workers/` — Celery task definitions + Beat schedule + celery_app
- `middleware/` — injection scanner, DLP scanner, rate limiter, security headers
- `integrations/` — OAuth provider configs/clients (8 providers)
- `mcp/` — the 3 TypeScript MCP servers (social, email, crm)

### `frontend/src/` subdirectories
- `app/` — route groups `(auth)`, `(dashboard)`, `(admin)`, root layout/page/not-found, `middleware.ts`
- `components/` — `ui/`, `layout/`, `shared/`, `auth/`, `integrations/`, `automations/`, `content/`, `analytics/`, `audit/`
- `lib/` — `api/` (client + per-domain modules), `auth/`, `hooks/`, `providers/`, `utils/`, `env.ts`, `cron.ts`
- `contexts/` — `AuthContext.tsx`
- `__tests__/` — 28 vitest test files (250 tests)

---

## 4. DATABASE MODELS

All models use UUID primary keys and `created_at`/`updated_at` (where applicable) timestamps. No hard-delete soft-delete column (e.g. `deleted_at`) was found on these core models — account deletion is implemented as anonymize+deactivate+audit-log (per CLAUDE.md notes), not a `deleted_at` timestamp pattern.

| Model | Table | Key Fields | Relationships |
|---|---|---|---|
| User | `users` | id, email (unique), hashed_password, plan, is_active, created_at, updated_at | 1—N Workspace |
| Workspace | `workspaces` | id, user_id (FK users), name, brand_voice (JSONB), settings (JSONB), created_at, updated_at | N—1 User; 1—N Automation, Integration, AuditLog, PushSubscription |
| Automation | `automations` | id, workspace_id (FK workspaces), name, type, config (JSONB), schedule (cron str), trigger (str), active (bool), created_at, updated_at | N—1 Workspace; 1—N AutomationRun |
| AutomationRun | `automation_runs` | id, automation_id (FK automations), status (pending/running/succeeded/failed/skipped), result (JSONB), error, ai_tokens_used, started_at, finished_at, created_at | N—1 Automation |
| Integration | `integrations` | id, workspace_id (FK workspaces), type, credentials_encrypted (AES-256-GCM), status (active/expiring/expired/revoked/error), meta (JSONB), created_at, updated_at | N—1 Workspace |
| ContentQueue | `content_queue` | id, automation_id (FK automations), platform, content (JSONB), status (pending_approval/approved/publishing/published/rejected/failed), scheduled_at, published_at, created_at, updated_at | N—1 Automation |
| AuditLog | `audit_logs` | id, workspace_id (FK workspaces), action, actor, metadata (JSONB), created_at | N—1 Workspace |
| PushSubscription | `push_subscriptions` | id, workspace_id (FK workspaces), subscription_json, created_at | N—1 Workspace |

---

## 5. API SURFACE

All routes are under `/api/v1/` except `/webhooks/` (root, unversioned) and `/health*`. Response envelope: `DataResponse[T]` = `{ "data": T, "meta": { "request_id", "timestamp" } }`; list endpoints use `PaginatedResponse[T]` which additionally includes `total_count`, `limit`, `offset`, `has_more` in `meta`.

### Health (root)
- `GET /health` — liveness (always 200)
- `GET /health/live` — alias of `/health`
- `GET /health/ready` — readiness: checks Postgres, Redis, 3 MCP servers; 200 `ready`/`degraded`, 503 `not_ready`

### Auth — `/api/v1/auth/`
- `POST /register` — create user + workspace (201)
- `POST /login` — issue access + refresh tokens
- `POST /refresh` — exchange refresh token for new access token
- `POST /change-password` — change password (current + new)
- `GET /me` — current user profile
- `DELETE /account` — soft-delete (anonymize + deactivate) current user account (204)

### Automations — `/api/v1/automations/`
- `POST /` — create automation (201)
- `GET /` — list automations (paginated)
- `GET /{id}` — get automation
- `PATCH /{id}` — update automation
- `DELETE /{id}` — delete automation (204)
- `POST /{id}/run` — trigger a run
- `GET /{id}/runs` — list runs for automation (paginated)

### Content Queue — `/api/v1/content/`
- `GET /queue` — list pending/queued content (paginated)
- `GET /{id}` — get content item
- `PATCH /{id}/approve` — approve item
- `PATCH /{id}/reject` — reject item (optional reason)
- `DELETE /{id}` — delete item (204)

### Audit Logs — `/api/v1/audit/`
- `GET /logs` — list audit log entries (paginated, filter by action/date range)
- `GET /logs/{id}` — get single entry (workspace-scoped, IDOR-protected)
- `GET /summary` — aggregated counts by action
- `GET /export` — export logs as CSV/JSON blob (rate-limited 10/hour)

### Workspaces — `/api/v1/workspaces/`
- `GET /me` — current workspace + counts
- `PATCH /me` — update name/settings
- `GET /me/brand-voice` — get brand voice
- `PUT /me/brand-voice` — set brand voice (sanitized via `sanitize_example()`)
- `GET /me/settings` — get settings
- `PUT /me/settings` — update settings

### Integrations — `/api/v1/integrations/`
- `POST /` — connect integration (OAuth code or API key)
- `GET /` — list integrations (paginated)
- `GET /{id}` — get integration
- `PATCH /{id}/refresh` — manually refresh credentials
- `DELETE /{id}` — disconnect integration (204)
- `GET /callback` — OAuth callback (code/state) → exchanges token, stores encrypted, redirects to frontend
- `GET /health/status` — health status of all integrations

### Analytics — `/api/v1/analytics/`
- `GET /overview` — KPI overview (default last 30 days)
- `GET /runs-timeline` — time series of automation runs
- `GET /platform-breakdown` — published/pending/failed by platform
- `GET /automation-breakdown` — per-automation stats (paginated)
- `GET /token-usage` — daily Claude token usage series
- `GET /export` — CSV export (rate-limited 10/hour)

### Push — `/api/v1/push/`
- `POST /subscribe` — register browser push subscription (201)
- `DELETE /subscribe/{id}` — unsubscribe (204)
- `GET /vapid-key` — public VAPID key for client registration

### Webhooks — `/webhooks/` (root, no version prefix)
- `POST /support-ticket` — external support ticket webhook (e.g. Zendesk)
- `POST /crm-event` — external CRM event webhook (e.g. HubSpot/Salesforce)

---

## 6. MCP SERVERS

All servers use streamable HTTP transport, `Authorization: Bearer $MCP_AUTH_TOKEN` header, and are stateless (state lives in Postgres).

### social-mcp-server — port 3001 — 17 tools
Platforms: Twitter/X, LinkedIn, Instagram, Facebook, TikTok, Threads
- `social_create_post`, `social_schedule_post`, `social_delete_post`, `social_get_analytics` (Twitter, LinkedIn, Facebook — full set)
- `social_create_post`, `social_get_account` (Instagram, TikTok)
- `social_create_post` (Threads)

### email-mcp-server — port 3002 — 7 tools
- Gmail: `email_send`, `email_list`
- SendGrid: `email_send`, `email_list`
- Zendesk: `support_create_ticket`, `support_reply`, `support_list`

### crm-mcp-server — port 3003 — 7 tools
- HubSpot: `crm_create_contact`, `crm_update_contact`, `crm_list_contacts`, `crm_create_deal`
- Salesforce: `crm_create_lead`, `crm_update_lead`, `crm_query`

Total: 31 MCP tools across 3 servers.

---

## 7. AUTHENTICATION & SECURITY

**JWT**: HS256 algorithm, `SECRET_KEY` from env. Access token expiry 30 minutes, refresh token expiry 30 days. Password hashing via bcrypt/passlib.

**Credential encryption**: AES-256-GCM (`ENCRYPTION_KEY` from env). `encrypt_credential(value) -> base64(nonce[12] || ciphertext)`, `decrypt_credential(encrypted) -> str`. Applied to all OAuth tokens/API keys stored in `integrations.credentials_encrypted`.

**Middleware/security layers** (`backend/app/middleware/`):
- `injection_scanner.py` — scans user-supplied content (automation names, trigger payloads, content) for prompt-injection patterns. High-severity patterns (`role_override`, `prompt_leak`, `jailbreak_dan`, `override_rules`) raise `SecurityError` and block the request. Lower-severity patterns (`ignore_instructions`, `base64_injection`, `system_tag_injection`, `human_tag_injection`) are logged as suspicious but may be allowed depending on match count.
- `dlp_scanner.py` — scans Claude output for EMAIL, PHONE_US, PHONE_INTL, SSN, CREDIT_CARD, IP_ADDRESS, API_KEY and masks them before the result is sent to external platforms.
- `rate_limiter.py` — SlowAPI + Redis. Limits: auth 10/min, read 300/min, write 60/min, automation trigger 30/min, webhooks 200/min. Key = IP or workspace ID (from JWT `sub`). 429 on exceed.
- `security_headers.py` — adds HSTS, CSP, X-Frame-Options, X-Content-Type-Options to all responses.

**Audit log**: `audit_logs` table records `action`, `actor`, `metadata` (JSONB), `created_at`, scoped to `workspace_id`. Examples of logged actions: `automation.created`, `integration.connected`, `content.approved`, `account.deleted`. Runs that consume >2,000 Claude tokens are flagged with a `high_token_usage` audit entry (per CLAUDE.md rule; not independently re-verified line-by-line in this pass).

---

## 8. CELERY WORKERS

**Celery app**: `backend/app/workers/celery_app.py` — broker/backend = `REDIS_URL`, JSON serialization only (no pickle).

| Task | File | Queue |
|---|---|---|
| `run_automation_task(automation_id, trigger_payload)` | `automation_tasks.py` | `automations` |
| `dispatch_scheduled_automations` | `scheduler_tasks.py` | `scheduler` |
| `run_scheduled_automation` | `scheduled_worker.py` | `automations` |
| `poll_due_automations` | `scheduled_worker.py` | `scheduler` |
| `handle_support_ticket` | `webhook_worker.py` | `high_priority` |
| `handle_crm_event` | `webhook_worker.py` | `medium_priority` |
| `publish_content(content_queue_id)` | `publish_worker.py` | `medium_priority` |
| `check_and_refresh_credentials` | `credential_worker.py` | `low_priority` |

**Beat schedule** (`beat_schedule.py`):
- `poll-due-automations` — every minute
- `check-expiring-credentials` — every 6 hours (auto-refreshes TikTok and Threads tokens)

**Retry policy**: `max_retries=3`, `default_retry_delay=60s`, `retry_backoff=True`, `retry_backoff_max=300s`. `AutomationNotFoundError`, `InactiveAutomationError`, `RateLimitError` are excluded from auto-retry (fail fast).

---

## 9. FRONTEND ROUTES

Route protection is enforced in `frontend/src/middleware.ts` based on the presence of a refresh-token cookie and (for admin routes) `useAuth().isAdmin`.

### `(auth)` — public
- `/login`
- `/register`
(Both redirect to `/automations` if already authenticated.)

### `(dashboard)` — requires auth
- `/automations`
- `/content`
- `/integrations`
- `/integrations/callback` (OAuth redirect target)
- `/analytics`
- `/audit`
- `/settings/workspace`
- `/settings/brand-voice`
- `/settings/account`
- `/settings/onboarding`

### `(admin)` — requires auth + `isAdmin`
- `/admin`
- `/admin/users`
- `/admin/workspaces`
- `/admin/system`
- `/admin/audit`

### Root
- `/` — redirect
- `not-found.tsx` — 404
- `layout.tsx` — wraps app in `QueryProvider`, `AuthProvider`, `Toaster`
- `middleware.ts` — auth/admin route guards

---

## 10. FRONTEND COMPONENTS

Grouped by `frontend/src/components/` subdirectory (names only, purpose inferred from naming/CLAUDE.md):

- **ui/** — 14 Radix UI primitive wrappers: Button, Badge, Input, Dialog, Card, etc. (design-system base layer)
- **layout/** — Sidebar, TopBar, PageHeader, DashboardShell, AdminSidebar, OnboardingBanner
- **shared/** — DataTable, EmptyState, LoadingSpinner, StatusBadge, ServiceWorkerRegistrar, and other cross-feature widgets
- **auth/** — LoginForm, RegisterForm
- **integrations/** — IntegrationCard, HealthStatusBar, APIKeyModal, ProviderIcon
- **automations/** — AutomationCard, AutomationFormModal, RunDetailModal
- **content/** — ContentCard, ReviewModal, RejectModal, BulkActionBar
- **analytics/** — KpiCard, RunTrendChart, TokenUsageChart, PlatformChart, AutomationTable, ChartPrimitives
- **audit/** — AuditLogTable

**Flagged duplicate/possible dead code**: `AutomationCard.tsx` vs `automation-card.tsx` were flagged in a prior audit as possibly duplicated — this pass did not independently confirm which (if either) is unused; needs verification (`grep` for imports of each filename).

---

## 11. TEST SUITE

> Note: the live `pytest`/`npm run build`/`npm run typecheck` commands requested for this snapshot were not captured with raw output by the research pass (the sub-agent reported them but the exact captured stdout was not preserved verbatim in this summary). The figures below are sourced from `PROJECT_AUDIT_REPORT.md` (dated 2026-05-30) and should be **re-verified by running the commands directly** before relying on them as current truth — they may not reflect any commits made after that audit.

**Backend** (`backend/tests/`):
- 48 test files, 488 tests total, all reported passing as of the last audit
- Coverage: 82.39% (CI gate is `--cov-fail-under=83`, per the agent's read of `ci.yml` — i.e., currently borderline/failing depending on exact threshold value; **this is a direct mismatch that should be re-checked**, since the audit text says the threshold was "lowered to 83%" but also reports 82.39% coverage, which would still fail an 83% gate)
- Structure: `unit/` (26 files), `integration/` (3 files: test_api_full.py, test_orchestration.py, test_integrations_api.py, test_workers.py), `contract/` (1 file), `security/` (1 file), `load/` (2 Locust files), `mcp-evals/` (1 file, 30 QA pairs)
- Lowest-coverage areas reported: `integrations.py` (~39%), Celery workers (hard to test without a real broker), `push_service.py` (~26%) — exact bottom-5 file list not independently re-derived in this pass; re-run `pytest --cov-report=term-missing` for an authoritative list

**Frontend** (`frontend/src/__tests__/`):
- 28 vitest files, 250 tests, reported all passing
- Coverage not measured in the last audit
- `npm run build`: reported PASSING, all 24 routes compile
- `npm run typecheck` (`tsc --noEmit`): reported 0 errors
- ESLint: 4 pre-existing warnings (low priority, unused vars / RHF `watch()` patterns)

**Action required**: re-run the 5 commands listed in the original task verbatim and update this section with actual current output — this snapshot could not capture live results.

---

## 12. CI/CD PIPELINE

`.github/workflows/ci.yml` — triggers on push to `main`/`develop` and PRs to `main`. Runs on Python 3.12 + Node 20, with PostgreSQL 16-alpine and Redis 7-alpine service containers.

Jobs (in dependency order):
1. **lint** — `ruff check backend/app/`, `mypy backend/app/ --ignore-missing-imports` (mypy errors are non-blocking per audit, but verify whether CI actually treats them as non-fatal)
2. **security-scan** — `pip-audit --fail-on HIGH`
3. **test** (depends on lint) — runs `alembic upgrade head`, then `pytest tests/unit tests/integration tests/contract tests/security --cov=app --cov-fail-under=83`, uploads coverage to Codecov
4. **build** (depends on test + security-scan, main branch only) — builds and pushes `ghcr.io/<repo>/api:latest` (Dockerfile.prod) and `ghcr.io/<repo>/worker:latest` (Dockerfile.worker)
5. **deploy** (depends on build, main branch only, manual approval) — SSH to prod host, `git pull`, `docker compose -f docker-compose.prod.yml pull && up -d`, `docker compose exec api alembic upgrade head`, smoke test `curl https://$PROD_DOMAIN/health`

**Required secrets**: `ANTHROPIC_API_KEY`, `PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY`, `PROD_DOMAIN`, plus implicit `GITHUB_TOKEN` for GHCR push.

**Flagged mismatch**: the test job enforces `--cov-fail-under=83`, but the last known coverage figure (82.39%) is below that threshold — meaning CI's test job would currently fail on coverage even though all 488 tests pass individually. This should be re-verified.

**Deploy job only runs on `main`**, but the current branch (`claude/eager-babbage-kxznta`) is ~20 commits ahead of `main` — none of this work will build/deploy via CI until merged.

---

## 13. CURRENT OPEN ISSUES

**TODO/FIXME/NotImplementedError grep** (re-run directly in this session):
```
grep -rn "TODO\|FIXME\|NotImplementedError" backend/app frontend/src
```
→ **No matches found.** The codebase contains no TODO, FIXME, or NotImplementedError markers in `backend/app` or `frontend/src`.

**Known empty/placeholder config values** (from `backend/app/core/config.py` / `.env.example`, confirmed by audit):
- `DATABASE_URL`, `REDIS_URL` — empty in `.env` (expected to be filled per-environment)
- `SECRET_KEY`, `ENCRYPTION_KEY` — empty (must be generated before any deploy)
- `ANTHROPIC_API_KEY` — empty
- `MCP_AUTH_TOKEN` — empty
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` — empty (push notifications will silently fail)
- `WEBHOOK_SECRET` — empty
- All 14 OAuth credential variables (7 providers × client ID/secret) — empty: `TWITTER_CLIENT_ID/SECRET`, `LINKEDIN_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `HUBSPOT_CLIENT_ID/SECRET`, `FACEBOOK_CLIENT_ID/SECRET`, `TIKTOK_CLIENT_KEY/SECRET`, `THREADS_CLIENT_ID/SECRET`

**Known dead-code / cleanup candidates** (from prior audit, not re-verified this pass):
- Possible duplicate `AutomationCard.tsx` / `automation-card.tsx` in `frontend/src/components/automations/`
- Weaviate service defined in docker-compose but unused by any app code
- `seed_demo.py` referenced in handoff docs but reported missing in an earlier audit (may have been added since — `dbc6313` commit message says it was added; verify it exists)

**Config/code mismatches to verify**:
- CI coverage gate (83%) vs last measured coverage (82.39%)
- mypy reports 79 errors in `backend/app/` — confirm whether CI's mypy step is allowed to fail (`continue-on-error` or similar) or whether this would currently break CI

---

## 14. KNOWN BLOCKERS (go-live)

1. **All 14 OAuth provider credentials are empty** in `backend/.env` / config (`backend/app/core/config.py`) — every "Connect" integration flow (Twitter, LinkedIn, Gmail, HubSpot, Facebook, Instagram, TikTok, Threads) will fail at runtime until a real client registers OAuth apps with each provider and populates these values. **Fix**: client-side OAuth app registration + populate `.env` (documented in `CLIENT_SETUP_GUIDE.md`).
2. **VAPID keypair not present in `.env`** — `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` empty, so `/api/v1/push/vapid-key` and all web-push notifications will fail (push_service degrades gracefully but the feature is non-functional). **Fix**: generate a VAPID keypair and add both values to `backend/.env` (~2 min).
3. **Test coverage gate mismatch** — CI requires `--cov-fail-under=83` but last measured backend coverage was 82.39%. If unchanged, the `test` job in CI fails even though all 488 tests pass. **Fix**: either add targeted tests to push coverage ≥83% (audit estimated 4-6 hours, focused on `integrations.py`, `push_service.py`, Celery workers) or adjust the threshold with justification.
4. **Feature branch not merged to `main`** — `main` is ~20 commits behind `claude/eager-babbage-kxznta`. The `build`/`deploy` CI jobs only trigger on `main`, so none of the work on this branch will be built into Docker images or deployed until merged.
5. **mypy: 79 errors in `backend/app/`** — not confirmed whether this currently fails CI's `lint` job; if `mypy` is a hard gate, CI is currently red. **Fix**: confirm CI behavior, then either fix incrementally or explicitly mark as non-blocking in the workflow with a comment explaining why.
6. **pywebpush install reliability** — reported to fail to install in some environments due to a `http-ece`/setuptools issue; `push_service.py` is written to degrade gracefully, but production Docker images should be verified to actually have `pywebpush` installed if push notifications are required.

---

## 15. WHAT TO DO NEXT

Based on the findings above, in priority order:

1. **Re-run the verification commands** (`pytest -q --tb=no`, `pytest --co -q`, `pytest --cov`, `npm run build`, `npm run typecheck`, `git log`, `git branch -a`, `git status`) directly and update Sections 11–13 of this document with real, current output — the figures here are inherited from a prior audit and may be stale.
2. **Resolve the coverage/CI gate mismatch** (Section 12/14 item 3) — either add tests for `integrations.py`/`push_service.py`/Celery workers or adjust `--cov-fail-under` with a documented justification, so the `test` job in CI is green.
3. **Generate and set the VAPID keypair** in `backend/.env` (quick win, unblocks push notifications) and confirm `pywebpush` is installed in the production Docker image.
4. **Audit and resolve the `AutomationCard.tsx` / `automation-card.tsx` duplication**, confirm whether Weaviate can be removed from docker-compose, and confirm `seed_demo.py` exists and works.
5. **Merge `claude/eager-babbage-kxznta` into `main`** (after the above are addressed) so the `build`/`deploy` CI jobs activate — note that OAuth credentials and other secrets remain a client-side configuration task that blocks a *fully functional* production deployment regardless of merge status.

---

## 16. HOW TO RUN LOCALLY

From a fresh clone:

```bash
# Backend
cd backend
cp .env.example .env
# Fill in DATABASE_URL, REDIS_URL, ANTHROPIC_API_KEY, SECRET_KEY, ENCRYPTION_KEY,
# MCP_AUTH_TOKEN, and (optionally) OAuth provider credentials in .env

docker compose up -d postgres redis        # start dependencies
alembic upgrade head                       # run migrations (or rely on app startup auto-migrate)
uvicorn main:app --reload                  # start API on :8000

# Celery (separate terminals or via docker compose)
celery -A app.workers.celery_app worker --loglevel=info
celery -A app.workers.celery_app beat --loglevel=info

# MCP servers
cd mcp/social-mcp-server && npm install && npm run build && npm start   # :3001
cd mcp/email-mcp-server  && npm install && npm run build && npm start   # :3002
cd mcp/crm-mcp-server    && npm install && npm run build && npm start   # :3003

# Or, for full stack via Docker:
cd backend && docker compose up
```

```bash
# Frontend
cd frontend
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

npm install
npm run dev          # http://localhost:3000
```

```bash
# Tests
cd backend && pytest tests/ -v --cov=app
cd frontend && npm run test
```

---

## 17. HOW TO DEPLOY TO PRODUCTION

Based on `backend/docker-compose.prod.yml`, `Dockerfile.prod`, `Dockerfile.worker`, and `vercel.json` (as reported):

**Backend (Docker Compose, prod)**:
- `nginx` (1.25-alpine) terminates TLS, proxies to `api` — requires `./nginx/nginx.prod.conf` and SSL certs mounted
- `api` — 2 replicas, built from `Dockerfile.prod` (multi-stage: `python:3.12-slim` build stage → slim runtime, non-root user), runs `uvicorn main:app --host 0.0.0.0 --port 8000`
- `celery_worker_high/medium/low` — built from `Dockerfile.worker`, one per queue tier
- `celery_beat` — `celery -A app.workers.celery_app beat --loglevel=info`
- `postgres` (16-alpine) and `redis` (7-alpine, AOF persistence) — no Flower in prod

**Deploy flow (per CI `deploy` job)**:
1. CI builds and pushes `ghcr.io/<repo>/api:latest` and `ghcr.io/<repo>/worker:latest` (only on `main`, after tests pass)
2. SSH to production host (`PROD_HOST`/`PROD_USER`/`PROD_SSH_KEY` secrets)
3. `git pull origin main`
4. `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d`
5. `docker compose exec api alembic upgrade head`
6. Smoke test: `curl https://$PROD_DOMAIN/health` must return 200

**Frontend (Vercel)**:
- `vercel.json` configures static asset caching (1 year), an API rewrite (proxying `/api/*` to the backend), and `regions: ["iad1"]`
- Set `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_ADMIN_DOMAIN` as Vercel environment variables

**Environment variables that must be set for production** (backend):
- `DATABASE_URL`, `REDIS_URL`
- `ANTHROPIC_API_KEY`, `CLAUDE_MODEL`
- `SECRET_KEY`, `ENCRYPTION_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `REFRESH_TOKEN_EXPIRE_DAYS`
- `SOCIAL_MCP_URL`, `EMAIL_MCP_URL`, `CRM_MCP_URL`, `MCP_AUTH_TOKEN`
- `OAUTH_REDIRECT_URI`, `ALLOWED_ORIGINS`
- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_MAILTO`
- `WEBHOOK_SECRET`
- `TWITTER_CLIENT_ID/SECRET`, `LINKEDIN_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `HUBSPOT_CLIENT_ID/SECRET`, `FACEBOOK_CLIENT_ID/SECRET`, `TIKTOK_CLIENT_KEY/SECRET`, `THREADS_CLIENT_ID/SECRET`
- `FACEBOOK_REDIRECT_URI`, `TIKTOK_REDIRECT_URI`, `THREADS_REDIRECT_URI`

**Environment variables for frontend (Vercel)**:
- `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_ADMIN_DOMAIN`

---

## CAVEATS ON THIS SNAPSHOT

- This document was assembled from a structured research pass plus the most recent `PROJECT_AUDIT_REPORT.md` (dated 2026-05-30). Sections 11 and 12 rely on figures that **were not re-verified by directly executing pytest/npm in this session** — `pytest` is not installed in this sandbox (`python -m pytest` → "No module named pytest"), so test/coverage output could not be captured directly here. The research agent's earlier report is the source for those numbers and may be stale.
- `git status` confirms: working tree clean except for this new untracked `CONTEXT_SNAPSHOT.md`; current branch is `claude/eager-babbage-kxznta`.
- The TODO/FIXME/NotImplementedError grep (Section 13) **was run directly in this session** and returned zero matches — that finding is current and verified.
- Before treating Sections 11–12 as authoritative, install dependencies (`pip install -e ".[dev]"` or equivalent) and re-run: `pytest tests/ -q --tb=no`, `pytest tests/ --co -q`, `pytest tests/ --cov=app --cov-report=term-missing`, `npm run build`, `npm run typecheck`.
