# $100M AI Sales Team — Project Status

> Generated: 2026-06-06  
> Branch: `claude/create-claude-md-BdFZz`  
> Commit: `e9bbec2`  
> Tests: **81/81 passing** | Build: **clean** | Security: **11/11 checks**

---

## 1. COMPLETED PHASES

### Phase 1 — Project Bootstrap
- **Files created:** `next.config.ts`, `tsconfig.json` (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes), `proxy.ts` (middleware), `vitest.config.ts`, `eslint.config.mjs`, `.env.local.example`, `.gitignore`, `vercel.json`
- **Features:** Next.js 16.2.7 App Router, TypeScript strict mode, security headers (X-Frame-Options, X-Content-Type-Options, CSP, Referrer-Policy, Permissions-Policy), Cloudflare Turnstile integration, Vercel cron config

### Phase 2 — Database Schema
- **Files created:** `prisma/schema.prisma`, `prisma/migrations/001_rls_policies.sql`, `prisma/seed.ts`, `lib/prisma.ts`, `scripts/audit-rls.sql`
- **Models:** User, Analysis, Subscription, Team, AuditLog, Account, Session, VerificationToken, SecurityScanResult
- **Note:** No migrations directory used — dev workflow is `prisma db push`; `001_rls_policies.sql` is a manual Supabase RLS file

### Phase 3 — Authentication
- **Files created:** `lib/auth.ts`, `types/next-auth.d.ts`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `app/api/auth/[...nextauth]/route.ts`, `app/api/auth/verify-turnstile/route.ts`, `components/auth/AuthForm.tsx`
- **Features:** NextAuth v5 beta, PrismaAdapter, Google OAuth + email magic links, JWT with tier/analysisCount, Cloudflare Turnstile on signup, session includes `user.id`, `user.tier`, `user.analysisCount`, `user.stripeCustomerId`
- **Deviation:** Uses `auth()` from NextAuth v5 (not `getServerSession`) throughout

### Phase 4 — AI Analysis Engine
- **Files created:** `lib/ai.ts`, `lib/ratelimit.ts`, `lib/schemas.ts`, `lib/audit.ts`, `app/api/analyze/route.ts`, `__tests__/analyze-route.test.ts`, `__tests__/analyze-security.test.ts`
- **Features:** Anthropic SDK (model: `claude-sonnet-4-20250514`), SSE streaming via `messages.stream()`, 8-framework JSON output, FREE tier 402 gate, per-tier sliding window rate limiting via Upstash, audit log on every analysis
- **Tier limits:** FREE 3/day · SOLO 50/day · PRO/AGENCY/ENTERPRISE unlimited

### Phase 5 — Stripe Billing
- **Files created:** `lib/stripe.ts`, `app/api/checkout/route.ts`, `app/api/webhooks/stripe/route.ts`, `app/api/billing/portal/route.ts`, `hooks/useSubscription.ts`, `scripts/setup-stripe.ts`
- **Features:** Stripe Checkout sessions, webhook verification (`stripe.webhooks.constructEvent`), Customer Portal, subscription lifecycle events (created/updated/deleted/payment_failed), tier sync on webhook

### Phase 6 — AI Assistant
- **Files created:** `app/api/assistant/route.ts`, `components/assistant/AssistantPanel.tsx`, `components/assistant/MessageBubble.tsx`
- **Features:** Streaming coaching chatbot, last 5 analyses as context, sessionStorage persistence, upgrade CTA for FREE users, poisoned-history sanitization

### Phase 7 — Dashboard + Streaming UI
- **Files created:** `app/(dashboard)/analyze/page.tsx`, `app/(dashboard)/history/page.tsx`, `app/(dashboard)/layout.tsx`, `app/(dashboard)/playbooks/page.tsx`, `app/(dashboard)/settings/page.tsx`, `components/analysis/AnalysisInput.tsx`, `components/analysis/StreamingResult.tsx`, `components/analysis/FrameworkCard.tsx`, `components/analysis/HistoryList.tsx`, `components/billing/UpgradeModal.tsx`, `components/billing/PricingTable.tsx`, `components/settings/BillingSection.tsx`
- **Features:** Token-by-token SSE rendering, 8 accordion FrameworkCards (one per expert), UpgradeModal inside StreamingResult (Brunson OTO), analysis history with search, Stripe Customer Portal access

