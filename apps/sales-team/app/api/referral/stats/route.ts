/**
 * GET /api/referral/stats
 * Returns referral stats for the authenticated user.
 */

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(): Promise<Response> {
  // Step 1: Auth
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  // Step 2: Fetch referral data
  const [user, referrals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    }),
    prisma.user.findMany({
      where: { referredById: userId },
      select: { tier: true },
    }),
  ])

  const referralCode = user?.referralCode ?? ''
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const referralLink = `${baseUrl}/r/${referralCode}`

  const totalReferrals = referrals.length
  const paidReferrals = referrals.filter((r) => r.tier !== 'FREE').length
  // $149 × 30% per paid referral per month (Pro tier baseline from CLAUDE.md)
  const estimatedEarnings = paidReferrals * 149 * 0.3

  return Response.json({
    referralCode,
    referralLink,
    totalReferrals,
    paidReferrals,
    estimatedEarnings,
  })
}
