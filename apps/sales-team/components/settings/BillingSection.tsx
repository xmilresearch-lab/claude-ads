'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Tier } from '@prisma/client'

interface Subscription {
  tier: Tier
  status: string
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
}

interface Props {
  tier: Tier
  subscription: Subscription | null
}

export default function BillingSection({ tier, subscription }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleManageBilling() {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      if (res.ok) {
        const { url } = (await res.json()) as { url: string }
        window.location.href = url
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const isFree = tier === 'FREE'

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Billing</h2>

      {isFree ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            You&rsquo;re on the <span className="text-white font-medium">Free plan</span> — 3 analyses per day.
          </p>
          <Link
            href="/pricing"
            className="inline-block bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            Unlock unlimited →
          </Link>
        </div>
      ) : subscription ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-sm text-gray-400">Plan</span>
            <span className="text-sm font-medium text-orange-400">{subscription.tier}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-sm text-gray-400">Status</span>
            <span className={`text-sm font-medium ${subscription.status === 'ACTIVE' ? 'text-green-400' : 'text-yellow-400'}`}>
              {subscription.status}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-sm text-gray-400">Renews</span>
            <span className="text-sm text-white">
              {subscription.cancelAtPeriodEnd
                ? `Cancels ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                : new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </span>
          </div>
          <button
            onClick={handleManageBilling}
            disabled={loading}
            className="text-sm text-orange-400 hover:text-orange-300 transition-colors disabled:opacity-50"
          >
            {loading ? 'Opening portal…' : 'Manage subscription →'}
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No active subscription found.</p>
      )}
    </section>
  )
}