### Phase 8 — Mobile PWA
- **Files created:** `public/manifest.json`, `public/sw.js`, `public/icons/icon-192.png`, `public/icons/icon-512.png`, `components/mobile/BottomNav.tsx`, `components/pwa/InstallPrompt.tsx`, `components/PWARegister.tsx`, `scripts/generate-icons.ts`
- **Features:** `next-pwa` config, `viewport-fit=cover`, safe-area-inset-bottom, haptic feedback, BottomNav (hidden md+), install prompt, offline caching

### Phase 9 — Shareable Analysis Cards
- **Files created:** `app/share/[shareToken]/page.tsx`, `app/api/og/[shareToken]/route.tsx`, `app/api/analyses/[id]/share/route.ts`, `components/analysis/ShareCard.tsx`
- **Features:** Public `/share/[shareToken]` route (no auth), `@vercel/og` dynamic OG images, share toggle API, shareToken auto-set on Analysis creation, clipboard copy

### Phase 10 — Email Automation
- **Files created:** `app/api/email/sequence/route.ts`, `app/api/email/send/route.ts`, `app/api/unsubscribe/route.ts`, `lib/email.ts`, `emails/WelcomeEmail.tsx`, `emails/CaseStudyEmail.tsx`, `emails/FrameworkSpotlightEmail.tsx`, `emails/UpgradeNudgeEmail.tsx`, `emails/FinalNudgeEmail.tsx`, `emails/welcome.tsx`, `emails/story.tsx`, `emails/objection.tsx`, `emails/proof.tsx`, `emails/urgency.tsx`, `emails/weekly-digest.tsx`
- **Features:** 5-email Soap Opera Sequence via QStash (Days 0/1/3/5/7), React Email templates, Resend delivery, one-click unsubscribe, weekly digest cron (Mondays 9am UTC via `vercel.json`)

### Phase 11 — Growth + Referral
- **Files created:** `app/r/[referralCode]/route.ts`, `app/api/referral/apply/route.ts`, `app/api/referral/stats/route.ts`, `lib/referral.ts`, `components/referral/ReferralApplier.tsx`, `components/settings/ReferralSection.tsx`
- **Features:** `/r/[code]` redirect sets cookie, referral attribution on signup, `referredById` saved to User, referral stats endpoint, dashboard referral section
- **Deviation:** 30% commission logic is not wired to Stripe Connect (Stripe Connect setup requires manual account provisioning)

### Phase 12 — Security Audit
- **Files created:** `app/api/auth/verify-turnstile/route.ts`, `scripts/audit-rls.sql`
- **Features:** Cloudflare Turnstile on signup/login, all routes follow 6-step template, ANTHROPIC_API_KEY confirmed absent from all client files, full RLS SQL written

### Security Layer — AI Security Library
- **Files created:** `lib/aiSecurity.ts`, `lib/tokenBudget.ts`, `lib/promptHardening.ts`, `__tests__/aiSecurity.test.ts`, `__tests__/analyze-security.test.ts`
- **Features:** `sanitizeInput()` — 4 blocking pattern sets (injection/probe/role/jailbreak) + PII strip (email/phone/SSN/card); `validateOutput()` — script injection throw, canary leak detection, schema validation, off-topic detection; token budget per tier (Redis daily counter)

### Security Layer — Route Integration
- **Files modified:** `app/api/analyze/route.ts`, `app/api/assistant/route.ts`
- **Features:** `sanitizeInput` + `validateOutput` wired into both AI routes, poisoned-history sanitization in assistant, `AISecurityError` caught and returned as 400

### Security Layer — Anomaly Detection
- **Files created:** `lib/anomalyDetection.ts`, `app/(dashboard)/admin/security/page.tsx`, `__tests__/anomaly.test.ts`
- **Features:** 4 signals (rapid requests ≥10/60s, security violations ≥3/hr, IP volume ≥50/hr, multi-account ≥5 users/IP/day), per-user block list, 2s delay on flagged requests, admin dashboard with event bar chart + security/anomaly tables

