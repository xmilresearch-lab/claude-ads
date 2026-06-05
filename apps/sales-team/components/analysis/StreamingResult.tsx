'use client'

import { useState } from 'react'
import { analysisResultSchema, type AnalysisResult } from '@/lib/schemas'
import FrameworkCard from './FrameworkCard'
import ShareCard from './ShareCard'
import UpgradeModal from '@/components/billing/UpgradeModal'

interface StreamingResultProps {
  result: AnalysisResult
  shareToken: string
  showUpgrade?: boolean
}

export default function StreamingResult({ result, shareToken, showUpgrade }: StreamingResultProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(showUpgrade ?? false)

  const parsed = analysisResultSchema.safeParse(result)
  if (!parsed.success) {
    return (
      <div className="p-4 bg-red-950 border border-red-800 rounded-xl text-red-300 text-sm">
        Analysis result could not be parsed. Please try again.
      </div>
    )
  }

  const { frameworks, synthesis } = parsed.data

  return (
    <>
      {upgradeOpen && <UpgradeModal onClose={() => setUpgradeOpen(false)} />}

      <div className="space-y-6">
        {/* Synthesis overview */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Integrated Strategy
            </h3>
            <ShareCard shareToken={shareToken} />
          </div>
          <p className="text-white text-sm leading-relaxed mb-4">{synthesis.overview}</p>

          {synthesis.immediateActions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Top Immediate Actions
              </p>
              <ol className="space-y-1.5">
                {synthesis.immediateActions.map((action, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-blue-400 font-mono shrink-0">{i + 1}.</span>
                    {action}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {synthesis.executiveSummary && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Executive Summary
              </p>
              <p className="text-sm text-gray-400 italic">{synthesis.executiveSummary}</p>
            </div>
          )}
        </div>

        {/* 8 Framework cards */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Expert Framework Breakdown
          </h3>
          <div className="space-y-2">
            {frameworks.map((framework, i) => (
              <FrameworkCard key={framework.name} framework={framework} index={i} />
            ))}
          </div>
        </div>

        {/* Brunson OTO — upgrade shown after free analysis completes */}
        {showUpgrade && (
          <div className="bg-gradient-to-r from-blue-950 to-gray-900 border border-blue-800/50 rounded-xl p-5">
            <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
              You&apos;ve hit your daily limit
            </p>
            <h3 className="text-lg font-bold text-white mb-2">
              Unlock unlimited strategies
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Get unlimited analyses, AI coaching access, and exportable playbooks.
            </p>
            <button
              onClick={() => setUpgradeOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
            >
              See Plans &amp; Pricing
            </button>
          </div>
        )}
      </div>
    </>
  )
}
