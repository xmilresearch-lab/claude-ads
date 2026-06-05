import type { NextRequest } from 'next/server'
import { stripe, PRICE_TO_TIER } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'
import type Stripe from 'stripe'

// NO auth check, NO rate limit — but signature MUST be verified first
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[webhook] signature verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const checkoutSession = event.data.object as Stripe.Checkout.Session
        const userId = checkoutSession.metadata?.userId
        if (!userId || !checkoutSession.subscription) break

        const sub = await stripe.subscriptions.retrieve(
          checkoutSession.subscription as string
        )
        const priceId = sub.items.data[0]?.price.id ?? ''
        const tier = PRICE_TO_TIER[priceId] ?? 'FREE'
        const periodEnd = new Date(
          (sub as unknown as { current_period_end: number }).current_period_end * 1000
        )

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            status: 'ACTIVE',
            tier,
            currentPeriodEnd: periodEnd,
          },
          update: {
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            status: 'ACTIVE',
            tier,
            currentPeriodEnd: periodEnd,
          },
        })

        await prisma.user.update({ where: { id: userId }, data: { tier } })
        await writeAuditLog({
          userId,
          action: 'SUBSCRIPTION_CREATED',
          metadata: { tier, subscriptionId: sub.id },
        })
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        })
        if (!user) break

        const priceId = sub.items.data[0]?.price.id ?? ''
        const tier = PRICE_TO_TIER[priceId] ?? 'FREE'
        const rawStatus = sub.status.toUpperCase()
        const status = (
          ['ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING'].includes(rawStatus)
            ? rawStatus
            : 'ACTIVE'
        ) as 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING'
        const periodEnd = new Date(
          (sub as unknown as { current_period_end: number }).current_period_end * 1000
        )

        await prisma.subscription.update({
          where: { stripeSubscriptionId: sub.id },
          data: {
            status,
            tier,
            stripePriceId: priceId,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          },
        })

        await prisma.user.update({ where: { id: user.id }, data: { tier } })
        await writeAuditLog({
          userId: user.id,
          action: 'SUBSCRIPTION_UPDATED',
          metadata: { tier, status },
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        })
        if (!user) break

        await prisma.subscription.update({
          where: { stripeSubscriptionId: sub.id },
          data: { status: 'CANCELED' },
        })

        await prisma.user.update({ where: { id: user.id }, data: { tier: 'FREE' } })
        await writeAuditLog({
          userId: user.id,
          action: 'SUBSCRIPTION_CANCELED',
          metadata: {},
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : null
        if (!customerId) break

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        })
        if (!user) break

        await prisma.subscription.updateMany({
          where: { userId: user.id },
          data: { status: 'PAST_DUE' },
        })

        await writeAuditLog({
          userId: user.id,
          action: 'PAYMENT_FAILED',
          metadata: { invoiceId: invoice.id },
        })
        break
      }
    }

    return Response.json({ received: true })
  } catch (error) {
    console.error('[webhook] handler error:', error)
    return Response.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