### Security Layer — System Prompt Hardening
- **Files modified:** `lib/ai.ts`, `lib/promptHardening.ts`, `lib/aiSecurity.ts`, `app/api/assistant/route.ts`
- **Files created:** `lib/systemPromptAudit.ts`, `__tests__/promptHardening.test.ts`
- **Features:** 5 hardening techniques in `ANALYSIS_SYSTEM_PROMPT` (instruction hierarchy, scope boundary, output format lock, multi-turn attack resistance, canary token); `CANARY` = `analysis_canary_` + 8-byte random hex; 10-check audit function scoring 0–10

### Security Layer — Sentry Integration + Full Audit
- **Files created:** `lib/securityAlerts.ts`, `sentry.server.config.ts`, `scripts/aiSecurityAudit.ts`
- **Files modified:** `lib/aiSecurity.ts`, `lib/anomalyDetection.ts`, `next.config.ts`, `proxy.ts`, `__tests__/aiSecurity.integration.test.ts`
- **Features:** `captureSecurityEvent()` (warning) and `captureHighSeverityEvent()` (error) Sentry functions; wired on JAILBREAK_ATTEMPT, SCRIPT_INJECTION, SYSTEM_PROMPT_LEAK, REPEATED_ATTACKER; AI route-specific cache-control headers; CSP tightened to specific Anthropic/Supabase/Stripe domains; 11/11 audit script checks

### Security Layer — Static Scanner
- **Files created:** `security/scanner/static/run_static.py`, `security/scanner/static/semgrep-ai-security.yml`, `security/scanner/requirements.txt`, `security/scanner/setup.sh`, `security/scanner/.gitignore`
- **Features:** 10 custom Semgrep rules (anthropic-key-client-exposure ERROR, missing-auth-check WARNING, missing-zod-validation WARNING, raw-anthropic-call-missing-guard ERROR, direct-user-input-to-ai ERROR, missing-output-validation WARNING, idor-missing-ownership-check ERROR, audit-log-missing INFO, raw-error-to-client WARNING, console-log-sensitive WARNING); npm audit + env file security checks; venv-local semgrep binary resolution

### Security Layer — Adversarial Test Suite
- **Files created:** `security/scanner/adversarial/payloads.ts`, `security/scanner/adversarial/run_adversarial.test.ts`
- **Files modified:** `vitest.config.ts`, `package.json`, `lib/aiSecurity.ts`
- **Features:** 80+ adversarial payloads across 9 categories; 17 Vitest tests (zero real API calls); ~20 new detection patterns added to `aiSecurity.ts` covering `<|im_start|>` injection tokens, data exfiltration probes, "exact instructions" probes, expanded role/jailbreak patterns; all 17 pass

### Security Layer — Garak Live Probes
- **Files created:** `security/scanner/live/garak_config.yaml`, `security/scanner/live/run_garak.py`, `scripts/create-scanner-test-user.ts`
- **Features:** 9 OWASP LLM probes (DAN variants, prompt injection, token DoS, latent injection), 50-prompt hard budget, staging-only safety check, venv-local binary resolution, `--force-staging` escape hatch

### Security Layer — GitHub Actions CI + ZAP + Dashboard
- **Files created:** `.github/workflows/security-scan.yml`, `security/scanner/static/zap-rules.tsv`, `security/scanner/scan_all.sh`, `app/api/security/scan-results/route.ts`
- **Files modified:** `prisma/schema.prisma`, `lib/schemas.ts`, `app/(dashboard)/admin/security/page.tsx`, `package.json`, `CLAUDE.md`
- **Features:** Weekly CI (Mon 2am: static + adversarial), monthly CI (1st 3am: + ZAP + Garak), push trigger on AI security files, Sentry failure notification; ZAP FAIL rules for XSS/SQLi/missing headers; `SecurityScanResult` Prisma model; POST/GET `/api/security/scan-results` (shared-secret auth); admin dashboard Section 5 with summary cards, CSS-only 30-day timeline, expandable findings table

---

## 2. CURRENT STATE

### File Structure (`apps/sales-team/`)

