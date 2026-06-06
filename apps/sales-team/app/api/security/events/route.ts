import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function stripInputHash(metadata: unknown): unknown {
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return metadata
  }
  const { inputHash: _omit, ...rest } = metadata as Record<string, unknown>
  return rest
}

export async function GET(req: NextRequest) {
  // Step 1: Auth
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2: Admin gate
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)
  if (!adminEmails.includes(session.user.email ?? '')) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Step 3: Parse + clamp query params
  const { searchParams } = req.nextUrl
  const action    = searchParams.get('action') ?? undefined
  const hoursRaw  = parseInt(searchParams.get('hours') ?? '24', 10)
  const hours     = Math.min(Math.max(1, isNaN(hoursRaw) ? 24 : hoursRaw), 168)
  const limitRaw  = parseInt(searchParams.get('limit') ?? '50', 10)
  const limit     = Math.min(Math.max(1, isNaN(limitRaw) ? 50 : limitRaw), 200)

  const since = new Date(Date.now() - hours * 60 * 60 * 1000)

  // Step 4: Query
  const events = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: since },
      ...(action !== undefined ? { action } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      userId: true,
      action: true,
      metadata: true,
      ipAddress: true,
      createdAt: true,
    },
  })

  // Strip inputHash from every metadata object before returning
  const sanitized = events.map(e => ({ ...e, metadata: stripInputHash(e.metadata) }))

  return Response.json({ events: sanitized, count: sanitized.length })
}
