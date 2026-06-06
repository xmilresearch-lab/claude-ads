/**
 * POST /api/referral/apply
 * Called client-side after authentication to attribute a referral.
 * Reads the referral code the client found in the referredBy cookie.
 * Idempotent — does nothing if referredById is already set.
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { processReferralCommission } from '@/lib/referral'
import { writeAuditLog } from '@/lib/audit'

const schema = z.object({
  referralCode: z.string().min(1).max(100),
})

export async function POST(req: NextRequest): Promise<Response> {
  // Step 1: Auth
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Step 2: Validate
  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { referralCode } = parsed.data
  const userId = session.user.id

  // Step 3: Check if already attributed
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredById: true },
  })
  if (user?.referredById) return Response.json({ ok: true, alreadyApplied: true })

  // Step 4: Find referrer (can't refer yourself)
  const referrer = await prisma.user.findUnique({
    where: { referralCode },
    select: { id: true },
  })
  if (!referrer || referrer.id === userId) return Response.json({ ok: true, skipped: true })

  // Step 5: Attribute referral
  await prisma.user.update({
    where: { id: userId },
    data: { referredById: referrer.id },
  })

  // Step 6: Apply commission if referrer is subscribed (fire-and-forget, non-blocking)
  processReferralCommission(referrer.id, userId).catch((err) =>
    console.error('[referral] commission error:', err)
  )

  await writeAuditLog({
    userId,
    action: 'REFERRAL_ATTRIBUTED',
    metadata: { referrerId: referrer.id, referralCode },
  })

  return Response.json({ ok: true })
}