```
apps/sales-team/
├── __tests__/
│   ├── aiSecurity.integration.test.ts
│   ├── aiSecurity.test.ts
│   ├── analyze-route.test.ts
│   ├── analyze-security.test.ts
│   ├── anomaly.test.ts
│   ├── auth.test.ts
│   ├── promptHardening.test.ts
│   └── webhook-stripe.test.ts
├── app/
│   ├── (auth)/login/page.tsx
│   ├── (auth)/signup/page.tsx
│   ├── (dashboard)/
│   │   ├── admin/security/page.tsx     ← security monitor + scanner results
│   │   ├── analyze/page.tsx
│   │   ├── history/page.tsx
│   │   ├── layout.tsx                  ← auth guard + sidebar
│   │   ├── playbooks/page.tsx
│   │   └── settings/page.tsx
│   ├── (marketing)/pricing/page.tsx
│   ├── api/
│   │   ├── analyses/[id]/share/route.ts
│   │   ├── analyze/route.ts            ← streaming AI analysis
│   │   ├── assistant/route.ts          ← streaming AI coach
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── auth/verify-turnstile/route.ts
│   │   ├── billing/portal/route.ts
│   │   ├── checkout/route.ts
│   │   ├── cron/weekly-digest/route.ts
│   │   ├── email/send/route.ts
│   │   ├── email/sequence/route.ts
│   │   ├── export/pdf/route.ts
│   │   ├── og/[shareToken]/route.tsx
│   │   ├── referral/apply/route.ts
│   │   ├── referral/stats/route.ts
│   │   ├── security/events/route.ts    ← admin audit log query
│   │   ├── security/scan-results/route.ts  ← CI → dashboard
│   │   ├── unsubscribe/route.ts
│   │   └── webhooks/stripe/route.ts
│   ├── r/[referralCode]/route.ts
│   ├── share/[shareToken]/page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── analysis/{AnalysisInput,FrameworkCard,HistoryList,ShareCard,StreamingResult}.tsx
│   ├── assistant/{AssistantPanel,MessageBubble}.tsx
│   ├── auth/AuthForm.tsx
│   ├── billing/{PricingTable,UpgradeModal}.tsx
│   ├── mobile/BottomNav.tsx
│   ├── pwa/InstallPrompt.tsx
│   ├── referral/ReferralApplier.tsx
│   ├── settings/{BillingSection,ReferralSection}.tsx
│   └── PWARegister.tsx
├── emails/
│   ├── WelcomeEmail.tsx, CaseStudyEmail.tsx, FrameworkSpotlightEmail.tsx
│   ├── UpgradeNudgeEmail.tsx, FinalNudgeEmail.tsx
│   └── weekly-digest.tsx, welcome.tsx, story.tsx, objection.tsx, proof.tsx, urgency.tsx
├── hooks/useSubscription.ts
├── lib/
│   ├── ai.ts              ← Anthropic client, CANARY, system prompts
│   ├── aiSecurity.ts      ← sanitizeInput, validateOutput, threat patterns
│   ├── anomalyDetection.ts
│   ├── audit.ts
│   ├── auth.ts
│   ├── email.ts
│   ├── prisma.ts
│   ├── promptHardening.ts ← buildHardenedAnalysisPrompt, PROMPT_DEFENSE_PREFIX
│   ├── ratelimit.ts       ← TIER_LIMITS, getRatelimiter
│   ├── referral.ts
│   ├── routes.ts
│   ├── schemas.ts         ← all Zod schemas
│   ├── securityAlerts.ts  ← Sentry captureSecurityEvent/captureHighSeverityEvent
│   ├── stripe.ts
│   ├── systemPromptAudit.ts
│   └── tokenBudget.ts
├── prisma/
│   ├── schema.prisma
│   ├── migrations/001_rls_policies.sql
│   └── seed.ts
├── scripts/
│   ├── aiSecurityAudit.ts         ← 11-check audit
│   ├── create-scanner-test-user.ts
│   ├── generate-icons.ts
│   └── setup-stripe.ts
├── security/scanner/
│   ├── adversarial/payloads.ts, run_adversarial.test.ts
│   ├── live/garak_config.yaml, run_garak.py
│   ├── static/run_static.py, semgrep-ai-security.yml, zap-rules.tsv
│   ├── scan_all.sh
│   ├── requirements.txt
│   └── setup.sh
├── types/next-auth.d.ts
├── proxy.ts               ← middleware (auth guard + security headers)
├── sentry.server.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── vercel.json
```

