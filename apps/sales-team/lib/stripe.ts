import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import type { Tier } from '@/lib/ratelimit'

// SERVER-ONLY — never import this file from client components

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-05-27.dahlia',
    })
  }
  return _stripe
}

// Backwards-compatible named export for routes that destructure it
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripe()[prop as keyof Stripe]
  },
})

// Map Stripe price IDs → internal Tier enum
export const PRICE_TO_TIER: Record<string, Tier> = {
  [process.env.STRIPE_PRICE_SOLO ?? '']: 'SOLO',
  [process.env.STRIPE_PRICE_PRO ?? '']: 'PRO',
  [process.env.STRIPE_PRICE_AGENCY ?? '']: 'AGENCY',
  [process.env.STRIPE_PRICE_ENTERPRISE ?? '']: 'ENTERPRISE',
}

export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } })

  if (user?.stripeCustomerId) return user.stripeCustomerId

  const customer = await getStripe().customers.create({ email, metadata: { userId } })

  await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customer.id } })

  return customer.id
}
