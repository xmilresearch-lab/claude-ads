'use client'

import { useSession } from 'next-auth/react'
import { TIER_LIMITS } from '@/lib/ratelimit'
import type { Tier } from '@/lib/ratelimit'

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
  const isAtLimit =
    tier === 'FREE' && analysisCount >= TIER_LIMITS.FREE.analysesPerDay
  const canUseAPI = TIER_LIMITS[tier].apiCallsPerMonth > 0

  return {
    tier,
    analysisCount,
    isAtLimit,
    canUseAPI,
    upgradeUrl: '/pricing',
  }
}
