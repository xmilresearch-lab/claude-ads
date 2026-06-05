'use client'

import { useSession } from 'next-auth/react'
import type { Tier } from '@prisma/client'
import { TIER_LIMITS } from '@/lib/ratelimit'

interface UseSubscriptionReturn {
  tier: Tier
  analysisCount: number
  isAtLimit: boolean
  canUseAPI: boolean
  upgradeUrl: string
}

export function useSubscription(): UseSubscriptionReturn {
  const { data: session } = useSession()

  const tier: Tier = session?.user?.tier ?? 'FREE'
  const analysisCount = session?.user?.analysisCount ?? 0
  const isAtLimit = tier === 'FREE' && analysisCount >= TIER_LIMITS.FREE.analysesPerDay
  // PRO and above tiers have unlimited (99999) analyses and API access
  const canUseAPI = TIER_LIMITS[tier].analysesPerDay > 50

  return {
    tier,
    analysisCount,
    isAtLimit,
    canUseAPI,
    upgradeUrl: '/pricing',
  }
}
