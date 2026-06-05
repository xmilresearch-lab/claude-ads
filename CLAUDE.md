# $100M AI Sales Team — Claude Code Project Context

## What This Project Is
A multi-tier SaaS that analyzes any sales offer or business challenge through
8 elite frameworks (Hormozi, GaryVee, Cardone, Belfort, Kennedy, Brunson, Godin,
Robbins) and synthesizes a complete strategy. The product is positioned as an
"AI Strategy Board" — not another AI tool.

Tiers: Free (3/day) → Solo $49 → Pro $149 → Agency $497 → Enterprise $2,497/mo
Target: $150K MRR by Month 6. Tiny team build. Ship daily.

---

## Tech Stack (exact versions)
- **Framework:** Next.js 14.2+ (App Router only — no Pages Router)
- **Language:** TypeScript 5 (strict mode, no `any`)
- **Database:** Supabase (PostgreSQL) via Prisma ORM
- **Auth:** NextAuth.js v5 + Supabase adapter
- **Payments:** Stripe (subscriptions + webhooks + Customer Portal)
- **AI:** @anthropic-ai/sdk — model: `claude-sonnet-4-20250514`
- **Rate Limiting:** @upstash/ratelimit + @upstash/redis
- **Email:** Resend + React Email
- **Validation:** Zod (all API inputs, no exceptions)
- **Styling:** Tailwind CSS
- **PWA:** next-pwa
- **Monitoring:** Sentry + PostHog
- **Deployment:** Vercel

---

## ⚠️ SECURITY NON-NEGOTIABLES — Never Violate These

1. **ANTHROPIC_API_KEY is NEVER prefixed with NEXT_PUBLIC_**
   - All Anthropic calls happen in `app/api/` routes or server actions only
   - If you see this key used client-side: STOP and refactor

2. **Every API route follows this exact order — no exceptions:**
   1. Authenticate — verify session via `auth()` from NextAuth; return 401 if missing
   2. Authorize — check the user's plan tier against the required tier for the operation
   3. Rate-limit — call `checkRateLimit(userId, tier)` before any business logic; return 429 if exceeded
   4. Validate — parse the request body with the route's Zod schema; return 400 on failure
   5. Execute — run business logic / call Claude API
   6. Respond — return a typed `ApiResponse<T>` envelope; never leak stack traces

3. **Row-Level Security on every Supabase table**
   - Never query Supabase without RLS enabled
   - Always verify a user can only access their own rows
   - Test RLS by querying as a second user in development

4. **Stripe webhook signature verification is mandatory**
   - Always use `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`
   - Never trust webhook body without verifying the signature first

5. **Never expose internal error messages to the client**
   - Log full errors to Sentry server-side
   - Return generic `{ error: 'Internal server error' }` to client

6. **IDOR prevention: always verify resource ownership**
   - Before any DB read/write: confirm `resource.userId === session.user.id`
   - Do not rely solely on RLS — defense in depth

7. **No secrets in `NEXT_PUBLIC_` env vars, git history, or logs**
   - Use `console.error(err.message)` — never log full error objects that may contain keys/tokens

---

## Project File Structure

```
app/
  (auth)/
    sign-in/page.tsx          → Sign-in form (email + password)
    sign-up/page.tsx          → Registration + plan selection
    forgot-password/page.tsx  → Password reset request
    reset-password/page.tsx   → Token-gated reset form
  (dashboard)/
    layout.tsx                → Auth guard + sidebar shell
    analyze/
      page.tsx                → Offer input form
      loading.tsx             → Skeleton while analysis runs
    results/
      [id]/
        page.tsx              → Full analysis result (server component)
        loading.tsx
    history/page.tsx          → Paginated past analyses
    settings/
      page.tsx                → Account + notification prefs
      billing/page.tsx        → Plan, invoices, Customer Portal link
  api/
    analyze/route.ts          → POST — auth → rate-limit → validate → Claude
    frameworks/route.ts       → GET — list available frameworks for user's tier
    webhooks/
      stripe/route.ts         → POST — signature verify → handle event
    auth/[...nextauth]/route.ts → NextAuth handler
  layout.tsx                  → Root layout (fonts, Providers, Sentry)
  page.tsx                    → Marketing landing page
  error.tsx                   → Root error boundary
  not-found.tsx

components/
  ui/                         → shadcn/ui primitives — never edit directly
  analysis/
    AnalysisForm.tsx          → "use client" — offer textarea + framework picker
    FrameworkCard.tsx         → Single framework result panel
    StrategyPanel.tsx         → Synthesized cross-framework strategy
    AnalysisSkeleton.tsx
  billing/
    PlanBadge.tsx             → Inline tier label
    UpgradeModal.tsx          → "use client" — upgrade CTA with Stripe redirect
    UsageBar.tsx              → Daily analyses used / limit
  layout/
    Navbar.tsx
    Sidebar.tsx
    Footer.tsx
  providers/
    index.tsx                 → SessionProvider + PostHogProvider + ThemeProvider

lib/
  anthropic.ts                → Claude client singleton + analyzeOffer()
  prisma.ts                   → Prisma client singleton (singleton pattern)
  stripe.ts                   → Stripe client singleton + plan helpers
  ratelimit.ts                → checkRateLimit(userId, tier) factory
  auth.ts                     → NextAuth config (adapters, callbacks, providers)
  frameworks/
    index.ts                  → buildSystemPrompt(frameworks, offer)
    hormozi.ts
    garyvee.ts
    cardone.ts
    belfort.ts
    kennedy.ts
    brunson.ts
    godin.ts
    robbins.ts
  schemas/
    offer.ts                  → AnalyzeRequestSchema (Zod)
    analysis.ts               → AnalysisResultSchema (Zod) — validates Claude output
    webhook.ts                → StripeEventSchema (Zod)
    user.ts                   → UserSchema, PlanEnum
  utils/
    cn.ts                     → clsx + tailwind-merge helper
    format.ts                 → formatCurrency(), formatDate(), truncate()
    errors.ts                 → toClientError() — strips internals before send

prisma/
  schema.prisma               → Single source of truth for DB schema
  migrations/                 → Never edit manually — use `prisma migrate dev`

emails/
  AnalysisReady.tsx           → React Email — result ready notification
  WelcomeEmail.tsx            → Onboarding email
  UpgradeConfirmation.tsx

middleware.ts                 → Next.js middleware — protect /dashboard/* routes
next.config.ts                → next-pwa, security headers, image domains
tailwind.config.ts
```

