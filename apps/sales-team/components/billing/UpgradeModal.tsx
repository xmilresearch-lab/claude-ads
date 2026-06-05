'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface UpgradeModalProps {
  onClose: () => void
}

export default function UpgradeModal({ onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)

  async function handleUpgrade(priceId: string) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
            You&apos;ve used your 3 free analyses
          </p>
          <h2 className="text-xl font-bold text-white">Unlock unlimited strategies</h2>
          <p className="text-gray-400 text-sm mt-2">
            Get unlimited analyses, AI coaching, and playbook export — starting at $49/mo.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_SOLO_PRICE_ID ?? '')}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
          >
            Solo — $49/mo · 50 analyses/day
          </button>
          <button
            onClick={() => handleUpgrade(process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? '')}
            disabled={loading}
            className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm border border-gray-700"
          >
            Pro — $149/mo · Unlimited + API access
          </button>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">Cancel anytime. 7-day money-back guarantee.</p>
      </div>
    </div>
  )
}
