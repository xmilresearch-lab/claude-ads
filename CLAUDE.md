# AI Automation Platform — Backend

> Automate Everything: Social Media · Email & Support · CRM

-----

## Project Overview

A multi-tenant AI automation platform that uses Claude as its AI engine and MCP servers
to automate social media posting, email campaigns, customer support replies, and CRM updates.
Users connect their accounts (Twitter, LinkedIn, Gmail, HubSpot, etc.) and configure
automations that run on schedules or webhooks.

The platform is now also deployed as a **public SaaS** (branch `claude/saas-conversion-plan-hI7rB`).
SaaS-specific additions are marked **[SAAS]** throughout this file.

-----

## Stack

|Layer        |Technology                                        |
|-------------|--------------------------------------------------|
|API Framework|Python FastAPI (async)                            |
|Database     |PostgreSQL 16 (primary) + Weaviate (vector search)|
|Task Queue   |Celery 5 + Redis 7                                |
|Auth         |JWT (access + refresh) + OAuth2 per integration   |
|AI Engine    |Claude API — model: claude-sonnet-4-20250514      |
|MCP Servers  |TypeScript SDK — streamable HTTP transport        |
|Security     |AES-256-GCM encryption, OWASP LLM Top 10 guards   |
|Billing      |Stripe (checkout sessions + webhooks) [SAAS]      |
|Infra (dev)  |Docker + Docker Compose                           |
|Infra (prod) |Railway (separate project for SaaS) [SAAS]       |

-----

## Project Structure

```
/backend
  /app
    /api            → FastAPI routers (one file per domain)
      billing.py    → Stripe checkout, portal, usage, webhook [SAAS]
      assistant.py  → SSE streaming assistant chat endpoint [SAAS]
    /core
      config.py     → Settings (includes Stripe keys + SaaS URLs) [SAAS]
      plans.py      → PLAN_LIMITS dict (free/starter/pro/enterprise) [SAAS]
    /models         → SQLAlchemy ORM models
    /schemas
      billing.py    → CheckoutRequest/Response, UsageResponse, etc. [SAAS]
    /services
      billing.py    → Stripe service layer (async via asyncio.to_thread) [SAAS]
    /workers
      /tasks
        seed_demo.py → Seed 2 automations + 3 content items for new users [SAAS]
    /middleware
      quota.py      → require_quota() dependency factory [SAAS]
  /mcp
    /social-mcp-server    → TypeScript MCP server
    /email-mcp-server     → TypeScript MCP server
    /crm-mcp-server       → TypeScript MCP server
  /migrations       → Alembic DB migrations
  /tests
  .env.saas.example → SaaS deployment env template (NEVER reuse XMiL keys) [SAAS]
/saas-landing       → Astro marketing site (yoursaas.com) [SAAS]
/docs
```

-----

## Key Commands

```bash
# Start all services
docker compose up

# Run database migrations
alembic upgrade head

# Generate a new migration
alembic revision --autogenerate -m "description"

# Run Python test suite
pytest tests/ -v --cov=app

# Start Celery worker
celery -A app.workers.celery_app worker --loglevel=info

# Seed demo data for a new workspace [SAAS]
python -m app.workers.tasks.seed_demo --workspace-id <uuid>

# Security audit (HIGH/CRITICAL block deployment) [SAAS]
pip-audit

# Lint / type check
ruff check app/
mypy app/
```

-----

## Coding Standards

### Python (FastAPI)

- **Python 3.12+** — use modern syntax
- **Type hints required** on all function signatures, including return types
- **Pydantic v2** for all schemas — `model_config`, not `class Config`
- **SQLAlchemy 2.0** style — `select()`, `async with session`
- **async/await** for ALL I/O — never `time.sleep()`
- **Ruff** for linting, **Black** for formatting (line length: 88)
- **mypy** strict mode
- **All responses** wrapped in `DataResponse[T]` or `PaginatedResponse[T]` [SAAS]
- **Stripe SDK calls** always wrapped in `asyncio.to_thread()` [SAAS]

### TypeScript (MCP Servers)

- **TypeScript strict mode**
- **Zod** for all tool input schemas
- **Tool naming**: `{service}_{action}_{resource}`
- **Transport**: streamable HTTP — never SSE (deprecated)

-----

## Architecture Rules (Never Break These)

