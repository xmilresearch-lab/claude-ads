import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { Tier } from '@prisma/client'

const redis = Redis.fromEnv()

export const TIER_LIMITS = {
  FREE:       { analysesPerDay: 3,     label: '3 analyses per day' },
  SOLO:       { analysesPerDay: 50,    label: '50 analyses per day' },
  PRO:        { analysesPerDay: 99999, label: 'Unlimited' },
  AGENCY:     { analysesPerDay: 99999, label: 'Unlimited' },
  ENTERPRISE: { analysesPerDay: 99999, label: 'Unlimited' },
} as const

const limiters = new Map<Tier, Ratelimit>()

export function getRatelimiter(tier: Tier): Ratelimit {
  const existing = limiters.get(tier)
  if (existing) return existing

  const { analysesPerDay } = TIER_LIMITS[tier]
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(analysesPerDay, '1 d'),
    analytics: true,
    prefix: `ratelimit:${tier}`,
  })
  limiters.set(tier, limiter)
  return limiter
}
