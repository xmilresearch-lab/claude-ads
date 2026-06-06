'use client'

import { useSession } from 'next-auth/react'
import type { Tier } from '@prisma/client'
import { TIER_LIMITS } from '@/lib/ratelimit'

interface UseSubscriptionReturn {
  tier: Tier
  analysisCount: number
  isAtLimit: boolean
  canAccessAPI: boolean
  canWhiteLabel: boolean
  upgradeUrl: string
  isLoading: boolean
}

export function useSubscription(): UseSubscriptionReturn {
  const { data: session, status } = useSession()

  const tier: Tier = session?.user?.tier ?? 'FREE'
  const analysisCount = session?.user?.analysisCount ?? 0
  const isAtLimit = tier === 'FREE' && analysisCount >= TIER_LIMITS.FREE.analysesPerDay
  const canAccessAPI = tier === 'PRO' || tier === 'AGENCY' || tier === 'ENTERPRISE'
  const canWhiteLabel = tier === 'AGENCY' || tier === 'ENTERPRISE'

  return {
    tier,
    analysisCount,
    isAtLimit,
    canAccessAPI,
    canWhiteLabel,
    upgradeUrl: '/pricing',
    isLoading: status === 'loading',
  }
}
