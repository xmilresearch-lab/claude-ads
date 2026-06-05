import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock next-auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock Upstash ratelimit
vi.mock('@/lib/ratelimit', () => ({
  getRatelimiter: vi.fn(() => ({
    limit: vi.fn().mockResolvedValue({ success: true }),
  })),
  TIER_LIMITS: {
    FREE: { analysesPerDay: 3, apiCallsPerMonth: 0 },
    SOLO: { analysesPerDay: 50, apiCallsPerMonth: 0 },
    PRO: { analysesPerDay: 99999, apiCallsPerMonth: 500 },
    AGENCY: { analysesPerDay: 99999, apiCallsPerMonth: 5000 },
    ENTERPRISE: { analysesPerDay: 99999, apiCallsPerMonth: 99999 },
  },
}))

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    analysis: { create: vi.fn() },
    user: { update: vi.fn() },
  },
}))

// Mock audit
vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(),
}))

// Mock AI
vi.mock('@/lib/ai', () => ({
  getAnthropic: vi.fn(),
  MODEL: 'claude-sonnet-4-20250514',
  ANALYSIS_SYSTEM_PROMPT: 'test prompt',
}))

import { POST } from '@/app/api/analyze/route'
import { auth } from '@/lib/auth'
import { getRatelimiter } from '@/lib/ratelimit'

const mockAuth = vi.mocked(auth)
const mockGetRatelimiter = vi.mocked(getRatelimiter)

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('http://localhost:3000/api/analyze', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when no session', async () => {
    mockAuth.mockResolvedValue(null)

    const res = await POST(makeRequest({ offerText: 'test offer', analysisType: 'offer' }))

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 429 when rate limit exceeded', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', tier: 'FREE', analysisCount: 0, email: 'test@test.com', stripeCustomerId: null },
      expires: new Date(Date.now() + 3600000).toISOString(),
    })
    mockGetRatelimiter.mockReturnValue({
      limit: vi.fn().mockResolvedValue({ success: false }),
    } as ReturnType<typeof getRatelimiter>)

    const res = await POST(makeRequest({ offerText: 'test offer', analysisType: 'offer' }))

    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.error).toBe('Rate limit exceeded')
  })

  it('returns 402 when FREE user is at daily limit', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', tier: 'FREE', analysisCount: 3, email: 'test@test.com', stripeCustomerId: null },
      expires: new Date(Date.now() + 3600000).toISOString(),
    })
    mockGetRatelimiter.mockReturnValue({
      limit: vi.fn().mockResolvedValue({ success: true }),
    } as ReturnType<typeof getRatelimiter>)

    const res = await POST(makeRequest({ offerText: 'test offer text here', analysisType: 'offer' }))

    expect(res.status).toBe(402)
    const json = await res.json()
    expect(json.error).toContain('limit')
  })

  it('returns 400 for invalid input', async () => {
    mockAuth.mockResolvedValue({
      user: { id: 'user-1', tier: 'FREE', analysisCount: 0, email: 'test@test.com', stripeCustomerId: null },
      expires: new Date(Date.now() + 3600000).toISOString(),
    })
    mockGetRatelimiter.mockReturnValue({
      limit: vi.fn().mockResolvedValue({ success: true }),
    } as ReturnType<typeof getRatelimiter>)

    const res = await POST(makeRequest({ offerText: 'short', analysisType: 'invalid' }))

    expect(res.status).toBe(400)
  })
})