---

## Database Models (Quick Reference)

| Model        | Key Fields                                                                    |
|--------------|-------------------------------------------------------------------------------|
| User         | id, email, name, plan, analysesUsed, analysesLimit, stripeCustomerId          |
| Analysis     | id, userId, offerText, challenge, frameworks (String[]), result (Json), status |
| Subscription | id, userId, stripeSubId, plan, status, currentPeriodEnd                       |
| UsageLog     | id, userId, action, tokensUsed, createdAt                                     |

---

## Plan Tiers & Limits

| Tier       | Price/mo | Analyses/day | Frameworks | Rate limit    |
|------------|----------|--------------|------------|---------------|
| free       | $0       | 3            | 3          | 3 req/day     |
| solo       | $49      | 25           | 8          | 30 req/day    |
| pro        | $149     | 100          | 8          | 150 req/day   |
| agency     | $497     | 500          | 8          | 600 req/day   |
| enterprise | $2,497   | unlimited    | 8          | 3,000 req/day |

`checkRateLimit()` in `lib/ratelimit.ts` reads the user's plan and applies the correct limit.

---

## AI Analysis Pattern

Every `/api/analyze` call follows this flow:

```
1. Auth + authorize + rate-limit + validate (see security section)
2. Load enabled framework configs from lib/frameworks/
3. Build system prompt: role + frameworks + output schema instructions
4. Call Claude API (claude-sonnet-4-20250514) with streaming disabled
5. Parse structured JSON response — validate with Zod before saving
6. Persist Analysis record + UsageLog to DB via Prisma
7. Return { analysisId, preview } — full result fetched at results/[id]
```

Claude must return **strict JSON only** — the system prompt ends with:
> "Return ONLY valid JSON matching the AnalysisResult schema. No prose, no markdown fences."

---

## The 8 Frameworks

| Key      | Expert          | Focus                                       |
|----------|-----------------|---------------------------------------------|
| hormozi  | Alex Hormozi    | Offer value stacking, GRAND SLAM offer      |
| garyvee  | Gary Vaynerchuk | Attention arbitrage, platform-native content|
| cardone  | Grant Cardone   | 10X thinking, pipeline volume               |
| belfort  | Jordan Belfort  | Straight Line Persuasion, tonality, objections |
| kennedy  | Dan Kennedy     | Direct response, copywriting, list hygiene  |
| brunson  | Russell Brunson | Funnel architecture, hook/story/offer       |
| godin    | Seth Godin      | Permission marketing, tribe building        |
| robbins  | Tony Robbins    | State management, limiting beliefs, RPM     |

Each framework file exports `buildFrameworkPrompt(offer: string): string`.

---

## Key Commands

```bash
# Install dependencies
npm install

# Dev server
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint

# DB migrations
npx prisma migrate dev --name <description>
npx prisma generate          # regenerate client after schema change
npx prisma studio            # visual DB browser

# Run tests
npm test
npm run test:e2e

# Build
npm run build
```

---

## Environment Variables

```bash
# Auth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<random-256-bit-hex>

# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...   # Supabase direct connection for migrations

# AI
ANTHROPIC_API_KEY=sk-ant-...  # NEVER prefix with NEXT_PUBLIC_

# Payments
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...

# Rate limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Email
RESEND_API_KEY=re_...

# Monitoring
NEXT_PUBLIC_SENTRY_DSN=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=
```

---

## Coding Standards

- **No `any`** — use `unknown` and narrow, or define a proper type
- **Zod first** — every external input (API body, env var, webhook payload) is parsed with Zod before use
- **Server Components by default** — only add `"use client"` when you need interactivity or browser APIs
- **`cn()` for class merging** — never concatenate Tailwind strings manually
- **Prisma transactions** — any write that touches >1 table uses `prisma.$transaction()`
- **Error boundaries** — every page group has an `error.tsx`; never let unhandled errors reach the user
- **No `console.log` in committed code** — use Sentry for errors, PostHog for events

---

## Common Mistakes to Avoid

- Do NOT expose `ANTHROPIC_API_KEY` — it stays server-side only
- Do NOT call Claude from a Client Component — use a Server Action or API route
- Do NOT skip Zod validation on any user-supplied field
- Do NOT use `prisma.user.findUnique()` without `.select()` — never return `hashedPassword` in a response
- Do NOT create Stripe customers manually — let the subscription webhook handle it
- Do NOT use the Pages Router — this project is 100% App Router
- Do NOT import from `lib/prisma` in Client Components — it will leak the DB URL
