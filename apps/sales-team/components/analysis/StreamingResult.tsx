'use client'

import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import FrameworkCard from './FrameworkCard'
import ShareCard from './ShareCard'
import UpgradeModal from '@/components/billing/UpgradeModal'
import type { AnalysisResult } from '@/lib/schemas'

interface StreamingResultProps {
  /** Raw accumulated SSE text — updated by the parent as chunks arrive */
  streamedText: string
  isStreaming: boolean
  shareToken: string
  onReset: () => void
}

type Framework = AnalysisResult['frameworks'][number]
type Synthesis = AnalysisResult['synthesis']

// Expert brand color map
const EXPERT_COLORS: Record<string, string> = {
  Hormozi:  '#4F46E5',
  GaryVee:  '#9333EA',
  Cardone:  '#DC2626',
  Belfort:  '#D97706',
  Kennedy:  '#0891B2',
  Brunson:  '#059669',
  Godin:    '#DB2777',
  Robbins:  '#EA580C',
}

const EXPERT_ORDER = ['Hormozi', 'GaryVee', 'Cardone', 'Belfort', 'Kennedy', 'Brunson', 'Godin', 'Robbins']

// Extracts fully-formed framework objects as they accumulate in the stream
function parseFrameworks(text: string): Framework[] {
  const marker = '"frameworks":['
  const start = text.indexOf(marker)
  if (start === -1) return []

  const from = start + marker.length
  const frameworks: Framework[] = []
  let depth = 0
  let objStart = -1

  for (let i = from; i < text.length; i++) {
    const ch = text[i]
    if (ch === undefined) break
    if (ch === '{') {
      if (depth === 0) objStart = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && objStart !== -1) {
        try {
          const obj = JSON.parse(text.slice(objStart, i + 1)) as Framework
          if (obj.name && obj.focus && obj.insight) frameworks.push(obj)
        } catch {
          // Incomplete — keep waiting
        }
        objStart = -1
      }
    } else if (ch === ']' && depth === 0) {
      break
    }
  }

  return frameworks
}

// Extracts the synthesis object once it's fully formed
function parseSynthesis(text: string): Synthesis | null {
  const marker = '"synthesis":'
  const start = text.indexOf(marker)
  if (start === -1) return null

  let depth = 0
  let objStart = -1

  for (let i = start + marker.length; i < text.length; i++) {
    const ch = text[i]
    if (ch === undefined) break
    if (ch === '{') {
      if (depth === 0) objStart = i
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0 && objStart !== -1) {
        try {
          return JSON.parse(text.slice(objStart, i + 1)) as Synthesis
        } catch {
          return null
        }
      }
    }
  }

  return null
}

export default function StreamingResult({
  streamedText,
  isStreaming,
  shareToken,
  onReset,
}: StreamingResultProps) {
  const [parsedFrameworks, setParsedFrameworks] = useState<Framework[]>([])
  const [synthesis, setSynthesis] = useState<Synthesis | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Derive parsed state from raw streamed text
  useEffect(() => {
    if (!streamedText) return
    setParsedFrameworks(parseFrameworks(streamedText))
    setSynthesis(parseSynthesis(streamedText))
  }, [streamedText])

  // When streaming stops with text but no synthesis, try a full parse as fallback
  useEffect(() => {
    if (isStreaming || !streamedText) return
    if (!synthesis) {
      try {
        const full = JSON.parse(streamedText) as AnalysisResult
        if (full.frameworks) setParsedFrameworks(full.frameworks)
        if (full.synthesis) setSynthesis(full.synthesis)
      } catch {
        if (!parsedFrameworks.length) {
          setError('Analysis result could not be parsed — please try again.')
        }
      }
    }
  }, [isStreaming, streamedText, synthesis, parsedFrameworks.length])

  // Fire install prompt event when analysis fully completes
  useEffect(() => {
    if (!isStreaming && synthesis !== null) {
      window.dispatchEvent(new Event('analysis:complete'))
    }
  }, [isStreaming, synthesis])

  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-red-950 border border-red-800 rounded-xl text-red-300 text-sm">
          {error}
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    )
  }

  const allFrameworksDone = parsedFrameworks.length === 8
  const showSynthesis = !isStreaming && synthesis !== null
  const showShareAndUpgrade = !isStreaming && allFrameworksDone && synthesis !== null

  return (
    <div className="space-y-6">
      {/* 8 framework cards — skeletons become real as data arrives */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Expert Framework Breakdown
          </h3>
          {!isStreaming && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              New Analysis
            </button>
          )}
        </div>

        <div className="space-y-2">
          {EXPERT_ORDER.map((expertName) => {
            const framework = parsedFrameworks.find((f) => f.name === expertName)
            const color = EXPERT_COLORS[expertName] ?? '#6B7280'

            if (!framework) {
              // Skeleton card — waiting for this framework's data
              return (
                <FrameworkCard
                  key={expertName}
                  name={expertName}
                  focus=""
                  insight=""
                  improvements={[]}
                  metric=""
                  color={color}
                  isStreaming
                />
              )
            }

            return (
              <FrameworkCard
                key={expertName}
                name={framework.name}
                focus={framework.focus}
                insight={framework.insight}
                improvements={framework.improvements}
                metric={framework.metric}
                color={color}
              />
            )
          })}
        </div>
      </div>

      {/* Synthesis — appears after all 8 frameworks are done */}
      {showSynthesis && synthesis && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Integrated Strategy
          </h3>

          <p className="text-sm text-white leading-relaxed">{synthesis.overview}</p>

          {synthesis.immediateActions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Immediate Actions
              </p>
              <ol className="space-y-2">
                {synthesis.immediateActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-orange-500 font-mono font-bold shrink-0">{i + 1}.</span>
                    {action}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {synthesis.executiveSummary && (
            <div className="border-l-4 border-orange-600 pl-4">
              <p className="text-sm text-gray-300 italic leading-relaxed">
                {synthesis.executiveSummary}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Share + Upgrade — visible after analysis fully renders */}
      {showShareAndUpgrade && (
        <>
          {shareToken && <ShareCard shareToken={shareToken} />}
          <UpgradeModal />
        </>
      )}
    </div>
  )
}
