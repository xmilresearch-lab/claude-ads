'use client'

import { useState } from 'react'
import { Shield, Loader2 } from 'lucide-react'
import { useSubscription } from '@/hooks/useSubscription'
import type { AnalysisResult } from '@/lib/schemas'
import Link from 'next/link'

interface AnalysisInputProps {
  onChunk: (text: string) => void
  onComplete: (result: AnalysisResult, shareToken: string) => void
  onError: (msg: string) => void
}

type AnalysisType = 'offer' | 'problem' | 'challenge'

const TYPE_BUTTONS: { value: AnalysisType; label: string }[] = [
  { value: 'offer', label: 'Offer / Product' },
  { value: 'problem', label: 'Sales Problem' },
  { value: 'challenge', label: 'Business Challenge' },
]

const PLACEHOLDER =
  'Describe your offer, problem, or challenge. Be specific about your target market, current metrics, and what isn\'t working...'

export default function AnalysisInput({ onChunk, onComplete, onError }: AnalysisInputProps) {
  const [offerText, setOfferText] = useState('')
  const [analysisType, setAnalysisType] = useState<AnalysisType>('offer')
  const [isStreaming, setIsStreaming] = useState(false)
  const { isAtLimit, tier, analysisCount } = useSubscription()

  const charCount = offerText.length
  const isValid = charCount >= 10 && charCount <= 5000
  const canSubmit = isValid && !isStreaming && !isAtLimit

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setIsStreaming(true)
    let fullText = ''

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerText: offerText.trim(), analysisType }),
      })

      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        const errMsg = json.error === 'limit_reached' ? 'limit_reached' : (json.error ?? 'Analysis failed')
        onError(errMsg)
        return
      }

      if (!res.body) {
        onError('No response stream received')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Split on SSE line boundaries
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue

          try {
            const data = JSON.parse(jsonStr) as {
              text?: string
              done?: boolean
              shareToken?: string
              analysisId?: string
              error?: string
            }

            if (data.text) {
              fullText += data.text
              onChunk(data.text)
            } else if (data.done === true && data.shareToken) {
              try {
                const result = JSON.parse(fullText) as AnalysisResult
                onComplete(result, data.shareToken)
              } catch {
                onError('Could not parse analysis result — please try again')
              }
            } else if (data.error) {
              onError(data.error)
            }
          } catch {
            // Skip malformed SSE JSON
          }
        }
      }
    } catch {
      onError('Network error — please check your connection and try again')
    } finally {
      setIsStreaming(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Belfort objection pre-handle */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Shield className="w-3.5 h-3.5 text-green-500 shrink-0" />
        <span>Your data is private &amp; isolated — never used to train AI models</span>
      </div>

      {/* Analysis type toggle — orange active state (Kennedy rule) */}
      <div className="flex gap-2 flex-wrap">
        {TYPE_BUTTONS.map((btn) => (
          <button
            key={btn.value}
            type="button"
            onClick={() => setAnalysisType(btn.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              analysisType === btn.value
                ? 'bg-orange-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={offerText}
          onChange={(e) => setOfferText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={6}
          maxLength={5000}
          disabled={isStreaming}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-[16px] md:text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-50"
        />
        <span
          className={`absolute bottom-3 right-3 text-xs pointer-events-none ${
            charCount > 4500 ? 'text-yellow-500' : 'text-gray-600'
          }`}
        >
          {charCount}/5000
        </span>
      </div>

      {/* Streaming indicator */}
      {isStreaming && (
        <div className="flex items-center gap-2 text-sm text-orange-400 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Analyzing through 8 frameworks…</span>
        </div>
      )}

      {/* Submit — Kennedy copy rule: never "Submit" */}
      {isAtLimit ? (
        <div className="space-y-2">
          <button
            type="button"
            disabled
            className="w-full bg-gray-800 text-gray-500 cursor-not-allowed font-semibold py-3 px-6 rounded-xl text-sm"
          >
            Analyze My Offer →
          </button>
          <p className="text-center text-xs text-gray-500">
            You&apos;ve used all {tier === 'FREE' ? '3 free analyses this month' : 'your daily analyses'} —{' '}
            <Link href="/pricing" className="text-orange-400 hover:underline">
              upgrade to continue
            </Link>
          </p>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm"
        >
          {isStreaming ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing…
            </span>
          ) : (
            'Analyze My Offer →'
          )}
        </button>
      )}

      {analysisCount > 0 && tier === 'FREE' && !isAtLimit && (
        <p className="text-center text-xs text-gray-600">
          {3 - analysisCount} free {3 - analysisCount === 1 ? 'analysis' : 'analyses'} remaining
        </p>
      )}
    </form>
  )
}
