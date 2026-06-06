import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { checkoutSchema } from '@/lib/schemas'
import { writeAuditLog } from '@/lib/audit'
import stripe, { getOrCreateStripeCustomer } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  // Step 1: Auth
  const session = await auth()
  if (!session?.user?.id || !session.user.email) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Step 2: Zod validation (no rate limit needed on checkout)
  const body: unknown = await req.json()
  const parsed = checkoutSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { priceId } = parsed.data
  const userId = session.user.id

  try {
    // Step 3: Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(userId, session.user.email)

    // Step 4: Create Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${process.env.NEXTAUTH_URL}/dashboard/analyze?upgraded=true`,
      cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
      metadata: { userId: session.user.id },
    })

    // Step 5: Audit log
    await writeAuditLog({ userId, action: 'CHECKOUT_INITIATED', metadata: { priceId } })

    // Step 6: Response
    return Response.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('[checkout] error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