```
.github/workflows/
├── security-scan.yml      ← NEW: weekly/monthly/push-triggered scanner
├── ci.yml
├── dependabot-automerge.yml
└── frontend-ci.yml
```

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/analyze` | session | SSE streaming 8-framework analysis |
| POST | `/api/assistant` | session | SSE streaming AI coach |
| GET | `/api/auth/[...nextauth]` | — | NextAuth handlers |
| POST | `/api/auth/verify-turnstile` | — | Cloudflare bot check |
| POST | `/api/checkout` | session | Create Stripe checkout session |
| POST | `/api/billing/portal` | session | Stripe Customer Portal URL |
| POST | `/api/webhooks/stripe` | sig-verify | Stripe lifecycle events |
| GET | `/api/analyses/[id]/share` | session | Toggle share on analysis |
| POST | `/api/email/send` | internal-secret | Send transactional email |
| POST | `/api/email/sequence` | internal-secret | Schedule QStash email sequence |
| GET | `/api/cron/weekly-digest` | cron-secret | Send weekly digest (Vercel Cron) |
| GET | `/api/export/pdf` | session | Export analysis as PDF |
| GET | `/api/og/[shareToken]` | — | Dynamic OG image |
| POST | `/api/referral/apply` | session | Apply referral code |
| GET | `/api/referral/stats` | session | Referral stats |
| GET | `/api/unsubscribe` | token | Email unsubscribe |
| GET | `/api/security/events` | admin | Audit log query (last N hours) |
| POST | `/api/security/scan-results` | scanner-secret | CI scan result ingestion |
| GET | `/api/security/scan-results` | admin | Scan history for dashboard |

### Pages

| Route | Type | Description |
|-------|------|-------------|
| `/` | marketing | Landing page |
| `/pricing` | marketing | Pricing table |
| `/login` | auth | Email magic link + Google OAuth |
| `/signup` | auth | Email + name + Turnstile |
| `/analyze` | dashboard | Analysis input + streaming result |
| `/history` | dashboard | Analysis history + search |
| `/playbooks` | dashboard | Saved playbooks |
| `/settings` | dashboard | Billing + referral sections |
| `/share/[shareToken]` | public | Shareable analysis page |
| `/r/[referralCode]` | redirect | Referral attribution redirect |
| `/admin/security` | admin | Security monitor + scanner dashboard |

### Database Schema

```
User           — id(cuid), email(unique), tier(FREE), analysisCount, referralCode(unique),
                 referredById, teamId, unsubscribeToken, marketingOptOut
Analysis       — id, userId→User, offerText(Text), analysisType, result(Json),
                 shared, shareToken(unique)  @@index[userId, createdAt]
Subscription   — id, userId(unique)→User, stripeSubscriptionId(unique), stripePriceId,
                 status(ACTIVE|PAST_DUE|CANCELED|TRIALING), tier, currentPeriodEnd
Team           — id, name, ownerId(unique)→User, agencyDomain, logoUrl
AuditLog       — id, userId→User, action, metadata(Json), ipAddress
                 @@index[userId, createdAt]
SecurityScanResult — id, scanType, runId, status, findings(Json),
                 criticalCount, warnCount, passCount, triggeredBy
                 @@index[scanType,createdAt]  @@index[status,createdAt]
Account/Session/VerificationToken — NextAuth standard models
```

**Enums:** `Tier` (FREE | SOLO | PRO | AGENCY | ENTERPRISE), `SubscriptionStatus`

### Environment Variables Required

```bash
# REQUIRED — app will not start without:
DATABASE_URL                        # PostgreSQL (Supabase)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY           # server-only
NEXTAUTH_SECRET                     # openssl rand -base64 32
NEXTAUTH_URL                        # https://yourdomain.com in prod
ANTHROPIC_API_KEY                   # server-only, NEVER NEXT_PUBLIC_
STRIPE_SECRET_KEY                   # server-only
STRIPE_WEBHOOK_SECRET               # server-only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRICE_SOLO / PRO / AGENCY / ENTERPRISE  # after setup-stripe.ts
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RESEND_API_KEY
RESEND_FROM_EMAIL

