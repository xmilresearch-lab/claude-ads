import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getRatelimiter } from '@/lib/ratelimit'
import { writeAuditLog } from '@/lib/audit'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  // Step 1: Auth
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2: Rate limit
  const limiter = getRatelimiter(session.user.tier)
  const { success } = await limiter.limit(`billing:${session.user.id}`)
  if (!success) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // No body to validate for portal — just need the session

  const userId = session.user.id

  try {
    // Step 4: Business logic
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    })

    if (!user?.stripeCustomerId) {
      return Response.json({ error: 'No billing account found' }, { status: 404 })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard/settings`,
    })

    // Step 5: Audit log
    await writeAuditLog({ userId, action: 'BILLING_PORTAL_ACCESSED', metadata: {} })

    // Step 6: Response
    return Response.json({ url: portalSession.url })
  } catch (error) {
    console.error('[billing/portal] error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
