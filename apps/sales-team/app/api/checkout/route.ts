import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getRatelimiter } from '@/lib/ratelimit'
import { checkoutSchema } from '@/lib/schemas'
import { writeAuditLog } from '@/lib/audit'
import { stripe, getOrCreateStripeCustomer } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  // Step 1: Auth
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2: Rate limit
  const limiter = getRatelimiter(session.user.tier)
  const { success } = await limiter.limit(`checkout:${session.user.id}`)
  if (!success) {
    return Response.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Step 3: Zod validation
  const body: unknown = await req.json()
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { priceId } = parsed.data
  const userId = session.user.id

  try {
    // Step 4: Business logic
    const customerId = await getOrCreateStripeCustomer(userId, session.user.email)

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.NEXTAUTH_URL}/dashboard/analyze?upgraded=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
      metadata: { userId },
    })

    // Step 5: Audit log
    await writeAuditLog({
      userId,
      action: 'CHECKOUT_INITIATED',
      metadata: { priceId },
    })

    // Step 6: Response
    return Response.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('[checkout] error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
