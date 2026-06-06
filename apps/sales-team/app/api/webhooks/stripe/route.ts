import type { NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { SubscriptionStatus } from '@prisma/client'
import stripe, { priceIdToTier } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'

// NO auth check, NO rate limit — called by Stripe servers directly.
// Stripe signature MUST be verified as the very first operation.
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        if (!userId || !session.subscription) break

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        )
        const priceId = subscription.items.data[0]?.price.id ?? ''
        const tier = priceIdToTier(priceId)
        const periodEnd = new Date(
          (subscription as unknown as { current_period_end: number }).current_period_end * 1000
        )

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            status: 'ACTIVE',
            tier,
            currentPeriodEnd: periodEnd,
          },
          update: {
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            status: 'ACTIVE',
            tier,
            currentPeriodEnd: periodEnd,
          },
        })

        await prisma.user.update({
          where: { id: userId },
          data: { tier, stripeCustomerId: session.customer as string },
        })

        await writeAuditLog({ userId, action: 'SUBSCRIPTION_CREATED', metadata: { tier } })
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: sub.customer as string },
        })
        if (!user) break

        const priceId = sub.items.data[0]?.price.id ?? ''
        const tier = priceIdToTier(priceId)
        const rawStatus = sub.status.toUpperCase()
        const validStatuses = ['ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING']
        const status = (validStatuses.includes(rawStatus) ? rawStatus : 'ACTIVE') as SubscriptionStatus
        const periodEnd = new Date(
          (sub as unknown as { current_period_end: number }).current_period_end * 1000
        )

        await prisma.subscription.update({
          where: { userId: user.id },
          data: {
            tier,
            status,
            stripePriceId: priceId,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        })

        await prisma.user.update({ where: { id: user.id }, data: { tier } })
        await writeAuditLog({ userId: user.id, action: 'SUBSCRIPTION_UPDATED', metadata: { tier, status } })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: sub.customer as string },
        })
        if (!user) break

        await prisma.subscription.update({
          where: { userId: user.id },
          data: { status: 'CANCELED' },
        })

        await prisma.user.update({ where: { id: user.id }, data: { tier: 'FREE' } })
        await writeAuditLog({ userId: user.id, action: 'SUBSCRIPTION_CANCELED' })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
        if (!customerId) break

        const user = await prisma.user.findUnique({
          where: { stripeCustomerId: customerId },
        })
        if (!user) break

        await prisma.subscription.update({
          where: { userId: user.id },
          data: { status: 'PAST_DUE' },
        })

        await writeAuditLog({
          userId: user.id,
          action: 'PAYMENT_FAILED',
          metadata: { invoiceId: invoice.id },
        })
        // TODO Phase 10: send payment-failed email via Resend
        break
      }
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error('[webhook] handler error:', error)
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
