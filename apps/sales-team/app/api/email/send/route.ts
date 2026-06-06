/**
 * POST /api/email/send
 * QStash callback endpoint — sends one email in the sequence.
 * Verified via QStash signature + internal secret header.
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendSequenceEmail, type EmailStep } from '@/lib/email'
import { writeAuditLog } from '@/lib/audit'

const schema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  step: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(5), z.literal(7)]),
})

export async function POST(req: NextRequest): Promise<Response> {
  const { verifySignatureAppRouter } = await import('@upstash/qstash/nextjs')

  const verifiedHandler = verifySignatureAppRouter(async (inner: NextRequest) => {
    const secret = inner.headers.get('x-internal-secret')
    if (secret !== process.env.INTERNAL_API_SECRET) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body: unknown = await inner.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { userId, email, name, step } = parsed.data

    // Fetch user for marketingOptOut check, analysisCount, and unsubscribeToken
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { marketingOptOut: true, analysisCount: true, unsubscribeToken: true },
    })

    // Respect opt-out for all email steps
    if (!user || user.marketingOptOut) {
      return Response.json({ ok: true, skipped: true })
    }

    await sendSequenceEmail({
      userId,
      email,
      ...(name !== undefined ? { name } : {}),
      analysisCount: user.analysisCount,
      step: step as EmailStep,
      unsubscribeToken: user.unsubscribeToken,
    })

    await writeAuditLog({
      userId,
      action: 'EMAIL_SEQUENCE_SENT',
      metadata: { step, email },
    })

    return Response.json({ ok: true })
  })

  return verifiedHandler(req)
}
