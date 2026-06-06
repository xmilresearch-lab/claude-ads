import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/lib/stripe', () => {
  const mockStripe = {
    webhooks: {
      constructEvent: vi.fn(),
    },
    subscriptions: {
      retrieve: vi.fn(),
    },
  }
  return {
    default: mockStripe,
    priceIdToTier: vi.fn(() => 'FREE'),
    getOrCreateStripeCustomer: vi.fn(),
    PRICE_IDS: {},
  }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    subscription: { upsert: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}))

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(),
}))

import { POST } from '@/app/api/webhooks/stripe/route'
import stripe from '@/lib/stripe'

const mockStripe = vi.mocked(stripe)

function makeRequest(body: string, sig?: string): NextRequest {
  const headers: Record<string, string> = { 'Content-Type': 'text/plain' }
  if (sig !== undefined) headers['stripe-signature'] = sig
  return new NextRequest('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    body,
    headers,
  })
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when stripe-signature header is missing', async () => {
    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('signature')
  })

  it('returns 400 when signature verification fails', async () => {
    vi.mocked(mockStripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload.')
    })

    const res = await POST(makeRequest('{}', 'bad-sig'))

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid signature')
  })

  it('returns 200 with { received: true } on valid event', async () => {
    vi.mocked(mockStripe.webhooks.constructEvent).mockReturnValue({
      id: 'evt_test_123',
      type: 'payment_intent.created', // unhandled type — falls through switch cleanly
      data: { object: {} },
    } as ReturnType<typeof mockStripe.webhooks.constructEvent>)

    const res = await POST(makeRequest('{}', 'valid-sig'))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ received: true })
  })
})
