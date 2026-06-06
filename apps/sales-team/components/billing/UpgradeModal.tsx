'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSubscription } from '@/hooks/useSubscription'

// Inline upgrade banner — lives inside StreamingResult, never on the pricing page.
// Only shown to FREE users who have exhausted their 3 free analyses.
export default function UpgradeModal() {
  const { isAtLimit, tier } = useSubscription()
  const [loading, setLoading] = useState(false)

  if (tier !== 'FREE' || !isAtLimit) return null

  async function handleUpgrade() {
    const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO
    if (!priceId) {
      window.location.href = '/pricing'
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (data.url) window.location.href = data.url
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-l-4 border-orange-500 bg-orange-950/30 rounded-r-xl p-5">
      <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">
        Analysis limit reached
      </p>
      <h3 className="text-lg font-bold text-white mb-1">Unlock unlimited strategies</h3>
      <p className="text-sm text-gray-400 mb-4">
        You&apos;ve used all 3 free analyses. Pro members run unlimited analyses and save every
        strategy.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="flex-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 px-5 rounded-xl transition-colors"
        >
          {loading ? 'Redirecting...' : 'Upgrade to Pro — $149/mo →'}
        </button>
        <Link
          href="/pricing"
          className="text-center text-sm text-gray-400 hover:text-white py-2.5 px-5 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors"
        >
          See all plans →
        </Link>
      </div>

      <p className="text-xs text-gray-600 mt-3">Cancel anytime · 7-day money-back guarantee</p>
    </div>
  )
}