1. **Security first** — ALL user-supplied content passes through `injection_scanner` before reaching Claude — INCLUDING assistant chat messages [SAAS]
2. **DLP on output** — ALL Claude-generated content passes through `dlp_scanner` before any response — INCLUDING assistant streaming chunks [SAAS]
3. **Encrypted credentials** — OAuth tokens ALWAYS stored AES-256-GCM; never plaintext, never logged
4. **Brand voice injection** — EVERY Claude call includes workspace brand voice; sanitized via `sanitize_example()` (LLM04)
5. **Audit trail** — EVERY automation run AND every assistant chat writes to `audit_logs` [SAAS]
6. **Rate limits enforced** — checked BEFORE any quota-limited action; quota checked BEFORE billing [SAAS]
7. **MCP servers are stateless** — no session state; all state in PostgreSQL
8. **Security headers** — HSTS, CSP, X-Frame-Options, X-Content-Type-Options on ALL responses
9. **OWASP LLM Top 10 compliance** — see original sprint notes
10. **CVE scanning** — `pip-audit` HIGH/CRITICAL findings block deployment
11. **Quota before action** — `require_quota("automation")` / `require_quota("integration")` / `require_quota("content_queue")` injected as FastAPI dependencies on creation endpoints [SAAS]
12. **Payment required** HTTP 402 — returned with `{"code": "quota_exceeded", "resource": ..., "limit": ..., "upgrade_url": "/billing/plans"}` [SAAS]

-----

## [SAAS] Billing Architecture

### Plan Limits (`app/core/plans.py`)

| Plan       | Automations | Integrations | Content Queue | AI Tokens/mo | Workspaces |
|------------|-------------|-------------|---------------|-------------|------------|
| free       | 3           | 1           | 10            | 10K         | 1          |
| starter    | 15          | 5           | 100           | 100K        | 1          |
| pro        | unlimited   | unlimited   | unlimited     | 1M          | 5          |
| enterprise | unlimited   | unlimited   | unlimited     | unlimited   | unlimited  |

### Stripe Integration (`app/services/billing.py`)

- `get_or_create_stripe_customer(user, db)` — idempotent; stores `stripe_customer_id` on User
- `create_checkout_session(user, price_id, db)` — returns Stripe hosted page URL
- `create_portal_session(user, db)` — returns customer portal URL
- `handle_checkout_completed(event)` — sets `subscription_status`, `current_period_end`
- `handle_subscription_updated(event)` — syncs plan changes
- `handle_subscription_deleted(event)` — downgrades to free
- `handle_payment_failed(event)` — logs payment failure event
- `track_token_usage(workspace_id, tokens_used, db)` — increments `monthly_token_usage`
- All Stripe SDK calls use `asyncio.to_thread()` — SDK is synchronous

### Webhook Security

- `POST /api/v1/billing/stripe-webhook` validates `Stripe-Signature` header
- Raw request body read before JSON parse (required by Stripe)
- Invalid signatures → HTTP 400

-----

## [SAAS] Assistant Streaming (`app/api/assistant.py`)

- `POST /api/v1/assistant/chat` — rate limited 30/minute
- All user messages scanned with `require_clean()` (injection scanner)
- Streams via SSE with `media_type="text/event-stream"`
- Each chunk run through `redact_output()` (DLP scanner) before yielding
- Writes audit log entry per chat invocation
- System prompt includes workspace brand voice + page context

-----

## [SAAS] Quota Middleware (`app/middleware/quota.py`)

```python
def require_quota(resource: str) -> Callable:
    # resource: "automation" | "integration" | "content_queue"
    # Raises HTTP 402 when limit reached
    # Inject as FastAPI Depends() on POST creation endpoints
```

- Add to `POST /automations/`, `POST /integrations/`, `POST /content/`

-----

## Database Models (Quick Reference)

|Model        |Key Fields                                                               |
|-------------|-------------------------------------------------------------------------|
|User         |id, email, hashed_password, plan, is_admin, email_verified [SAAS]        |
|             |stripe_customer_id, stripe_subscription_id [SAAS]                       |
|             |subscription_status, current_period_end [SAAS]                          |
|             |email_verify_token, password_reset_token [SAAS]                         |
|Workspace    |id, user_id, name, brand_voice (JSONB)                                   |
|             |monthly_token_usage (BigInteger), monthly_token_reset_date [SAAS]       |
|Integration  |id, workspace_id, type, credentials_encrypted, status                   |
|Automation   |id, workspace_id, name, type, config (JSONB), schedule, active           |
|AutomationRun|id, automation_id, status, result (JSONB), error, started_at, finished_at|
|ContentQueue |id, automation_id, content (JSONB), platform, scheduled_at, published_at|
|AuditLog     |id, workspace_id, action, actor, metadata (JSONB), created_at           |

