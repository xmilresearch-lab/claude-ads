# $100M AI Sales Team — Claude Code Project Context

## What This Project Is
A multi-tier SaaS that analyzes any sales offer or business challenge through 8 elite
frameworks and synthesizes a complete strategy. Positioned as an "AI Strategy Board."

Tiers: Free (3/day) → Solo $49/mo → Pro $149/mo → Agency $497/mo → Enterprise $2,497/mo
Target: $150K MRR by Month 6. Single developer build. Ship working code every day.

---

## Tech Stack
- Next.js 14.2+ (App Router ONLY — no Pages Router anywhere)
- TypeScript 5 strict mode (zero `any` tolerance)
- Supabase (PostgreSQL) + Prisma ORM
- NextAuth.js v5 + Supabase adapter
- Stripe (subscriptions + webhooks + Customer Portal)
- Anthropic SDK — model: `claude-sonnet-4-20250514`
- Upstash Redis + @upstash/ratelimit
- Resend + React Email
- Tailwind CSS
- next-pwa
- Sentry + PostHog
- Vercel deployment

---

## SECURITY NON-NEGOTIABLES — Violating these is a build failure

1. `ANTHROPIC_API_KEY` is **NEVER** prefixed with `NEXT_PUBLIC_` — server-side only, always
2. Every API route must follow this exact order with zero exceptions:
   - Step 1: Auth check (`getServerSession`) → 401 if no session
   - Step 2: Rate limit check (Upstash per-tier) → 429 if exceeded
   - Step 3: Zod input validation → 400 if invalid
   - Step 4: Business logic / DB operation
   - Step 5: Audit log write
   - Step 6: Return response
3. Row-Level Security enabled on every Supabase table — no exceptions
4. Stripe webhooks always verified with `stripe.webhooks.constructEvent()`
5. Never return internal error details to the client — log to Sentry, return generic message
6. IDOR prevention: always verify `resource.userId === session.user.id` before any data access

---

## Project File Structure
```
app/
  api/
    analyze/route.ts         # AI analysis (streaming)
    assistant/route.ts       # AI coaching chatbot
    webhooks/stripe/route.ts # Billing events
    export/pdf/route.ts      # PDF generation
    billing/portal/route.ts  # Stripe Customer Portal
  (auth)/
    login/page.tsx
    signup/page.tsx
  (dashboard)/
    layout.tsx               # Auth guard + sidebar + bottom nav
    analyze/page.tsx
    history/page.tsx
    playbooks/page.tsx
    settings/page.tsx
  (marketing)/
    page.tsx                 # Landing (Kennedy copy)
    pricing/page.tsx

components/
  analysis/
    AnalysisInput.tsx
    StreamingResult.tsx      # SSE token-by-token display
    FrameworkCard.tsx        # Accordion card per expert
    ShareCard.tsx            # OG image for viral sharing
  assistant/
    AssistantPanel.tsx       # Floating coach drawer
    MessageBubble.tsx
  billing/
    UpgradeModal.tsx         # In-result upgrade prompt (Brunson OTO)
    PricingTable.tsx
  mobile/
    BottomNav.tsx            # visible only < 768px

lib/
  ratelimit.ts               # Per-tier Upstash limiters
  schemas.ts                 # All Zod schemas (single source of truth)
  stripe.ts                  # Stripe client + helpers
  ai.ts                      # Anthropic client + system prompts
  audit.ts                   # Audit log helper

prisma/
  schema.prisma

public/
  manifest.json              # PWA
  icons/                     # 192.png, 512.png

middleware.ts                # Edge: auth guard + security headers
```

---

## Database Schema (Prisma)
Core models: User, Analysis, Subscription, Team, AuditLog

**Tier enum:** FREE | SOLO | PRO | AGENCY | ENTERPRISE

**Key relationships:**
- User hasMany Analysis
- User hasOne Subscription
- User belongsTo Team (optional, Agency+)
- All mutations write to AuditLog

**Naming conventions:**
- Tables: PascalCase (Prisma model names)
- Fields: camelCase
- All IDs: `cuid()` not `uuid()` (shorter, URL-safe)
- All timestamps: `createdAt`, `updatedAt` on every model

---

