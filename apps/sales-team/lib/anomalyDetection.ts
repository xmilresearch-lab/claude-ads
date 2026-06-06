// SERVER-ONLY — never import from client components
import { Redis } from '@upstash/redis'
import { writeAuditLog } from '@/lib/audit'
import { captureSecurityEvent, captureHighSeverityEvent } from '@/lib/securityAlerts'

export type AnomalySignal = { type: string; value: number; threshold: number }

const RAPID_THRESHOLD        = 10  // requests per 60s per user
const VIOLATIONS_THRESHOLD   = 3   // security events per hour per user
const IP_THRESHOLD           = 50  // requests per hour per IP
const MULTI_ACCOUNT_THRESHOLD = 5  // distinct users per IP per day

let _redis: Redis | null = null
function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv()
  return _redis
}

export async function checkAnomalySignals(
  userId: string,
  ipAddress: string
): Promise<{ flagged: boolean; signals: AnomalySignal[] }> {
  const redis = getRedis()
  const signals: AnomalySignal[] = []

  try {
    // Signal 1: RAPID_REQUESTS — sliding 60s window
    const rapidKey = `anomaly:rapid:${userId}`
    const p1 = redis.pipeline()
    p1.incr(rapidKey)
    p1.expire(rapidKey, 60)
    const [rapidCount] = await p1.exec()
    if ((rapidCount as number) > RAPID_THRESHOLD) {
      signals.push({ type: 'RAPID_REQUESTS', value: rapidCount as number, threshold: RAPID_THRESHOLD })
    }

    // Signal 2: REPEATED_VIOLATIONS — check only; incremented by recordSecurityViolation()
    const violationsKey = `anomaly:violations:${userId}`
    const violationCount = (await redis.get<number>(violationsKey)) ?? 0
    if (violationCount > VIOLATIONS_THRESHOLD) {
      signals.push({ type: 'REPEATED_VIOLATIONS', value: violationCount, threshold: VIOLATIONS_THRESHOLD })
    }

    // Signal 3: IP_ABUSE — sliding 1h window per IP
    const ipKey = `anomaly:ip:${ipAddress}`
    const p3 = redis.pipeline()
    p3.incr(ipKey)
    p3.expire(ipKey, 3600)
    const [ipCount] = await p3.exec()
    if ((ipCount as number) > IP_THRESHOLD) {
      signals.push({ type: 'IP_ABUSE', value: ipCount as number, threshold: IP_THRESHOLD })
    }

    // Signal 4: MULTI_ACCOUNT_IP — distinct users per IP per 24h
    const ipUsersKey = `anomaly:ip_users:${ipAddress}`
    const p4 = redis.pipeline()
    p4.sadd(ipUsersKey, userId)
    p4.expire(ipUsersKey, 86400)
    p4.scard(ipUsersKey)
    const results4 = await p4.exec()
    const userCount = results4[2] as number
    if (userCount > MULTI_ACCOUNT_THRESHOLD) {
      signals.push({ type: 'MULTI_ACCOUNT_IP', value: userCount, threshold: MULTI_ACCOUNT_THRESHOLD })
    }
  } catch (err) {
    console.error('[anomalyDetection] Redis error in signal check:', err)
    return { flagged: false, signals: [] }
  }

  const flagged = signals.length > 0

  if (flagged) {
    captureSecurityEvent({ type: 'ANOMALY', userId, metadata: { signals, ipAddress } })
    void writeAuditLog({
      userId,
      action: 'ANOMALY_DETECTED',
      metadata: { signals, ipAddress },
    }).catch(() => {})

    // Track consecutive flagged requests; block after 3 within 10 minutes
    try {
      const consecutiveKey = `anomaly:consecutive:${userId}`
      const pc = getRedis().pipeline()
      pc.incr(consecutiveKey)
      pc.expire(consecutiveKey, 600)
      const [consecutive] = await pc.exec()
      if ((consecutive as number) >= 3) {
        await getRedis().set(`anomaly:blocked:${userId}`, '1', { ex: 900 })
        captureHighSeverityEvent({ type: 'REPEATED_ATTACKER', userId, metadata: { consecutiveFlags: consecutive as number } })
      }
    } catch (err) {
      console.error('[anomalyDetection] Failed to update consecutive counter:', err)
    }
  }

  return { flagged, signals }
}

export async function isUserBlocked(userId: string): Promise<boolean> {
  try {
    const val = await getRedis().get(`anomaly:blocked:${userId}`)
    return val !== null
  } catch {
    return false // fail open — never block on Redis errors
  }
}

// Called from API routes when a SECURITY_EVENT audit log is written
export async function recordSecurityViolation(userId: string): Promise<void> {
  try {
    const key = `anomaly:violations:${userId}`
    const p = getRedis().pipeline()
    p.incr(key)
    p.expire(key, 3600)
    await p.exec()
  } catch (err) {
    console.error('[anomalyDetection] Failed to record security violation:', err)
  }
}
