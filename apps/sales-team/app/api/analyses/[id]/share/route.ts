import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

interface Props {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: Props) {
  // Step 1: Auth
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // No rate limit needed for this mutation — it's cheap and user-initiated

  // Step 2: Fetch analysis and IDOR check
  const { id } = await params
  const analysis = await prisma.analysis.findUnique({
    where: { id },
    select: { id: true, userId: true, shared: true },
  })

  if (!analysis) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  if (analysis.userId !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Step 3: Toggle shared
  try {
    const updated = await prisma.analysis.update({
      where: { id },
      data: { shared: !analysis.shared },
      select: { shared: true },
    })

    await writeAuditLog({
      userId: session.user.id,
      action: 'ANALYSIS_SHARE_TOGGLED',
      metadata: { analysisId: id, shared: updated.shared },
    })

    return Response.json({ shared: updated.shared })
  } catch (error) {
    console.error('[analyses/share] error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
