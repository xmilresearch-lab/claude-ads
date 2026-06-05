import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia',
})

const PLANS = [
  { name: 'Solo', amount: 4900, interval: 'month' as const, envKey: 'STRIPE_PRICE_SOLO' },
  { name: 'Pro', amount: 14900, interval: 'month' as const, envKey: 'STRIPE_PRICE_PRO' },
  { name: 'Agency', amount: 49700, interval: 'month' as const, envKey: 'STRIPE_PRICE_AGENCY' },
  { name: 'Enterprise', amount: 249700, interval: 'month' as const, envKey: 'STRIPE_PRICE_ENTERPRISE' },
]

async function main() {
  console.log('Creating Stripe products and prices...\n')

  for (const plan of PLANS) {
    const product = await stripe.products.create({
      name: `$100M Sales Team — ${plan.name}`,
      description: `AI Strategy Board ${plan.name} tier`,
    })

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.amount,
      currency: 'usd',
      recurring: { interval: plan.interval },
    })

    console.log(`${plan.name}: ${price.id}`)
    console.log(`  Add to .env.local: ${plan.envKey}=${price.id}\n`)
  }

  console.log('Done. Copy the price IDs above into your .env.local file.')
}

main().catch(console.error)
