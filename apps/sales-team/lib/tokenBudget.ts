// SERVER-ONLY — never import from client components
import type { Tier } from '@prisma/client'
import { Redis } from '@upstash/redis'

export const DAILY_TOKEN_BUDGETS: Record<Tier, number> = {
  FREE:       50_000,
  SOLO:       200_000,
  PRO:        1_000_000,
  AGENCY:     5_000_000,
  ENTERPRISE: 99_999_999,
}

// Lazy Redis client — instantiated on first call, not at module load
let _redis: Redis | null = null

function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv()
  return _redis
}

function todayKey(userId: string): string {
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD UTC
  return `tokens:${userId}:${date}`
}

function nextMidnightUTC(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
}

export async function checkTokenBudget(
  userId: string,
  tier: Tier,
  estimatedTokens: number
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const key = todayKey(userId)
  const budget = DAILY_TOKEN_BUDGETS[tier]

  const current = (await getRedis().get<number>(key)) ?? 0
  const allowed = current + estimatedTokens <= budget
  const remaining = Math.max(0, budget - current)

  return { allowed, remaining, resetAt: nextMidnightUTC() }
}

export async function recordTokenUsage(
  userId: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  try {
    const key = todayKey(userId)
    const total = inputTokens + outputTokens
    // Pipeline: increment + set TTL atomically
    const pipeline = getRedis().pipeline()
    pipeline.incrby(key, total)
    pipeline.expire(key, 86400)
    await pipeline.exec()
  } catch (err) {
    console.error('[tokenBudget] Failed to record token usage:', err)
    // Never throw — budget tracking failures must not break the request
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}
