import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Stripe
vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  },
  getStripe: vi.fn(() => ({
    webhooks: { constructEvent: vi.fn() },
    subscriptions: { retrieve: vi.fn() },
  })),
  PRICE_TO_TIER: {},
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: { upsert: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    user: { findFirst: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(),
}))

import { POST } from '@/app/api/webhooks/stripe/route'
import { stripe } from '@/lib/stripe'

const mockStripe = vi.mocked(stripe)

function makeWebhookRequest(body: string, sig: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers: { 'stripe-signature': sig },
  })
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when stripe-signature header is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body: '{}',
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('signature')
  })

  it('returns 400 when signature verification fails', async () => {
    const constructEvent = vi.mocked(mockStripe.webhooks.constructEvent)
    constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const res = await POST(makeWebhookRequest('{}', 'bad-sig'))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid signature')
  })
})
