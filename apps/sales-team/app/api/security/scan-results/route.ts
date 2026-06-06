// SERVER-ONLY — receives scan results from GitHub Actions and serves admin dashboard
import type { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { scanResultSchema } from '@/lib/schemas'
import { captureHighSeverityEvent } from '@/lib/securityAlerts'

// ── POST — receive scan result from GitHub Actions ────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {
  // Step 1: Verify shared secret (replaces session auth for machine callers)
  const secret = req.headers.get('x-scanner-secret')
  const expected = process.env.SCANNER_SECRET
  if (!expected || !secret || secret !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2: Validate body
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = scanResultSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { scanType, runId, status, findings, criticalCount, warnCount, passCount, triggeredBy } =
    parsed.data

  // Step 3: Store result
  try {
    const record = await prisma.securityScanResult.create({
      data: {
        scanType,
        runId,
        status,
        findings: findings as Prisma.InputJsonValue,
        criticalCount,
        warnCount,
        passCount,
        triggeredBy,
      },
    })

    // Step 4: Alert on critical failures
    if (status === 'fail' && criticalCount > 0) {
      captureHighSeverityEvent({
        type: 'SYSTEM_PROMPT_LEAK', // closest severity bucket — scanner failure
        userId: 'github-actions',
        metadata: { scanType, runId, criticalCount, triggeredBy },
      })
    }

    return Response.json({ id: record.id, status: record.status }, { status: 201 })
  } catch (error) {
    console.error('[scan-results] POST error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── GET — serve scan history to admin dashboard ───────────────────────────────

export async function GET(req: NextRequest): Promise<Response> {
  // Step 1: Auth
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2: Admin gate
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
  if (!adminEmails.includes(session.user.email ?? '')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Step 3: Parse query params
  const { searchParams } = req.nextUrl
  const scanType = searchParams.get('scanType') ?? undefined
  const daysRaw  = parseInt(searchParams.get('days') ?? '30', 10)
  const days     = Math.min(Math.max(1, isNaN(daysRaw) ? 30 : daysRaw), 90)
  const limitRaw = parseInt(searchParams.get('limit') ?? '20', 10)
  const limit    = Math.min(Math.max(1, isNaN(limitRaw) ? 20 : limitRaw), 100)

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  // Step 4: Query
  const results = await prisma.securityScanResult.findMany({
    where: {
      createdAt: { gte: since },
      ...(scanType !== undefined ? { scanType } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return Response.json({ results, count: results.length })
}
