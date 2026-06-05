/**
 * POST /api/email/send
 * QStash callback endpoint — sends one email in the sequence.
 * Verified via QStash signature at request time + internal secret header.
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { sendSequenceEmail, type EmailStep } from '@/lib/email'

const schema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  step: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(5), z.literal(7)]),
})

export async function POST(req: NextRequest): Promise<Response> {
  // Step 1: Verify QStash signature lazily (reads env vars at request time)
  const { verifySignatureAppRouter } = await import('@upstash/qstash/nextjs')

  const verifiedHandler = verifySignatureAppRouter(async (inner: NextRequest) => {
    // Belt-and-suspenders: internal secret
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

    // For step 5 (upgrade nudge), fetch live analysisCount
    let analysisCount = 0
    if (step === 5) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { analysisCount: true },
      })
      analysisCount = user?.analysisCount ?? 0
    }

    await sendSequenceEmail({
      userId,
      email,
      ...(name !== undefined ? { name } : {}),
      analysisCount,
      step: step as EmailStep,
    })

    return Response.json({ ok: true })
  })

  return verifiedHandler(req)
}