-----

## API Versioning

All API routes under `/api/v1/`. Root `/api` returns version info.

| Router         | Base Path                          |
|----------------|------------------------------------|
| Auth           | `/api/v1/auth/`                    |
| Automations    | `/api/v1/automations/`             |
| Content Queue  | `/api/v1/content/`                 |
| Audit Logs     | `/api/v1/audit/`                   |
| Workspaces     | `/api/v1/workspaces/`              |
| Integrations   | `/api/v1/integrations/`            |
| Analytics      | `/api/v1/analytics/`               |
| Billing        | `/api/v1/billing/` [SAAS]          |
| Assistant      | `/api/v1/assistant/` [SAAS]        |
| Webhooks       | `/webhooks/` (root — no version)   |

-----

## [SAAS] Auth Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/verify-email` | Verify email with token |
| POST | `/api/v1/auth/resend-verification` | Resend verification email |
| POST | `/api/v1/auth/forgot-password` | Send password reset email |
| POST | `/api/v1/auth/reset-password` | Reset password with token |

-----

## Environment Variables

See `.env.saas.example` for the SaaS deployment template.

**CRITICAL security rules [SAAS]:**
- XMiL's `ENCRYPTION_KEY` stays on their deployment ONLY
- XMiL's `DATABASE_URL` is NEVER referenced in any saas branch env file
- Create a separate Railway project for the SaaS instance
- All new env vars documented in `backend/.env.saas.example`

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/automation_db
REDIS_URL=redis://localhost:6379/0

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-20250514

# Security
SECRET_KEY=<random-256-bit-hex>
ENCRYPTION_KEY=<random-256-bit-hex>  # NEW key for SaaS — never reuse XMiL key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30

# Stripe [SAAS]
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...

# SaaS URLs [SAAS]
APP_URL=https://app.yoursaas.com
MARKETING_URL=https://yoursaas.com

# Budget safety [SAAS]
MONTHLY_BUDGET_THRESHOLD=500.0

# MCP Servers
SOCIAL_MCP_URL=http://localhost:3001
EMAIL_MCP_URL=http://localhost:3002
CRM_MCP_URL=http://localhost:3003
MCP_AUTH_TOKEN=<shared-bearer-token>
```

-----

## [SAAS] Marketing Landing Page (`saas-landing/`)

Astro static site deployed to `yoursaas.com`. App lives at `app.yoursaas.com`.

```
saas-landing/
  astro.config.mjs          → Astro + React islands + Tailwind
  tailwind.config.ts        → same design tokens as dashboard
  src/
    layouts/Layout.astro    → HTML shell, OG tags, scroll-reveal observer
    pages/
      index.astro           → Hero, stats, features, LandscapeTrack, CTA
      pricing.astro         → PricingCards + FAQ accordion
    components/
      HeroScatter.tsx       → Three.js 1,800-point amber scatter (React island)
      LandscapeTrack.tsx    → Framer Motion horizontal scroll (React island)
      PricingCards.tsx      → 4-plan grid with Stripe checkout links (React island)
    styles/global.css       → Tailwind + Google Fonts import
```

Design constraints (same as dashboard):
- NEVER white backgrounds, NEVER purple gradients, NEVER `rounded-xl`
- Amber `#F59E0B` sole accent
- Syne (display) / DM Sans (body) / DM Mono (mono)

-----

## Common Mistakes to Avoid

- Do NOT use `session.query()` — SQLAlchemy 2.0 `select()` only
- Do NOT store credentials in plain text
- Do NOT call Claude API without brand voice in system prompt
- Do NOT skip injection scanning — including assistant messages [SAAS]
- Do NOT skip DLP scanning — including streaming chunks [SAAS]
- Do NOT use synchronous `requests` — use `httpx` async
- Do NOT call Stripe SDK directly in async code — wrap in `asyncio.to_thread()` [SAAS]
- Do NOT store XMiL's ENCRYPTION_KEY or DATABASE_URL in saas branch [SAAS]
- Do NOT return HTTP 402 without `{"code": "quota_exceeded", "upgrade_url": ...}` [SAAS]
- Do NOT log sensitive fields (tokens, passwords, PII)
