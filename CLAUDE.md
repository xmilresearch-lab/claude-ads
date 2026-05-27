# AI Automation Platform — Backend

> Automate Everything: Social Media · Email & Support · CRM

-----

## Project Overview

A multi-tenant AI automation platform that uses Claude as its AI engine and MCP servers
to automate social media posting, email campaigns, customer support replies, and CRM updates.
Users connect their accounts (Twitter, LinkedIn, Gmail, HubSpot, etc.) and configure
automations that run on schedules or webhooks.

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
|Infra (dev)  |Docker + Docker Compose                           |
|Infra (prod) |Railway or Render                                 |

-----

## Project Structure

```
/backend
  /app
    /api            → FastAPI routers (one file per domain)
    /core           → config, database, security utilities
    /models         → SQLAlchemy ORM models
    /schemas        → Pydantic v2 request/response schemas
    /services       → business logic (orchestration, AI, integrations)
    /workers        → Celery task definitions
    /middleware     → security scanning, rate limiting, logging
  /mcp
    /social-mcp-server    → TypeScript MCP server (Twitter, LinkedIn, Instagram)
    /email-mcp-server     → TypeScript MCP server (Gmail, SendGrid, Zendesk)
    /crm-mcp-server       → TypeScript MCP server (HubSpot, Salesforce)
  /migrations       → Alembic DB migrations
  /tests
    /unit
    /integration
    /mcp-evals      → XML evaluation files per MCP server
  docker-compose.yml
  .env.example
  alembic.ini
```

-----

## Key Commands

```bash
# Start all services (API + DB + Redis + Celery + MCP servers)
docker compose up

# Run database migrations
alembic upgrade head

# Generate a new migration
alembic revision --autogenerate -m "description"

# Run Python test suite
pytest tests/ -v --cov=app

# Start Celery worker
celery -A app.workers.celery_app worker --loglevel=info

# Build all MCP servers
cd mcp/social-mcp-server && npm run build
cd mcp/email-mcp-server && npm run build
cd mcp/crm-mcp-server && npm run build

# Inspect an MCP server (testing)
npx @modelcontextprotocol/inspector http://localhost:3001

# Lint Python
ruff check app/

# Type check Python
mypy app/
```

-----

## Coding Standards

### Python (FastAPI)

- **Python 3.12+** — use modern syntax (match statements, walrus operator where appropriate)
- **Type hints required** on all function signatures, including return types
- **Pydantic v2** for all request/response schemas — use `model_config`, not `class Config`
- **SQLAlchemy 2.0** style — use `select()`, `async with session` patterns
- **async/await** for ALL database calls, external API calls, and Claude API calls
- **Never use `time.sleep()`** — use `asyncio.sleep()` instead
- **Ruff** for linting, **Black** for formatting (line length: 88)
- **mypy** strict mode — no untyped `Any` without explicit comment

### TypeScript (MCP Servers)

- **TypeScript strict mode** — `"strict": true` in tsconfig
- **Zod** for all tool input schemas
- **Tool naming**: `{service}_{action}_{resource}` e.g. `social_create_post`
- **All tools** must have `readOnlyHint`, `destructiveHint`, `idempotentHint` annotations
- **Error format**: always `{ code, message, suggestion }` — actionable, never expose internals
- **Pagination**: all list tools return `{ items, has_more, next_offset, total_count }`
- **Transport**: streamable HTTP — never SSE (deprecated)

### General Rules

- **DRY** — no duplicated logic; extract shared utilities immediately
- **No credentials in code** — always use environment variables
- **Audit log everything** — every automation run, every AI call, every external API call
- **100% test coverage** on the services layer and security middleware
- **Atomic commits** — one concern per commit, present tense message

-----

## Architecture Rules (Never Break These)

1. **Security first** — ALL user-supplied content passes through `injection_scanner` before reaching Claude
1. **DLP on output** — ALL Claude-generated content passes through `dlp_scanner` before being sent to external APIs
1. **Encrypted credentials** — OAuth tokens and API keys are ALWAYS stored AES-256-GCM encrypted; never logged
1. **Brand voice injection** — EVERY Claude API call includes the workspace brand voice in the system prompt; brand voice examples are sanitized via `sanitize_example()` before prompt injection (LLM04)
1. **Audit trail** — EVERY automation run writes a record to `automation_runs` with status, result, and duration
1. **Rate limits enforced** — check workspace rate limits BEFORE queuing any automation run; API endpoints enforce per-IP/per-workspace HTTP rate limits via SlowAPI
1. **MCP servers are stateless** — no session state stored in MCP servers; all state lives in PostgreSQL
1. **Security headers** — ALL HTTP responses include HSTS, CSP, X-Frame-Options, and X-Content-Type-Options via the `add_security_headers` middleware
1. **OWASP LLM Top 10 compliance** — prompt injection (LLM01), data leakage (LLM02), supply chain (LLM03), data poisoning (LLM04), excessive agency (LLM05), tool misuse (LLM06), prompt leakage (LLM07), vector/embedding risks (LLM08 — Weaviate queries are always scoped to `workspace_id`; never query across tenants), misinformation (LLM09 — Claude is instructed to say "uncertain" rather than fabricate), overreliance (LLM10 — runs using >2 000 tokens write a `high_token_usage` audit log)
1. **No credentials in prompt** — automation `config` JSONB values are never rendered into the system prompt; only brand voice (workspace-controlled) is injected (LLM01)
1. **CVE scanning** — run `pip-audit` before every release; HIGH/CRITICAL findings block deployment

