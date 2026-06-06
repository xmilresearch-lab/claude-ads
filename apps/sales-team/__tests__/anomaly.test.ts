import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Hoisted mocks (vi.mock factories run before variable declarations) ────────

const { mockPipelineExec, mockPipeline, mockGet, mockSet, mockRedis } = vi.hoisted(() => {
  const mockPipelineExec = vi.fn()
  const mockPipeline = {
    incr:   vi.fn().mockReturnThis(),
    expire: vi.fn().mockReturnThis(),
    sadd:   vi.fn().mockReturnThis(),
    scard:  vi.fn().mockReturnThis(),
    exec:   mockPipelineExec,
  }
  const mockGet = vi.fn()
  const mockSet = vi.fn()
  const mockRedis = {
    get:      mockGet,
    set:      mockSet,
    pipeline: vi.fn().mockReturnValue(mockPipeline),
  }
  return { mockPipelineExec, mockPipeline, mockGet, mockSet, mockRedis }
})

vi.mock('@upstash/redis', () => ({
  Redis: { fromEnv: vi.fn().mockReturnValue(mockRedis) },
}))

vi.mock('@/lib/audit', () => ({ writeAuditLog: vi.fn().mockResolvedValue(undefined) }))

// ─── Imports ──────────────────────────────────────────────────────────────────

import { checkAnomalySignals, isUserBlocked } from '@/lib/anomalyDetection'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// checkAnomalySignals fires 3 pipeline.exec() calls (rapid, ip, ip_users) then
// a 4th for the consecutive counter only when flagged=true.
// redis.get() is called once for the violations key.
function setSignalMocks({
  rapid       = 1,
  violations  = 0,
  ip          = 1,
  ipUsers     = 1,
  consecutive = 1,
}: {
  rapid?: number
  violations?: number
  ip?: number
  ipUsers?: number
  consecutive?: number
} = {}) {
  mockPipelineExec
    .mockResolvedValueOnce([rapid, true])      // p1: incr rapidKey, expire
    .mockResolvedValueOnce([ip, true])         // p3: incr ipKey, expire
    .mockResolvedValueOnce([1, true, ipUsers]) // p4: sadd, expire, scard
    .mockResolvedValueOnce([consecutive, true]) // pc: consecutive counter (only if flagged)
  mockGet.mockResolvedValue(violations)
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockRedis.pipeline.mockReturnValue(mockPipeline)
  mockSet.mockResolvedValue('OK')
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkAnomalySignals', () => {
  it('returns flagged:true with RAPID_REQUESTS when count exceeds 10 in 60s', async () => {
    setSignalMocks({ rapid: 11 })

    const { flagged, signals } = await checkAnomalySignals('user-1', '1.2.3.4')

    expect(flagged).toBe(true)
    const rapidSignal = signals.find(s => s.type === 'RAPID_REQUESTS')
    expect(rapidSignal).toBeDefined()
    expect(rapidSignal?.value).toBe(11)
    expect(rapidSignal?.threshold).toBe(10)
  })

  it('returns flagged:true with REPEATED_VIOLATIONS when violation count exceeds 3 in 1 hour', async () => {
    setSignalMocks({ violations: 4 })

    const { flagged, signals } = await checkAnomalySignals('user-2', '2.3.4.5')

    expect(flagged).toBe(true)
    const violSignal = signals.find(s => s.type === 'REPEATED_VIOLATIONS')
    expect(violSignal).toBeDefined()
    expect(violSignal?.value).toBe(4)
    expect(violSignal?.threshold).toBe(3)
  })

  it('returns flagged:false when all signals are below threshold', async () => {
    setSignalMocks({ rapid: 3, violations: 1, ip: 10, ipUsers: 2 })

    const { flagged, signals } = await checkAnomalySignals('user-3', '3.4.5.6')

    expect(flagged).toBe(false)
    expect(signals).toHaveLength(0)
  })
})

describe('isUserBlocked', () => {
  it('returns false when block key does not exist in Redis', async () => {
    mockGet.mockResolvedValue(null)

    expect(await isUserBlocked('user-1')).toBe(false)
  })

  it('returns true when block key is set in Redis', async () => {
    mockGet.mockResolvedValue('1')

    expect(await isUserBlocked('user-1')).toBe(true)
  })
})
