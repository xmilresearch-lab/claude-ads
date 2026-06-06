'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Check, ExternalLink } from 'lucide-react'

export interface HistoryItem {
  id: string
  offerText: string
  analysisType: string
  shareToken: string
  createdAt: string
  executiveSummary: string
}

function CopyButton({ shareToken }: { shareToken: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const url = `${window.location.origin}/share/${shareToken}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-800"
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-green-400" />
          <span className="text-green-400">Copied</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>Share</span>
        </>
      )}
    </button>
  )
}

// 5 skeleton cards for loading state
function SkeletonCards() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 bg-gray-800 rounded-full w-16" />
            <div className="h-3 bg-gray-800 rounded w-20" />
          </div>
          <div className="h-4 bg-gray-800 rounded w-3/4 mb-1" />
          <div className="h-3 bg-gray-800 rounded w-1/2" />
        </div>
      ))}
    </div>
  )
}

interface HistoryListProps {
  analyses: HistoryItem[]
  searchQuery: string
}

export default function HistoryList({ analyses, searchQuery }: HistoryListProps) {
  if (analyses.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500 text-sm mb-3">
          {searchQuery
            ? `No analyses matching "${searchQuery}"`
            : 'Run your first analysis — it takes 90 seconds'}
        </p>
        <Link href="/dashboard/analyze" className="text-orange-400 hover:underline text-sm">
          Analyze My Offer →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {analyses.map((analysis) => (
        <div
          key={analysis.id}
          className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xs font-medium text-orange-400 capitalize bg-orange-950/60 px-2 py-0.5 rounded-full">
                  {analysis.analysisType}
                </span>
                <span className="text-xs text-gray-600">
                  {new Date(analysis.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <p className="text-sm text-gray-300 line-clamp-2">
                {analysis.offerText.slice(0, 100)}
                {analysis.offerText.length > 100 ? '…' : ''}
              </p>
              {analysis.executiveSummary && (
                <p className="text-xs text-gray-500 mt-1.5 line-clamp-1 italic">
                  {analysis.executiveSummary}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1 shrink-0">
              <Link
                href={`/share/${analysis.shareToken}`}
                target="_blank"
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-800"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View</span>
              </Link>
              <CopyButton shareToken={analysis.shareToken} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export { SkeletonCards }
