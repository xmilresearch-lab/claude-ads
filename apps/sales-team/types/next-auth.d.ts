import type { DefaultSession } from 'next-auth'
import type { Tier } from '@prisma/client'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      tier: Tier
      analysisCount: number
      stripeCustomerId: string | null
      teamId: string | null
    } & DefaultSession['user']
  }

  interface User {
    tier: Tier
    analysisCount: number
    stripeCustomerId: string | null
    teamId: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    tier?: Tier
    analysisCount?: number
    stripeCustomerId?: string | null
    teamId?: string | null
  }
}