## API Route Template (use this pattern on every route)
```typescript
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRatelimiter } from '@/lib/ratelimit'
import { yourSchema } from '@/lib/schemas'
import { writeAuditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const limiter = getRatelimiter(session.user.tier)
  const { success } = await limiter.limit(`action:${session.user.id}`)
  if (!success) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })

  const parsed = yourSchema.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const result = await prisma.resource.create({ ... })
    await writeAuditLog({ userId: session.user.id, action: 'ACTION_NAME', metadata: {} })
    return Response.json(result)
  } catch (error) {
    console.error('[route] error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## Business Framework Rules (Applied to Code)

**Hormozi — Build minimum offer first**
- Do not add features until the core loop (analyze → save → upgrade) is proven
- Every feature must improve the value equation: Dream Outcome × Perceived Likelihood / Time × Effort
- Ship the core offer in week 2. Everything else is backend.

**Brunson — Every screen is a funnel step**
- The UpgradeModal lives INSIDE StreamingResult.tsx, shown after free analysis completes
- The OTO (one-time offer) triggers on the signup confirmation page
- Upgrade CTA copy: benefit-first, always. Never feature-first.

**Belfort — Pre-handle the "is it secure?" objection in the UI**
- Show a "Your data is private & isolated" badge on the analysis input screen
- Security copy lives above the fold on the pricing page

**Kennedy — Copy on every screen must pass the "So what?" test**
- Button text: "Analyze My Offer" not "Submit"
- Empty states: "Run your first analysis — it takes 90 seconds" not "No analyses yet"
- Upgrade modal headline: "Unlock unlimited strategies" not "Upgrade to Pro"

**GaryVee — Shareability is a feature, not an afterthought**
- Every Analysis has a `shareToken` (cuid) from creation
- `/share/[shareToken]` is a public route requiring zero auth
- OG image is generated at `/api/og/[shareToken]` using @vercel/og

**Cardone — Ship daily. No perfect.**
- If a feature works but isn't polished, ship it behind a feature flag
- Merge to main every day. Vercel preview = daily proof of progress.

**Godin — The product must feel remarkable at first touch**
- Streaming AI response (token-by-token) is the remarkable moment
- Prioritize the StreamingResult component UX above all other frontend work
- The first analysis must complete and feel fast — target < 8 seconds end-to-end

**Robbins — Standards, not goals**
- Every PR must pass: TypeScript strict check + ESLint + unit tests for new routes
- No PR merges with a skipped security step (auth, rate limit, Zod)
- CI/CD enforces this — it is not optional

---

## Common Commands
```bash
# Development
npm run dev                        # Start Next.js dev server
npx prisma studio                  # Visual DB browser
npx prisma db push                 # Push schema changes (dev only)
npx prisma migrate dev --name xxx  # Create migration (staging/prod)
npx prisma generate                # Regenerate Prisma client after schema change

# Stripe local testing
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed

# Database
npx prisma db seed                 # Seed development data
npx supabase gen types typescript  # Regenerate Supabase TypeScript types

# Testing
npm run test                       # Vitest unit tests
npm run test:e2e                   # Playwright end-to-end
npm run lint                       # ESLint + TypeScript check

# Build validation
npm run build                      # Must pass before any merge
```

---

## Environment Variables Reference
```
# Required — dev will not start without these:
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY       # server-only
NEXTAUTH_SECRET
NEXTAUTH_URL
ANTHROPIC_API_KEY               # server-only, NEVER NEXT_PUBLIC_
STRIPE_SECRET_KEY               # server-only
STRIPE_WEBHOOK_SECRET           # server-only
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RESEND_API_KEY

