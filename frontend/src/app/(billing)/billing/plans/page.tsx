'use client'

import { Check } from 'lucide-react'
import { useSubscription, useCreateCheckout } from '@/hooks/useBilling'
import { PLAN_LABELS, PLAN_PRICES } from '@/lib/api/billing'
import { cn } from '@/lib/utils/cn'

const PLANS = [
  {
    key: 'free',
    price: '$0/mo',
    features: ['3 automations', '1 integration', '10k tokens/mo'],
    priceId: null,
  },
  {
    key: 'starter',
    price: '$29/mo',
    features: ['15 automations', '5 integrations', '100k tokens/mo'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER ?? '',
  },
  {
    key: 'pro',
    price: '$79/mo',
    features: ['Unlimited automations', 'All integrations', '1M tokens/mo'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ?? '',
    highlighted: true,
  },
  {
    key: 'enterprise',
    price: 'Custom',
    features: ['Everything in Pro', 'Dedicated support', 'Custom SLA', 'Custom OAuth apps'],
    priceId: null,
  },
]

export default function PlansPage() {
  const { data: sub } = useSubscription()
  const checkout = useCreateCheckout()

  function handleUpgrade(priceId: string) {
    checkout.mutate({
      priceId,
      successUrl: `${window.location.origin}/billing/success`,
      cancelUrl: `${window.location.origin}/billing/plans`,
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
      <div className="space-y-1">
        <h1 className="font-display text-2xl text-text-primary">Choose your plan</h1>
        <p className="font-sans text-text-secondary text-sm">
          Upgrade anytime. Downgrade or cancel from your billing portal.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map((plan) => {
          const isCurrent = sub?.plan === plan.key
          return (
            <div
              key={plan.key}
              className={cn(
                'card-command p-6 flex flex-col gap-4',
                plan.highlighted && 'border-amber',
              )}
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-display text-base text-text-primary">
                    {PLAN_LABELS[plan.key]}
                  </span>
                  {plan.highlighted && (
                    <span className="text-[10px] font-mono text-amber uppercase tracking-widest">
                      Popular
                    </span>
                  )}
                </div>
                <p className="font-mono text-2xl text-text-primary">{plan.price}</p>
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm font-sans text-text-secondary">
                    <Check size={14} className="text-amber shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <span className="text-center text-xs font-mono text-text-muted py-2">
                  Current plan
                </span>
              ) : plan.priceId ? (
                <button
                  onClick={() => handleUpgrade(plan.priceId!)}
                  disabled={checkout.isPending}
                  className={cn(
                    'py-2 rounded-lg text-sm font-sans font-medium transition-colors
                    disabled:opacity-50',
                    plan.highlighted
                      ? 'bg-amber text-bg-base hover:bg-amber/90'
                      : 'bg-bg-overlay border border-border text-text-primary hover:border-amber/50',
                  )}
                >
                  {checkout.isPending ? 'Redirecting...' : 'Upgrade'}
                </button>
              ) : plan.key === 'enterprise' ? (
                <a
                  href="mailto:sales@yoursaas.com"
                  className="py-2 text-center rounded-lg text-sm font-sans text-text-primary
                    bg-bg-overlay border border-border hover:border-amber/50 transition-colors"
                >
                  Contact sales
                </a>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
