import type { DefaultSession } from 'next-auth'
import type { Tier } from '@/lib/ratelimit'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      tier: Tier
      analysisCount: number
      stripeCustomerId: string | null
    } & DefaultSession['user']
  }

  interface User {
    tier: Tier
    analysisCount: number
    stripeCustomerId: string | null
  }
}
