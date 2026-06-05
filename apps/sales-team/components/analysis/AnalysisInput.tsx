'use client'

import { useState } from 'react'
import { Shield } from 'lucide-react'

interface AnalysisInputProps {
  onSubmit: (offerText: string, analysisType: 'offer' | 'problem' | 'challenge') => void
  isLoading: boolean
  isAtLimit: boolean
}

const ANALYSIS_TYPES = [
  { value: 'offer' as const, label: 'Sales Offer', description: 'Analyze and improve a sales offer' },
  { value: 'problem' as const, label: 'Business Problem', description: 'Break down a strategic challenge' },
  { value: 'challenge' as const, label: 'Growth Challenge', description: 'Unlock scaling opportunities' },
]

const PLACEHOLDER: Record<string, string> = {
  offer: 'Describe your offer in detail — what it is, who it\'s for, the price, the transformation delivered, and any bonuses or guarantees...',
  problem: 'Describe the specific business problem you\'re facing — what\'s happening, what you\'ve tried, and what success looks like...',
  challenge: 'Describe your growth challenge — current revenue, bottlenecks, team constraints, and where you want to be in 90 days...',
}

export default function AnalysisInput({ onSubmit, isLoading, isAtLimit }: AnalysisInputProps) {
  const [offerText, setOfferText] = useState('')
  const [analysisType, setAnalysisType] = useState<'offer' | 'problem' | 'challenge'>('offer')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!offerText.trim() || isLoading || isAtLimit) return
    onSubmit(offerText.trim(), analysisType)
  }

  const charCount = offerText.length
  const isValid = charCount >= 10 && charCount <= 5000

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Privacy badge — Belfort objection pre-handle */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Shield className="w-3.5 h-3.5 text-green-500 shrink-0" />
        <span>Your data is private &amp; isolated — never used to train AI models</span>
      </div>

      {/* Analysis type selector */}
      <div className="flex gap-2 flex-wrap">
        {ANALYSIS_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => setAnalysisType(type.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              analysisType === type.value
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Text input */}
      <div className="relative">
        <textarea
          value={offerText}
          onChange={(e) => setOfferText(e.target.value)}
          placeholder={PLACEHOLDER[analysisType]}
          rows={8}
          maxLength={5000}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-blue-500 transition-colors"
        />
        <span
          className={`absolute bottom-3 right-3 text-xs ${
            charCount > 4500 ? 'text-yellow-500' : 'text-gray-600'
          }`}
        >
          {charCount}/5000
        </span>
      </div>

      <button
        type="submit"
        disabled={!isValid || isLoading || isAtLimit}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
      >
        {isLoading ? 'Analyzing...' : isAtLimit ? 'Daily Limit Reached — Upgrade to Continue' : 'Analyze My Offer'}
      </button>

      {isAtLimit && (
        <p className="text-center text-xs text-gray-500">
          You&apos;ve used your 3 free analyses today.{' '}
          <a href="/pricing" className="text-blue-400 hover:underline">
            Upgrade for unlimited access.
          </a>
        </p>
      )}
    </form>
  )
}
