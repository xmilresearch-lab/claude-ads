'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import AnalysisInput from '@/components/analysis/AnalysisInput'
import StreamingResult from '@/components/analysis/StreamingResult'
import AssistantPanel from '@/components/assistant/AssistantPanel'
import { analysisResultSchema, type AnalysisResult } from '@/lib/schemas'
import { TIER_LIMITS } from '@/lib/ratelimit'
import type { Tier } from '@/lib/ratelimit'

interface AnalysisState {
  result: AnalysisResult
  shareToken: string
  showUpgrade: boolean
}

export default function AnalyzePage() {
  const { data: session } = useSession()
  const [analysisState, setAnalysisState] = useState<AnalysisState | null>(null)
  const [streaming, setStreaming] = useState(false)
  const [streamBuffer, setStreamBuffer] = useState('')
  const [error, setError] = useState<string | null>(null)

  const tier = (session?.user?.tier ?? 'FREE') as Tier
  const analysisCount = session?.user?.analysisCount ?? 0
  const isAtLimit = tier === 'FREE' && analysisCount >= TIER_LIMITS.FREE.analysesPerDay

  async function handleAnalyze(offerText: string, analysisType: 'offer' | 'problem' | 'challenge') {
    setStreaming(true)
    setStreamBuffer('')
    setError(null)
    setAnalysisState(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerText, analysisType }),
      })

      if (res.status === 402) {
        setError('Daily analysis limit reached. Upgrade to continue.')
        return
      }

      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        setError(err.error ?? 'Analysis failed. Please try again.')
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let shareToken = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            try {
              const parsed = JSON.parse(line.slice(6)) as {
                text?: string
                done?: boolean
                shareToken?: string
                error?: string
              }
              if (parsed.text) {
                fullText += parsed.text
                setStreamBuffer(fullText)
              }
              if (parsed.shareToken) shareToken = parsed.shareToken
              if (parsed.error) {
                setError(parsed.error)
                return
              }
              if (parsed.done) break
            } catch {
              // ignore malformed SSE frames
            }
          }
        }
      }

      // Parse completed JSON
      const jsonMatch = fullText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        setError('Could not parse analysis result. Please try again.')
        return
      }

      const parsed = analysisResultSchema.safeParse(JSON.parse(jsonMatch[0]))
      if (!parsed.success) {
        setError('Analysis returned unexpected format. Please try again.')
        return
      }

      const newCount = analysisCount + 1
      const showUpgrade = tier === 'FREE' && newCount >= TIER_LIMITS.FREE.analysesPerDay

      setAnalysisState({ result: parsed.data, shareToken, showUpgrade })
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Analyze My Offer</h1>
        <p className="text-gray-400 text-sm">
          {isAtLimit
            ? 'You\'ve used your 3 free analyses today.'
            : tier === 'FREE'
            ? `${TIER_LIMITS.FREE.analysesPerDay - analysisCount} free ${analysisCount === TIER_LIMITS.FREE.analysesPerDay - 1 ? 'analysis' : 'analyses'} remaining today.`
            : 'Run your first analysis — it takes 90 seconds'}
        </p>
      </div>

      {!analysisState && (
        <AnalysisInput
          onSubmit={(text, type) => void handleAnalyze(text, type)}
          isLoading={streaming}
          isAtLimit={isAtLimit}
        />
      )}

      {/* Live streaming buffer */}
      {streaming && streamBuffer && (
        <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">Analyzing across 8 frameworks...</span>
          </div>
          <pre className="text-xs text-gray-400 whitespace-pre-wrap font-mono overflow-hidden max-h-40">
            {streamBuffer.slice(-500)}
          </pre>
        </div>
      )}

      {error && (
        <div className="mt-6 p-4 bg-red-950 border border-red-800 rounded-xl text-red-300 text-sm">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 text-red-400 hover:text-red-300 underline text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {analysisState && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400">Analysis Complete</h2>
            <button
              onClick={() => setAnalysisState(null)}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
            >
              New Analysis
            </button>
          </div>
          <StreamingResult
            result={analysisState.result}
            shareToken={analysisState.shareToken}
            showUpgrade={analysisState.showUpgrade}
          />
        </div>
      )}

      <AssistantPanel />
    </div>
  )
}
