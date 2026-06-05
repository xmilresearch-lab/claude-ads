/**
 * POST /api/email/sequence
 * Called server-side on user creation to schedule the 5-email Soap Opera Sequence
 * via QStash delayed publishing. No auth required — only callable from server code
 * that passes the internal secret.
 */

import { NextRequest } from 'next/server'
import { Client as QStash } from '@upstash/qstash'
import { z } from 'zod'

const schema = z.object({
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  secret: z.string().min(1),
})

// Days to seconds
const DELAYS: Record<number, number> = {
  0: 0,
  1: 86_400,
  3: 259_200,
  5: 432_000,
  7: 604_800,
}

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Internal secret prevents external callers from scheduling arbitrary emails
  if (parsed.data.secret !== process.env.INTERNAL_API_SECRET) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, email, name } = parsed.data
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const sendUrl = `${baseUrl}/api/email/send`

  const qstash = new QStash({ token: process.env.QSTASH_TOKEN ?? '' })

  const steps = [0, 1, 3, 5, 7] as const

  await Promise.all(
    steps.map((step) =>
      qstash.publishJSON({
        url: sendUrl,
        body: { userId, email, ...(name !== undefined ? { name } : {}), step },
        delay: DELAYS[step] ?? 0,
        headers: {
          'x-internal-secret': process.env.INTERNAL_API_SECRET ?? '',
        },
      })
    )
  )

  return Response.json({ ok: true })
}
