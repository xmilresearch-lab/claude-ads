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
   ```
   1. Auth check (getServerSession) → 401 if missing
   2. Rate limit check (Upstash) → 429 if exceeded
   3. Zod input validation → 400 if invalid
   4. Business logic / DB query
   5. Audit log write
   6. Return response
   ```

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

## API Route Pattern (copy this every time)
```typescript
// app/api/[resource]/route.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRatelimiter } from '@/lib/ratelimit'
import { resourceSchema } from '@/lib/schemas'
import { writeAuditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  // 1. Auth
  const session = await getServerSession(authOptions)
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Rate limit
  const limiter = getRatelimiter(session.user.tier)
  const { success } = await limiter.limit(`resource:${session.user.id}`)
  if (!success) return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })

  // 3. Validate
  const parsed = resourceSchema.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    // 4. Business logic
    const result = await prisma.resource.create({ ... })

    // 5. Audit log
    await writeAuditLog({ userId: session.user.id, action: 'RESOURCE_CREATED', metadata: {} })

    return Response.json(result)
  } catch (error) {
    // Never expose internals — Sentry captures full error server-side
    console.error('[resource] error:', error)
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

## Execution Prompts (Run These in Order in Claude Code)

**Session 0 — Initialize CLAUDE.md**
```
Create the file CLAUDE.md at the project root using the content I'm about to paste.
After creating it, confirm you've read it and summarize the 5 most critical security
rules and the API route pattern I want used on every route.
```

**Session 1 — Project Bootstrap**
```
Following the tech stack in CLAUDE.md, initialize this Next.js 14 App Router project.
Install all dependencies listed. Create the folder structure exactly as specified in
the File Structure section. Generate .env.local.example with all variables from the
Environment Variables section. Create tsconfig.json with strict mode. Set up ESLint
with the TypeScript plugin. Set up Vitest for unit testing. Create a basic
middleware.ts that adds the security headers listed in the Security Non-Negotiables.
Do not create any pages yet — just the shell.
```

**Session 2 — Prisma Schema + Supabase RLS**
```
Using CLAUDE.md as context, create prisma/schema.prisma with all models: User,
Analysis, Subscription, Team, AuditLog. Follow the naming conventions in CLAUDE.md.
Include the Tier enum (FREE/SOLO/PRO/AGENCY/ENTERPRISE). After the schema, generate
the SQL migration file and write Supabase RLS policies for each table ensuring
users can only access their own rows. Write a test in tests/rls.test.ts that
creates two users and confirms User A cannot read User B's analyses. Also create
prisma/seed.ts with 3 test users (one per key tier) and sample analyses.
```

**Session 3 — Auth (NextAuth + Supabase + Google)**
```
Following the API route pattern in CLAUDE.md, implement authentication:
1. NextAuth.js v5 with Supabase adapter in lib/auth.ts
2. Providers: Google OAuth + Email magic link (Resend)
3. Session strategy: JWT with user.tier and user.id in the session object
4. middleware.ts: protect all /dashboard/* and /api/analyze /api/assistant routes
5. app/(auth)/login/page.tsx: clean login form with Google button and magic link input
6. app/(auth)/signup/page.tsx: email + name, creates Supabase user
7. Write unit tests for the auth middleware redirect logic
Confirm the ANTHROPIC_API_KEY is not referenced anywhere in this session's code.
```

**Session 4 — AI Analysis Endpoint (Streaming)**
```
Using the API route pattern from CLAUDE.md, build the streaming AI analysis endpoint:
File: app/api/analyze/route.ts

The route must follow this exact order from CLAUDE.md:
1. Auth → 2. Rate limit (use TIER_LIMITS from lib/ratelimit.ts) → 3. Zod validate
(offerText: string max 5000 chars, analysisType: enum) → 4. Anthropic streaming call
(server-side only, claude-sonnet-4-20250514) → 5. Save completed analysis to DB →
6. Write audit log

The system prompt should instruct Claude to analyze the offer through all 8 frameworks
(Hormozi, GaryVee, Cardone, Belfort, Kennedy, Brunson, Godin, Robbins) and return
structured JSON with frameworks array + synthesis object.

Return a ReadableStream with Content-Type: text/event-stream.

Also create lib/ratelimit.ts with the TIER_LIMITS from CLAUDE.md and per-tier
Upstash sliding window limiters.

Write a unit test mocking the Anthropic client that confirms the auth and rate limit
checks run before the AI call.
```

**Session 5 — Stripe Billing + Webhooks**
```
Following CLAUDE.md security rules, implement complete Stripe billing:

1. lib/stripe.ts: Stripe client (server-only, STRIPE_SECRET_KEY)
2. app/api/checkout/route.ts: creates Stripe Checkout Session for a given price ID,
   attaches user metadata, returns checkout URL. Follow API route pattern from CLAUDE.md.
3. app/api/webhooks/stripe/route.ts: handles these events:
   - checkout.session.completed → create Subscription record, update user.tier
   - customer.subscription.updated → sync tier from Stripe price ID
   - customer.subscription.deleted → downgrade user to FREE
   - invoice.payment_failed → send email via Resend, flag in DB
   Always use stripe.webhooks.constructEvent() with STRIPE_WEBHOOK_SECRET — this is
   a hard requirement from CLAUDE.md.
4. app/api/billing/portal/route.ts: returns Stripe Customer Portal session URL
5. hooks/useSubscription.ts: client-side hook reading tier from NextAuth session

Write a test confirming the webhook handler rejects requests without valid signatures.
```

**Session 6 — AI Assistant (Context-Aware Coach)**
```
Build the in-app AI coaching assistant following CLAUDE.md patterns:

1. app/api/assistant/route.ts: streaming chat endpoint
   - Auth → rate limit → Zod (message: string max 500) → Anthropic stream
   - Fetch user's last 5 analyses from DB and inject as system context
   - System prompt: coach using whichever of the 8 frameworks fits the question,
     reference the user's specific analyses by name, keep responses under 150 words
     unless asked to elaborate, suggest upgrading when free user asks about Pro features
   - Stream response back via SSE

2. components/assistant/AssistantPanel.tsx:
   - Slide-in drawer from right on desktop
   - Bottom sheet on mobile (< 768px)
   - Conversation stored in sessionStorage only (privacy)
   - Shows "Upgrade to Pro" CTA when free user hits limit
   - Streaming display: tokens appear as they arrive

Confirm no API key is referenced in any client component.
```

**Session 7 — Analysis Dashboard + StreamingResult**
```
Build the core dashboard UI following CLAUDE.md's Godin rule: the streaming
experience is the remarkable moment — prioritize it above all other frontend work.

1. app/(dashboard)/analyze/page.tsx:
   - Analysis input (textarea + type selector)
   - Calls /api/analyze and reads the SSE stream
   - Renders StreamingResult as tokens arrive

2. components/analysis/StreamingResult.tsx:
   - Shows 8 FrameworkCard components as JSON chunks parse in
   - Each card: expert name, insight, 3 improvements, metric
   - UpgradeModal appears after analysis completes (if user is FREE and has used 3/3)
   - Following Kennedy rule: upgrade headline is "Unlock unlimited strategies"

3. components/billing/UpgradeModal.tsx:
   - Renders INSIDE StreamingResult (not on a separate pricing page — Brunson rule)
   - Shows current analysis count vs limit
   - CTA calls /api/checkout and redirects to Stripe

4. app/(dashboard)/history/page.tsx:
   - Paginated list of past analyses
   - Search by offer text
   - Share button generates /share/[shareToken] link (GaryVee rule)

Test: confirm UpgradeModal triggers at correct analysis count for FREE tier.
```

**Session 8 — Mobile PWA**
```
Following the Mobile section of CLAUDE.md, implement full PWA support:

1. Configure next-pwa in next.config.ts:
   - Cache strategy: cache-first for static, network-first for /api,
     stale-while-revalidate for /dashboard
   - Offline fallback: show last 10 cached analyses

2. public/manifest.json: name "$100M Sales Team", short_name "$100M",
   theme_color "#EA580C", display "standalone", start_url "/dashboard/analyze"

3. Generate PWA icons at 192px and 512px (maskable) — use the orange brand color

4. components/mobile/BottomNav.tsx:
   - Fixed bottom, 5 tabs: Analyze / History / Playbooks / Coach / Settings
   - Visible ONLY below 768px (className="md:hidden")
   - padding-bottom: env(safe-area-inset-bottom) for iPhone notch
   - navigator.vibrate(10) on tab tap for haptic feedback

5. app/(dashboard)/layout.tsx:
   - Import BottomNav, add pb-20 on mobile to avoid content hiding under nav
   - Add viewport meta: width=device-width, initial-scale=1, viewport-fit=cover

Run Lighthouse on the app and confirm PWA score ≥ 90.
```

**Session 9 — Shareable Analysis Cards (OG Images)**
```
Following the GaryVee rule in CLAUDE.md — shareability is a feature, not an
afterthought — build the viral sharing system:

1. app/share/[shareToken]/page.tsx:
   - Public page, no auth required
   - Fetches analysis by shareToken from DB
   - Shows read-only framework results
   - "Analyze your own offer free →" CTA linking to /signup

2. app/api/og/[shareToken]/route.tsx:
   - Uses @vercel/og to generate a 1200×630 OG image
   - Shows: "$100M Sales Team analyzed [offerType]" + top 3 framework scores
   - Brand colors: orange accent on dark background
   - This image appears when users share the link on LinkedIn/Twitter

3. In app/share/[shareToken]/page.tsx:
   - Add <meta property="og:image" content="/api/og/[shareToken]" />
   - Add <meta property="og:title" content="See what 8 expert frameworks revealed" />

4. In components/analysis/ShareCard.tsx:
   - Share button that copies the /share/[shareToken] URL to clipboard
   - Appears in StreamingResult after analysis completes
```

**Session 10 — Email Automation (Soap Opera Sequence)**
```
Using Resend and React Email, build the 5-email Soap Opera Sequence triggered on signup:

1. emails/ directory with React Email templates:
   - welcome.tsx: "Your 8-expert AI board is ready" + CTA to first analysis
   - story.tsx (Day 1): founder story + first framework breakdown (Hormozi on offers)
   - proof.tsx (Day 3): case study format — "Offer analyzed, 3 blind spots found"
   - objection.tsx (Day 5): "Already have a consultant?" objection destroy (Belfort)
   - urgency.tsx (Day 7): "Founding Pro pricing: 48 hours left" hard CTA (Kennedy)

2. lib/email.ts: Resend client + sendEmail() helper

3. app/api/webhooks/auth/route.ts (or use NextAuth callbacks):
   Trigger Day 0 email on user creation. Schedule Days 1,3,5,7 via Upstash QStash.

4. Email unsubscribe link on every email: /api/unsubscribe?token=[unsubToken]
   Writes to a UserPreferences table, removes from future sends.

All email copy must follow Kennedy's rule from CLAUDE.md: lead with transformation,
never features. Every subject line must pass the "So what?" test.
```

**Session 11 — Security Audit + Launch Hardening**
```
Run a full security audit of the codebase against the Security Non-Negotiables in CLAUDE.md:

1. Grep for ANTHROPIC_API_KEY across all files — confirm zero client-side references
2. Verify every route in app/api/ follows the auth → rate limit → Zod → logic order
3. Check all Stripe webhook handlers use constructEvent() with the signing secret
4. Verify all Prisma queries in API routes confirm resource.userId === session.user.id
5. Test RLS: query User B's analyses while authenticated as User A — must return empty
6. Run `npm run build` and confirm zero TypeScript errors and zero ESLint warnings
7. Add Cloudflare Turnstile to the signup form (bot protection)
8. Verify Content-Security-Policy header blocks inline scripts
9. Run Lighthouse security audit — fix any flagged issues
10. Generate the production environment variable checklist and confirm all are set in Vercel

Output a security report: each check, pass/fail, and any remediation applied.
```

**Session 12 — Growth Systems + Referral**
```
Build the referral and growth infrastructure:

1. Referral system:
   - Add referralCode (cuid) to User model, generated on creation
   - /r/[referralCode] redirect route that sets a cookie and redirects to /signup
   - On paid subscription creation: credit referrer 30% of first 12 months via Stripe
   - app/(dashboard)/settings/referral.tsx: shows unique link, earnings, count

2. Weekly digest email (Resend + Upstash QStash cron):
   - Every Monday 9am: send analysis summary to all active users
   - Shows: analyses this week, top framework used, upgrade prompt for FREE users
   - Schedule: QStash cron `0 9 * * 1`

3. Analysis count badges:
   - Add analysisCount to User (increment on each analysis)
   - Show "You've run 50 analyses" milestone toast → prompt to share on LinkedIn

4. Affiliate dashboard in settings:
   - Earnings to date, pending payouts, referral link
   - Payout via Stripe Connect (optional Phase 2 — stub with "coming soon" if complex)
```

---

**Session start prompt — run this at the beginning of every new Claude Code session:**
```
Read CLAUDE.md at the project root. Confirm you understand:
1. The security non-negotiables (especially API key placement and route order)
2. The API route pattern I want on every endpoint
3. The current phase we're working on
4. Which framework rules apply to the feature we're building today

Then tell me what we're about to build and flag any risks before we start.
```