# Optional — add before launch:
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
SENTRY_DSN
NEXT_PUBLIC_POSTHOG_KEY
```

---

## What Claude Code Should Never Do
- Never use `any` type — use `unknown` and narrow with Zod
- Never put Anthropic/Stripe/Supabase service role calls in client components
- Never skip the auth check "just for testing" — use test user sessions
- Never return raw Prisma errors to the client
- Never create a Supabase table without RLS enabled
- Never use `useEffect` for data fetching — use React Server Components or SWR
- Never hardcode tier limits — always read from `TIER_LIMITS` in `lib/ratelimit.ts`
- Never add a feature that breaks the mobile bottom nav layout

---

## Tier Limits (Single Source of Truth)
```typescript
// lib/ratelimit.ts — never duplicate these values elsewhere
export const TIER_LIMITS = {
  FREE:       { analysesPerDay: 3,     apiCallsPerMonth: 0     },
  SOLO:       { analysesPerDay: 50,    apiCallsPerMonth: 0     },
  PRO:        { analysesPerDay: 99999, apiCallsPerMonth: 500   },
  AGENCY:     { analysesPerDay: 99999, apiCallsPerMonth: 5000  },
  ENTERPRISE: { analysesPerDay: 99999, apiCallsPerMonth: 99999 },
}
```

---

## PR Checklist (Every Merge)
- [ ] Auth check present on all new API routes
- [ ] Rate limit check present on all AI-touching routes
- [ ] Zod validation on all request bodies
- [ ] No `ANTHROPIC_API_KEY` or service role keys referenced client-side
- [ ] Audit log written for all mutations
- [ ] TypeScript: zero `any`, zero type errors
- [ ] New DB table: RLS policy written and tested
- [ ] Mobile: tested at 375px viewport width
- [ ] `npm run build` passes locally before push

---

## Prompt 1 — Master Initialization Prompt

Run this once, in a fresh Claude Code session, inside the empty project directory.
After this runs, `CLAUDE.md` carries all context permanently.

```
You are about to build the $100M AI Sales Team — a production SaaS that analyzes
any sales offer through 8 expert frameworks (Hormozi, GaryVee, Cardone, Belfort,
Kennedy, Brunson, Godin, Robbins) and synthesizes an integrated strategy. This is
a real product going to market. Build it like one.

────────────────────────────────────────
STEP 1 — BOOTSTRAP THE PROJECT
────────────────────────────────────────
1. Run: npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"

2. Install all dependencies in one command:
npm install @anthropic-ai/sdk @prisma/client prisma next-auth @auth/prisma-adapter
stripe @stripe/stripe-js @upstash/redis @upstash/ratelimit resend react-email
@react-email/components next-pwa @sentry/nextjs posthog-js zod
@vercel/og react-pdf lucide-react clsx tailwind-merge

npm install -D @types/node vitest @vitejs/plugin-react

3. Create tsconfig.json with strict: true, noUncheckedIndexedAccess: true,
   exactOptionalPropertyTypes: true

4. Create .env.local.example with every variable from the Environment Variables
   section of CLAUDE.md — values empty, comments explaining each one

5. Create .gitignore that includes .env.local

6. Create the complete folder structure from the Project Structure section of CLAUDE.md —
   every directory and file listed, each file with a one-line comment describing its purpose

