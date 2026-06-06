import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import type { Tier } from '@prisma/client'

// SERVER-ONLY — never import this file from client components
// Lazy init: Stripe client is created on first property access, not at module load,
// so build succeeds without STRIPE_SECRET_KEY in the environment.

let _stripe: Stripe | null = null

function getStripeInstance(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('[lib/stripe] STRIPE_SECRET_KEY is required but not set')
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-05-27.dahlia',
      typescript: true,
    })
  }
  return _stripe
}

// Default export: a Proxy that lazily forwards all property access to the real client
const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return getStripeInstance()[prop as keyof Stripe]
  },
})
export default stripe

// Price IDs sourced from env — set these after running scripts/setup-stripe.ts
export const PRICE_IDS = {
  SOLO:        process.env.STRIPE_PRICE_SOLO!,
  PRO:         process.env.STRIPE_PRICE_PRO!,
  AGENCY:      process.env.STRIPE_PRICE_AGENCY!,
  ENTERPRISE:  process.env.STRIPE_PRICE_ENTERPRISE!,
}

export function priceIdToTier(priceId: string): Tier {
  const map: Record<string, Tier> = {
    [process.env.STRIPE_PRICE_SOLO       ?? '']: 'SOLO',
    [process.env.STRIPE_PRICE_PRO        ?? '']: 'PRO',
    [process.env.STRIPE_PRICE_AGENCY     ?? '']: 'AGENCY',
    [process.env.STRIPE_PRICE_ENTERPRISE ?? '']: 'ENTERPRISE',
  }
  return map[priceId] ?? 'FREE'
}

export async function getOrCreateStripeCustomer(userId: string, email: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  })

  if (user?.stripeCustomerId) return user.stripeCustomerId

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  })

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  })

  return customer.id
}