-----

## Database Models (Quick Reference)

|Model        |Key Fields                                                               |
|-------------|-------------------------------------------------------------------------|
|User         |id, email, hashed_password, plan, created_at                             |
|Workspace    |id, user_id, name, brand_voice (JSONB), settings (JSONB)                 |
|Integration  |id, workspace_id, type, credentials_encrypted, status                    |
|Automation   |id, workspace_id, name, type, config (JSONB), schedule, active           |
|AutomationRun|id, automation_id, status, result (JSONB), error, started_at, finished_at|
|ContentQueue |id, automation_id, content (JSONB), platform, scheduled_at, published_at |
|AuditLog     |id, workspace_id, action, actor, metadata (JSONB), created_at            |

-----

## API Versioning

All API routes are under `/api/v1/`. The root `/api` endpoint returns version info.

| Router         | Base Path                  |
|----------------|----------------------------|
| Auth           | `/api/v1/auth/`            |
| Automations    | `/api/v1/automations/`     |
| Content Queue  | `/api/v1/content/`         |
| Audit Logs     | `/api/v1/audit/`           |
| Workspaces     | `/api/v1/workspaces/`      |
| Integrations   | `/api/v1/integrations/`    |
| Analytics      | `/api/v1/analytics/`       |
| Webhooks       | `/webhooks/` (root — no version prefix) |

All responses are wrapped in `DataResponse[T]` or `PaginatedResponse[T]` envelopes
(defined in `app/schemas/base.py`). Error responses use the `ErrorResponse` schema.

-----

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/automation_db
REDIS_URL=redis://localhost:6379/0

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-20250514

# Security
SECRET_KEY=<random-256-bit-hex>
ENCRYPTION_KEY=<random-256-bit-hex>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30

# MCP Servers
SOCIAL_MCP_URL=http://localhost:3001
EMAIL_MCP_URL=http://localhost:3002
CRM_MCP_URL=http://localhost:3003
MCP_AUTH_TOKEN=<shared-bearer-token>

# Integration OAuth (per workspace, stored encrypted in DB)
# These are app-level credentials, not user tokens
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
```

-----

## AI Orchestration Pattern

Every automation run follows this exact flow:

```
1. Fetch automation config + workspace brand voice from DB
2. Scan trigger payload through injection_scanner middleware
3. Build Claude system prompt (include brand voice, rules, history)
4. Call Claude API with relevant MCP servers as tools
5. Scan Claude output through dlp_scanner middleware
6. Execute approved output (post, send email, update CRM)
7. Write result to automation_runs + audit_logs
8. Update content_queue if applicable
```

-----

## MCP Server Reference

|Server           |Port|Tools Count|Key Integrations              |
|-----------------|----|-----------|------------------------------|
|social-mcp-server|3001|6          |Twitter/X, LinkedIn, Instagram|
|email-mcp-server |3002|7          |Gmail, SendGrid, Zendesk      |
|crm-mcp-server   |3003|7          |HubSpot, Salesforce           |

All MCP servers require `Authorization: Bearer $MCP_AUTH_TOKEN` header.

-----

## Sprint Map

|Sprint|Focus                                                         |Status    |
|------|--------------------------------------------------------------|----------|
|1     |Project scaffold, DB models, auth system                      |✅ Done   |
|2     |Social MCP server (Twitter + LinkedIn)                        |✅ Done   |
|3     |Email & Support MCP server (Gmail + Zendesk)                  |✅ Done   |
|4     |CRM MCP server (HubSpot)                                      |✅ Done   |
|5     |AI Orchestration Engine + brand voice system                  |✅ Done   |
|6     |Celery task queue + workers                                   |✅ Done   |
|7     |Security layer: injection guard, DLP, OWASP LLM Top 10, audit |✅ Done   |
|8     |REST API endpoints + OpenAPI docs (Sections 1-4 done)        |🔄 Active |
|9     |Tests + MCP evaluations                                       |⏳ Queue  |
|10    |Docker packaging + deployment config                          |⏳ Queue  |

-----

## Common Mistakes to Avoid

- Do NOT use `session.query()` — use SQLAlchemy 2.0 `select()` style
- Do NOT store credentials in plain text — always encrypt before DB write
- Do NOT call Claude API without brand voice in system prompt
- Do NOT skip injection scanning on any user-supplied content
- Do NOT use synchronous `requests` library — use `httpx` with async
- Do NOT return raw SQLAlchemy models from API endpoints — always use Pydantic schemas
- Do NOT log sensitive fields (tokens, passwords, PII)
