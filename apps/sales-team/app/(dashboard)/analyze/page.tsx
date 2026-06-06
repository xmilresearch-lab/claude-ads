'use client'

import { useState } from 'react'
import AnalysisInput from '@/components/analysis/AnalysisInput'
import StreamingResult from '@/components/analysis/StreamingResult'
import { useSubscription } from '@/hooks/useSubscription'
import type { AnalysisResult } from '@/lib/schemas'

type Phase = 'input' | 'streaming' | 'complete'

export default function AnalyzePage() {
  const { tier, analysisCount } = useSubscription()
  const [phase, setPhase] = useState<Phase>('input')
  const [streamedText, setStreamedText] = useState('')
  const [shareToken, setShareToken] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  function handleChunk(text: string) {
    if (phase === 'input') setPhase('streaming')
    setStreamedText((prev) => prev + text)
  }

  function handleComplete(_result: AnalysisResult, token: string) {
    setPhase('complete')
    setShareToken(token)
  }

  function handleError(msg: string) {
    setPhase('input')
    setStreamedText('')
    setShareToken('')
    setErrorMsg(msg === 'limit_reached' ? 'You have reached your analysis limit.' : msg)
  }

  function handleReset() {
    setPhase('input')
    setStreamedText('')
    setShareToken('')
    setErrorMsg(null)
  }

  const isStreaming = phase === 'streaming'
  const showResult = phase === 'streaming' || phase === 'complete'

  function statusLabel(): string {
    if (tier === 'FREE') return `${analysisCount}/3 free analyses used`
    if (tier === 'SOLO') return `${analysisCount}/50 analyses today`
    return 'Unlimited (Pro)'
  }

  return (
    <div className="max-w-4xl mx-auto w-full px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Analyze Your Offer</h1>
        <p className="text-gray-500 text-sm mt-1">
          Run your offer, problem, or challenge through 8 elite business frameworks.
        </p>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between mb-6 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl">
        <span className="text-xs text-gray-500">{statusLabel()}</span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            tier === 'FREE'
              ? 'bg-gray-800 text-gray-400'
              : tier === 'SOLO'
              ? 'bg-blue-950 text-blue-400'
              : 'bg-orange-950 text-orange-400'
          }`}
        >
          {tier}
        </span>
      </div>

      {/* Error banner */}
      {errorMsg !== null && (
        <div className="mb-4 px-4 py-3 bg-red-950 border border-red-800 rounded-xl text-red-300 text-sm">
          {errorMsg}
        </div>
      )}

      {/*
        AnalysisInput stays mounted while streaming so the in-flight fetch is not
        interrupted by an unmount. CSS `hidden` removes layout without unmounting.
      */}
      <div className={showResult ? 'hidden' : ''}>
        <AnalysisInput
          onChunk={handleChunk}
          onComplete={handleComplete}
          onError={handleError}
        />
      </div>

      {showResult && (
        <StreamingResult
          streamedText={streamedText}
          isStreaming={isStreaming}
          shareToken={shareToken}
          onReset={handleReset}
        />
      )}
    </div>
  )
}
