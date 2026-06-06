import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { writeAuditLog } from '@/lib/audit'
import stripe from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  // Step 1: Auth
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  try {
    // Step 2: Verify billing account exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeCustomerId: true },
    })

    if (!user?.stripeCustomerId) {
      return Response.json({ error: 'No billing account found' }, { status: 400 })
    }

    // Step 3: Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.NEXTAUTH_URL}/dashboard/settings`,
    })

    // Step 4: Audit log
    await writeAuditLog({ userId, action: 'BILLING_PORTAL_ACCESSED' })

    // Step 5: Response
    return Response.json({ url: portalSession.url })
  } catch (error) {
    console.error('[billing/portal] error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
