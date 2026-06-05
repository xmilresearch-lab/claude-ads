import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Single source of truth — never duplicate these values elsewhere
export const TIER_LIMITS = {
  FREE:       { analysesPerDay: 3,     apiCallsPerMonth: 0     },
  SOLO:       { analysesPerDay: 50,    apiCallsPerMonth: 0     },
  PRO:        { analysesPerDay: 99999, apiCallsPerMonth: 500   },
  AGENCY:     { analysesPerDay: 99999, apiCallsPerMonth: 5000  },
  ENTERPRISE: { analysesPerDay: 99999, apiCallsPerMonth: 99999 },
} as const

export type Tier = keyof typeof TIER_LIMITS

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export function getRatelimiter(tier: Tier): Ratelimit {
  const limit = TIER_LIMITS[tier].analysesPerDay
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, '1 d'),
    analytics: true,
    prefix: `ratelimit:${tier.toLowerCase()}`,
  })
}