7. Create middleware.ts that:
   - Protects all /dashboard/* routes (redirect to /login if no session)
   - Protects /api/analyze, /api/assistant, /api/checkout, /api/billing/* routes
   - Sets these security headers on every response:
     X-Frame-Options: DENY
     X-Content-Type-Options: nosniff
     Referrer-Policy: strict-origin-when-cross-origin
     Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval'
     'unsafe-inline'; connect-src 'self' *.anthropic.com *.supabase.co *.stripe.com

8. Create vitest.config.ts for unit testing

9. Create .eslintrc.json with TypeScript rules including no-explicit-any: error

10. Run npm run build — it must pass before we proceed to any other step

When complete, confirm: CLAUDE.md exists, folder structure is in place,
build passes, and tell me what you see when you grep for NEXT_PUBLIC_
across all TypeScript files to confirm the API key pattern is safe.

────────────────────────────────────────
STEP 2 — DATABASE SCHEMA
────────────────────────────────────────
Create prisma/schema.prisma with these exact models:

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Tier {
  FREE
  SOLO
  PRO
  AGENCY
  ENTERPRISE
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  TRIALING
}

model User {
  id               String         @id @default(cuid())
  email            String         @unique
  name             String?
  image            String?
  stripeCustomerId String?        @unique
  tier             Tier           @default(FREE)
  analysisCount    Int            @default(0)
  referralCode     String         @unique @default(cuid())
  referredById     String?
  teamId           String?
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
  accounts         Account[]
  sessions         Session[]
  analyses         Analysis[]
  subscription     Subscription?
  team             Team?          @relation("TeamMembers", fields: [teamId], references: [id])
  ownedTeam        Team?          @relation("TeamOwner")
  auditLogs        AuditLog[]
}

model Analysis {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  offerText    String   @db.Text
  analysisType String
  result       Json
  shared       Boolean  @default(false)
  shareToken   String   @unique @default(cuid())
  createdAt    DateTime @default(now())
  @@index([userId, createdAt])
}

model Subscription {
  id                   String             @id @default(cuid())
  userId               String             @unique
  user                 User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  stripeSubscriptionId String             @unique
  stripePriceId        String
  status               SubscriptionStatus
  tier                 Tier
  currentPeriodEnd     DateTime
  cancelAtPeriodEnd    Boolean            @default(false)
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt
}

model Team {
  id           String   @id @default(cuid())
  name         String
  ownerId      String   @unique
  owner        User     @relation("TeamOwner", fields: [ownerId], references: [id])
  members      User[]   @relation("TeamMembers")
  agencyDomain String?
  logoUrl      String?
  createdAt    DateTime @default(now())
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  action    String
  metadata  Json     @default("{}")
  ipAddress String?
  createdAt DateTime @default(now())
  @@index([userId, createdAt])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

After the schema, generate prisma/migrations/001_rls_policies.sql:

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Analysis" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own row
CREATE POLICY "user_self_access" ON "User"
  USING (id::text = auth.uid()::text);

-- Users can only access their own analyses
CREATE POLICY "analysis_owner_access" ON "Analysis"
  USING (user_id::text = auth.uid()::text);

-- Public read for shared analyses
CREATE POLICY "analysis_public_shared" ON "Analysis"
  FOR SELECT USING (shared = true);

-- Users can only see their own subscription
CREATE POLICY "subscription_owner_access" ON "Subscription"
  USING (user_id::text = auth.uid()::text);

Create lib/prisma.ts as a singleton Prisma client.
Create prisma/seed.ts with 3 test users (FREE, PRO, AGENCY) each with 3 sample analyses.
Run: npx prisma generate. Confirm schema is valid.

────────────────────────────────────────
STEP 3 — AUTH
────────────────────────────────────────
Implement authentication:

1. lib/auth.ts — NextAuth config with:
   - PrismaAdapter from @auth/prisma-adapter
   - Providers: GoogleProvider + EmailProvider via Resend (magic links)
     + CredentialsProvider for dev testing only
   - Callbacks: session attaches user.id, user.tier, user.analysisCount;
     jwt persists tier and analysisCount
   - Pages: signIn: '/login', signOut: '/', error: '/login'

2. types/next-auth.d.ts — extend Session with user.id, user.tier (Tier),
   user.analysisCount (number), user.stripeCustomerId (string | null)

3. app/(auth)/login/page.tsx — email + "Send Magic Link" + Google OAuth button,
   success state, no password field

4. app/(auth)/signup/page.tsx — email + name, triggers Day 0 welcome email on creation

5. Update middleware.ts to use NextAuth's withAuth wrapper.
   Public routes: /, /pricing, /share/[shareToken], /login, /signup
   Protected: /dashboard/*, /api/* except /api/webhooks/*

6. app/(dashboard)/layout.tsx — server component, getServerSession, redirects to /login
   if no session, renders sidebar (desktop) + BottomNav import (mobile)

Write a unit test confirming middleware redirects /dashboard/analyze → /login
when unauthenticated.

────────────────────────────────────────
STEP 4 — AI ANALYSIS ENGINE
────────────────────────────────────────
Build the core AI analysis system:

1. lib/ai.ts:
   - Client: new Anthropic() — ANTHROPIC_API_KEY server-side env, never NEXT_PUBLIC_
   - ANALYSIS_SYSTEM_PROMPT: 8-framework analysis returning strict JSON:
     { frameworks: [{name, focus, insight, improvements: string[], metric}],
       synthesis: {overview, immediateActions: string[], executiveSummary} }
   - ASSISTANT_SYSTEM_PROMPT: coaching mode, references user history,
     under 150 words unless asked, suggests upgrades contextually

2. lib/ratelimit.ts — Upstash sliding window limiters per tier (values from CLAUDE.md)

3. lib/schemas.ts:
   - analyzeSchema: { offerText: z.string().min(10).max(5000).trim(),
     analysisType: z.enum(['offer', 'problem', 'challenge']) }
   - assistantSchema: { message: z.string().min(1).max(500).trim(),
     conversationHistory: z.array(...).max(20) }

4. lib/audit.ts — writeAuditLog helper

5. app/api/analyze/route.ts — follow the API route template from CLAUDE.md exactly:
   - If FREE user at limit (analysisCount >= 3): return 402 before Anthropic call
   - Stream via client.messages.stream(), Content-Type: text/event-stream
   - On completion: parse JSON, save Analysis (shareToken auto-set), increment
     user.analysisCount, write audit log

6. Unit tests:
   - 401 when no session
   - 429 when rate limit exceeded (mock Upstash)
   - 402 when FREE user at limit
   - Grep confirms ANTHROPIC_API_KEY absent from app/, components/, hooks/

────────────────────────────────────────
STEP 5 — STRIPE BILLING
────────────────────────────────────────
Complete Stripe subscription infrastructure:

1. lib/stripe.ts — Stripe client (server-only), price ID → Tier map,
   getOrCreateStripeCustomer() helper

2. app/api/checkout/route.ts — follows API route template:
   Accepts { priceId }, creates Checkout Session (mode: subscription,
   success_url: /dashboard/analyze?upgraded=true, metadata: { userId }),
   returns { url }

3. app/api/webhooks/stripe/route.ts — NO auth, NO rate limit, but MUST verify first:
   const event = stripe.webhooks.constructEvent(await req.text(), sig, STRIPE_WEBHOOK_SECRET)
   Handle: checkout.session.completed, customer.subscription.updated,
   customer.subscription.deleted, invoice.payment_failed
   Each handler writes to AuditLog.

4. app/api/billing/portal/route.ts — Stripe Customer Portal session URL → { url }

5. hooks/useSubscription.ts — reads tier, analysisCount from useSession(),
   returns { tier, analysisCount, isAtLimit, canUseAPI, upgradeUrl }

6. scripts/setup-stripe.ts — creates 4 Stripe products + prices, logs price IDs

7. Test: webhook handler throws on invalid signature.

After Step 5: run npm run build. If it passes, commit:
"feat: core loop complete — auth, AI analysis, billing all working"

────────────────────────────────────────
REMAINING PHASES (execute in order, one session each)
────────────────────────────────────────
PHASE 6 — AI ASSISTANT:
app/api/assistant/route.ts (streaming coach, last 5 analyses as context) +
components/assistant/AssistantPanel.tsx (drawer desktop, bottom sheet mobile,
sessionStorage, upgrade CTA for FREE).

PHASE 7 — DASHBOARD + STREAMING UI:
Analyze page with token-by-token streaming, 8 FrameworkCard accordions,
UpgradeModal inside StreamingResult (Brunson rule — never on pricing page),
history page with search and share button.

PHASE 8 — MOBILE PWA:
next-pwa config, manifest.json, BottomNav (md:hidden, safe-area-inset-bottom,
haptic feedback), viewport-fit=cover, Lighthouse PWA ≥ 90.

PHASE 9 — SHAREABLE ANALYSIS CARDS:
/share/[shareToken] public page, /api/og/[shareToken] OG image (@vercel/og),
share button copies URL to clipboard.

PHASE 10 — EMAIL AUTOMATION:
5-email Soap Opera Sequence via Resend + QStash (Day 0/1/3/5/7).
All subject lines pass the "So what?" test.

PHASE 11 — GROWTH + REFERRAL:
/r/[code] → signup with cookie, 30% recurring commission via Stripe,
referral dashboard, weekly digest cron via QStash.

PHASE 12 — SECURITY AUDIT:
Grep ANTHROPIC_API_KEY (zero client-side hits), verify all routes follow the
6-step template, RLS second-user test, Cloudflare Turnstile on signup,
npm run build with zero warnings.

────────────────────────────────────────
BEGIN NOW
────────────────────────────────────────
Start with STEP 1 and proceed through STEP 5 sequentially.
Do not skip steps. Run npm run build after every step before continuing.
Ask me nothing — you have everything you need in this prompt and in CLAUDE.md.
Start executing.
```

---

## Prompt 2 — Daily Session Starter

Paste this at the top of every Claude Code session after the initial build.

```
Read CLAUDE.md now. Confirm you understand the security non-negotiables,
the API route template, and the tier limits before doing anything else.

Current build status: [WHERE YOU ARE — e.g. "Phase 5 complete,
Stripe webhooks working, about to start Phase 6 — AI Assistant"]

Today's session goal: [ONE THING — e.g. "Build the AI Assistant panel
and its API route"]

Before writing any code:
1. State which CLAUDE.md security rules apply to today's work
2. Identify the exact files you'll create or modify
3. Flag any risks or decisions I should weigh in on

Then execute. After each file is created or modified, run the relevant
test or npm run build to confirm nothing is broken before moving to the
next file. End the session with a git commit and tell me exactly what
was completed and what the next session should start with.
```
