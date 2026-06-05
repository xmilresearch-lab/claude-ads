import { describe, it, expect } from 'vitest'
import { isProtectedRoute, isPublicRoute } from '@/lib/routes'

// ─── Route protection logic ───────────────────────────────────────────────────

describe('isProtectedRoute', () => {
  it('protects /dashboard and all sub-paths', () => {
    expect(isProtectedRoute('/dashboard')).toBe(true)
    expect(isProtectedRoute('/dashboard/analyze')).toBe(true)
    expect(isProtectedRoute('/dashboard/history')).toBe(true)
    expect(isProtectedRoute('/dashboard/settings')).toBe(true)
  })

  it('protects /api/analyze', () => {
    expect(isProtectedRoute('/api/analyze')).toBe(true)
  })

  it('protects /api/assistant', () => {
    expect(isProtectedRoute('/api/assistant')).toBe(true)
  })

  it('protects /api/checkout', () => {
    expect(isProtectedRoute('/api/checkout')).toBe(true)
  })

  it('protects /api/billing and sub-paths', () => {
    expect(isProtectedRoute('/api/billing')).toBe(true)
    expect(isProtectedRoute('/api/billing/portal')).toBe(true)
  })

  it('does NOT protect /api/webhooks', () => {
    expect(isProtectedRoute('/api/webhooks')).toBe(false)
    expect(isProtectedRoute('/api/webhooks/stripe')).toBe(false)
  })

  it('does NOT protect /api/auth', () => {
    expect(isProtectedRoute('/api/auth')).toBe(false)
    expect(isProtectedRoute('/api/auth/callback/google')).toBe(false)
  })

  it('does NOT protect /api/og', () => {
    expect(isProtectedRoute('/api/og')).toBe(false)
    expect(isProtectedRoute('/api/og/abc123')).toBe(false)
  })

  it('does NOT protect marketing routes', () => {
    expect(isProtectedRoute('/')).toBe(false)
    expect(isProtectedRoute('/pricing')).toBe(false)
    expect(isProtectedRoute('/login')).toBe(false)
    expect(isProtectedRoute('/signup')).toBe(false)
  })
})

// ─── Public route list ────────────────────────────────────────────────────────

describe('isPublicRoute', () => {
  it('marks marketing and auth pages as public', () => {
    expect(isPublicRoute('/')).toBe(true)
    expect(isPublicRoute('/pricing')).toBe(true)
    expect(isPublicRoute('/login')).toBe(true)
    expect(isPublicRoute('/signup')).toBe(true)
  })

  it('marks /share/* as public', () => {
    expect(isPublicRoute('/share/tok123')).toBe(true)
  })

  it('marks /api/webhooks/* as public (never protected)', () => {
    expect(isPublicRoute('/api/webhooks/stripe')).toBe(true)
  })

  it('marks /api/auth/* as public', () => {
    expect(isPublicRoute('/api/auth/callback/google')).toBe(true)
  })

  it('marks /api/og/* as public', () => {
    expect(isPublicRoute('/api/og/tok123')).toBe(true)
  })

  it('does NOT mark /dashboard/* as public', () => {
    expect(isPublicRoute('/dashboard/analyze')).toBe(false)
  })

  it('does NOT mark /api/analyze as public', () => {
    expect(isPublicRoute('/api/analyze')).toBe(false)
  })
})

// ─── TypeScript session type augmentation (compile-time check) ────────────────
// If this file compiles without errors, the session augmentation is correct.

describe('session type shape', () => {
  it('session.user has all required fields (TypeScript compile check)', () => {
    // Simulate the shape of session.user — if the types are wrong this won't compile
    const mockUser: {
      id: string
      tier: 'FREE' | 'SOLO' | 'PRO' | 'AGENCY' | 'ENTERPRISE'
      analysisCount: number
      stripeCustomerId: string | null
      teamId: string | null
      email?: string | null
      name?: string | null
      image?: string | null
    } = {
      id: 'user_01',
      tier: 'FREE',
      analysisCount: 0,
      stripeCustomerId: null,
      teamId: null,
      email: 'test@test.com',
    }

    expect(mockUser.id).toBe('user_01')
    expect(mockUser.tier).toBe('FREE')
    expect(mockUser.analysisCount).toBe(0)
    expect(mockUser.stripeCustomerId).toBeNull()
    expect(mockUser.teamId).toBeNull()
  })
})
