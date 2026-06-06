import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { NextRequest } from 'next/server'
import type { Session } from 'next-auth'
import type { Ratelimit } from '@upstash/ratelimit'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/ratelimit', () => ({
  getRatelimiter: vi.fn(() => ({
    limit: vi.fn().mockResolvedValue({ success: true }),
  })),
  TIER_LIMITS: {
    FREE:       { analysesPerDay: 3,     label: '3 analyses per day' },
    SOLO:       { analysesPerDay: 50,    label: '50 analyses per day' },
    PRO:        { analysesPerDay: 99999, label: 'Unlimited' },
    AGENCY:     { analysesPerDay: 99999, label: 'Unlimited' },
    ENTERPRISE: { analysesPerDay: 99999, label: 'Unlimited' },
  },
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    analysis: { create: vi.fn() },
    user: { update: vi.fn() },
  },
}))

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(),
}))

vi.mock('@/lib/ai', () => ({
  getAnthropic: vi.fn(),
  MODEL: 'claude-sonnet-4-20250514',
  ANALYSIS_SYSTEM_PROMPT: 'test system prompt',
}))

import { POST } from '@/app/api/analyze/route'
import { auth } from '@/lib/auth'
import { getRatelimiter } from '@/lib/ratelimit'

// auth has multiple overloads in NextAuth v5 (middleware + server component).
// Cast to the server-component overload so mockResolvedValue accepts Session | null.
type ServerAuth = () => Promise<Session | null>
const mockAuth = vi.mocked(auth as unknown as ServerAuth)
const mockGetRatelimiter = vi.mocked(getRatelimiter)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/analyze', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function sessionWith(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: 'user-1',
      tier: 'FREE',
      analysisCount: 0,
      email: 'test@test.com',
      stripeCustomerId: null,
      ...overrides,
    },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: rate limit passes
    mockGetRatelimiter.mockReturnValue({
      limit: vi.fn().mockResolvedValue({ success: true }),
    } as unknown as Ratelimit)
  })

  it('returns 401 when no session', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await POST(makeRequest({ offerText: 'valid offer text here', analysisType: 'offer' }))

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 402 when FREE user analysisCount >= 3', async () => {
    mockAuth.mockResolvedValue(sessionWith({ tier: 'FREE', analysisCount: 3 }) as Session)

    const res = await POST(makeRequest({ offerText: 'valid offer text here', analysisType: 'offer' }))

    expect(res.status).toBe(402)
    const json = await res.json()
    expect(json.error).toBe('limit_reached')
    expect(json.upgradeUrl).toBe('/pricing')
    expect(json.analysisCount).toBe(3)
  })

  it('returns 429 when rate limit exceeded', async () => {
    mockAuth.mockResolvedValue(sessionWith({ tier: 'FREE', analysisCount: 0 }) as Session)
    mockGetRatelimiter.mockReturnValue({
      limit: vi.fn().mockResolvedValue({ success: false }),
    } as unknown as Ratelimit)

    const res = await POST(makeRequest({ offerText: 'valid offer text here', analysisType: 'offer' }))

    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toBe('Rate limit exceeded')
  })

  it('returns 400 when offerText is empty', async () => {
    mockAuth.mockResolvedValue(sessionWith() as Session)

    const res = await POST(makeRequest({ offerText: '', analysisType: 'offer' }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when offerText exceeds 5000 characters', async () => {
    mockAuth.mockResolvedValue(sessionWith() as Session)

    const res = await POST(makeRequest({ offerText: 'x'.repeat(5001), analysisType: 'offer' }))

    expect(res.status).toBe(400)
  })

  it('returns 400 when analysisType is not a valid enum value', async () => {
    mockAuth.mockResolvedValue(sessionWith() as Session)

    const res = await POST(makeRequest({ offerText: 'valid offer text here', analysisType: 'invalid' }))

    expect(res.status).toBe(400)
  })

  it('ANTHROPIC_API_KEY does not appear in any client-side file', () => {
    const root = resolve(__dirname, '..')
    const appDir = join(root, 'app')
    const componentsDir = join(root, 'components')

    function collectFiles(dir: string, exclude: string[] = []): string[] {
      const files: string[] = []
      for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry)
        if (exclude.some(ex => fullPath.startsWith(ex))) continue
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          files.push(...collectFiles(fullPath, exclude))
        } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
          files.push(fullPath)
        }
      }
      return files
    }

    // Exclude app/api/ — server routes may legitimately reference the key name
    const appFiles = collectFiles(appDir, [join(appDir, 'api')])
    const componentFiles = collectFiles(componentsDir)

    const violations: string[] = []
    for (const file of [...appFiles, ...componentFiles]) {
      if (readFileSync(file, 'utf-8').includes('ANTHROPIC_API_KEY')) {
        violations.push(file.replace(root + '/', ''))
      }
    }

    expect(violations).toHaveLength(0)
  })
})