# REQUIRED for specific features:
QSTASH_TOKEN                        # email sequences
QSTASH_CURRENT_SIGNING_KEY
QSTASH_NEXT_SIGNING_KEY
INTERNAL_API_SECRET                 # server-to-server calls
CRON_SECRET                         # Vercel cron auth
NEXT_PUBLIC_TURNSTILE_SITE_KEY      # Cloudflare bot protection
TURNSTILE_SECRET_KEY                # server-only
ADMIN_EMAILS                        # comma-separated, /admin/security gate
SCANNER_SECRET                      # CI scanner → /api/security/scan-results

# OPTIONAL (monitoring):
SENTRY_DSN
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
```

---

## 3. WHAT'S WORKING (Verified)

- **Build:** `npm run build` — clean, zero TypeScript errors
- **Tests:** `npm run test` — 81/81 passing across 9 test files
- **Full scan:** `npm run scan:all` — Static PASS · Adversarial 17/17 · Audit 11/11
- **Security audit:** `npm run audit:ai-security` — 11/11 checks pass
- **Prompt audit:** `npm run audit:prompts` — 10/10 checks pass
- **Static scanner:** `npm run scan:static` — Semgrep 0 errors, env checks clean
- **Adversarial suite:** `npm run scan:adversarial` — 17/17 pass (all attack categories blocked, all legitimate inputs pass)
- **ANTHROPIC_API_KEY** — confirmed absent from all client-side files
- **API route security pattern** — all routes follow auth → ratelimit → Zod → logic → audit → response
- **Canary token** — embedded in ANALYSIS_SYSTEM_PROMPT; checked O(1) before sliding-window scan

---

## 4. WHAT'S PENDING

All 12 product phases are code-complete. Remaining work is **operational/deployment**:

### Deployment Checklist (not code — external setup)
1. **Supabase** — create project, run `001_rls_policies.sql`, enable RLS, run `prisma db push`
2. **Stripe** — run `scripts/setup-stripe.ts` to create products/prices, set price env vars, configure webhook
3. **Upstash** — create Redis database, create QStash topic, copy credentials
4. **Resend** — verify domain, set `RESEND_FROM_EMAIL`
5. **Cloudflare Turnstile** — create site, set keys
6. **Sentry** — create project, get DSN
7. **Google OAuth** — create credentials in Google Cloud Console
8. **Vercel** — deploy, set all env vars, configure cron
9. **GitHub Actions secrets** — set `SCANNER_SECRET`, `STAGING_APP_URL`, `STAGING_DATABASE_URL`, `NEXTAUTH_SECRET`, `ANTHROPIC_API_KEY`, `SENTRY_DSN`

### Garak Live Scan
- Not yet run against a real endpoint — requires running staging server + `TEST_SESSION_TOKEN`
- Run: `npm run scanner:create-test-user` → create Session row → `export TEST_SESSION_TOKEN=...` → `npm run scan:live:localhost`

### Stripe Connect (Referral Commission)
- Referral attribution (cookie → User.referredById) is wired
- 30% recurring commission via Stripe Connect is **not implemented** — requires Stripe Connect platform setup and connected account onboarding flow

### Landing Page Copy
- `app/page.tsx` (marketing landing) exists but copy completeness/polish not verified

---

## 5. KNOWN ISSUES

| Issue | Location | Severity | Notes |
|-------|----------|----------|-------|
| `ADMIN_EMAILS` duplicated in `.env.local.example` | `.env.local.example` line ~56 and ~62 | Low | Minor duplicate entry; file is gitignored anyway |
| `Redis.fromEnv()` called eagerly at module load | `lib/ratelimit.ts` line 5 | Low | Unlike `tokenBudget.ts` and `anomalyDetection.ts` which use lazy init; will throw at build if UPSTASH vars absent |
| No Prisma migrations directory | `prisma/` | Low | Uses `db push` for dev; `001_rls_policies.sql` is a standalone Supabase RLS file, not a Prisma migration |
| Stripe Connect not implemented | `lib/referral.ts` | Medium | Referral tracking works; actual commission payout not wired |
| Garak probes never run live | `security/scanner/live/` | Low | All files created; requires real staging server to execute |
| `SecurityScanResult` table not migrated | `prisma/schema.prisma` | Medium | Added to schema and `prisma generate` run; needs `prisma db push` or migration on actual database |
| `app/page.tsx` landing page | `app/(marketing)/page.tsx` | Low | File exists; copy/design completeness not verified in this audit |

---

## 6. TECH STACK IN USE

From `package.json` — **confirmed installed**:

### Runtime Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.2.7 | App Router framework |
| `react` / `react-dom` | 19.2.4 | UI rendering |
| `@anthropic-ai/sdk` | ^0.100.1 | AI analysis + assistant |
| `@prisma/client` | ^7.8.0 | Database ORM |
| `prisma` | ^7.8.0 | Schema + migrations CLI |
| `@prisma/adapter-pg` | ^7.8.0 | PostgreSQL adapter |
| `next-auth` | ^5.0.0-beta.31 | Authentication |
| `@auth/prisma-adapter` | ^2.11.2 | NextAuth ↔ Prisma |
| `stripe` | ^22.2.0 | Payment processing |
| `@stripe/stripe-js` | ^9.7.0 | Stripe client |
| `@upstash/redis` | ^1.38.0 | Rate limiting + anomaly detection |
| `@upstash/ratelimit` | ^2.0.8 | Sliding window limiters |
| `@upstash/qstash` | ^2.11.0 | Scheduled email delivery |
| `resend` | ^6.12.4 | Transactional email |
| `react-email` | ^6.5.0 | Email template framework |
| `@react-email/components` | ^1.0.12 | Email components |
| `zod` | ^4.4.3 | Input/output validation |
| `@sentry/nextjs` | ^10.56.0 | Error tracking + security alerts |
| `posthog-js` | ^1.380.1 | Analytics |
| `@vercel/og` | ^0.11.1 | Dynamic OG images |
| `next-pwa` | ^5.6.0 | PWA service worker |
| `lucide-react` | ^1.17.0 | Icons |
| `tailwind-merge` | ^3.6.0 | Tailwind class merging |
| `clsx` | ^2.1.1 | Conditional classnames |
| `pg` | ^8.21.0 | PostgreSQL client |

### Dev Dependencies
| Package | Version | Purpose |
|---------|---------|---------|
| `vitest` | ^4.1.8 | Unit testing |
| `@vitejs/plugin-react` | ^6.0.2 | React support for Vitest |
| `typescript` | ^5 | Type checking |
| `eslint` | ^9 | Linting |
| `eslint-config-next` | 16.2.7 | Next.js ESLint rules |
| `tailwindcss` | ^4 | CSS framework |
| `@tailwindcss/postcss` | ^4 | PostCSS integration |
| `@types/node` / `react` / `react-dom` / `pg` | latest | Type definitions |

### Python Scanner (venv)
- `garak >=0.9.0` — live LLM red-teaming
- `semgrep >=1.45.0` — static code analysis
- `colorama >=0.4.6` — terminal colors
- `requests >=2.31.0` — HTTP client
- `jinja2 >=3.1.0` — templating

---

## 7. NPM SCRIPTS REFERENCE

```bash
npm run dev                    # Start Next.js dev server
npm run build                  # Production build (must pass before merge)
npm run start                  # Start production server
npm run lint                   # ESLint
npm run test                   # Vitest unit tests (81 tests)
npm run test:watch             # Vitest watch mode

npm run audit:prompts          # 10-check system prompt audit
npm run audit:ai-security      # 11-check AI security audit

npm run scan:setup             # Create Python venv + install scanner deps
npm run scan:static            # Semgrep + npm audit + env checks
npm run scan:adversarial       # 17 adversarial Vitest tests (no API calls)
npm run scan:adversarial:watch # Watch mode for adversarial tests
npm run scan:all               # Static + adversarial + prompt audit
npm run scan:all:upload        # Same + POST results to /admin/security

npm run scan:live              # Garak live probes (staging only, ~50 API calls)
npm run scan:live:localhost    # Garak against localhost:3000

npm run scanner:create-test-user   # Provision FREE-tier scanner account
```
