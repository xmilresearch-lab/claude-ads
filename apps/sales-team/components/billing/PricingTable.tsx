'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

const PLANS = [
  {
    name: 'Solo',
    price: '$49',
    period: '/mo',
    description: '50 analyses/day',
    features: ['50 analyses per day', 'AI Strategy Coach', 'Analysis history', 'Shareable results'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID ?? '',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$149',
    period: '/mo',
    description: 'Unlimited + API',
    features: ['Unlimited analyses', 'AI Strategy Coach', '500 API calls/mo', 'PDF export', 'Priority support'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? '',
    highlight: true,
  },
  {
    name: 'Agency',
    price: '$497',
    period: '/mo',
    description: 'Team + white-label',
    features: ['Unlimited analyses', '5,000 API calls/mo', 'Team seats', 'White-label domain', 'Dedicated support'],
    priceId: process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID ?? '',
    highlight: false,
  },
]

export default function PricingTable() {
  const [loading, setLoading] = useState<string | null>(null)

  async function handleCheckout(priceId: string) {
    setLoading(priceId)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {PLANS.map((plan) => (
        <div
          key={plan.name}
          className={`rounded-2xl border p-6 flex flex-col ${
            plan.highlight
              ? 'bg-blue-950 border-blue-700 ring-1 ring-blue-600'
              : 'bg-gray-900 border-gray-800'
          }`}
        >
          {plan.highlight && (
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">
              Most Popular
            </p>
          )}
          <h3 className="text-lg font-bold text-white">{plan.name}</h3>
          <p className="text-3xl font-bold text-white mt-2">
            {plan.price}
            <span className="text-base font-normal text-gray-500">{plan.period}</span>
          </p>
          <p className="text-sm text-gray-500 mt-1">{plan.description}</p>

          <ul className="mt-5 space-y-2.5 flex-1">
            {plan.features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                <Check className="w-4 h-4 text-green-400 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => void handleCheckout(plan.priceId)}
            disabled={loading === plan.priceId}
            className={`mt-6 w-full font-semibold py-3 rounded-xl transition-colors text-sm disabled:opacity-50 ${
              plan.highlight
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
            }`}
          >
            {loading === plan.priceId ? 'Redirecting...' : `Get ${plan.name}`}
          </button>
        </div>
      ))}
    </div>
  )
}
