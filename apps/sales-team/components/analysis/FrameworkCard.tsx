'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FrameworkCardProps {
  name: string
  focus: string
  insight: string
  improvements: string[]
  metric: string
  color: string
  isStreaming?: boolean
}

export default function FrameworkCard({
  name,
  focus,
  insight,
  improvements,
  metric,
  color,
  isStreaming,
}: FrameworkCardProps) {
  const [open, setOpen] = useState(false)

  if (isStreaming) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse"
            style={{ backgroundColor: color }}
          />
          <div className="flex-1 space-y-2 animate-pulse">
            <div className="h-3.5 bg-gray-800 rounded w-24" />
            <div className="h-3 bg-gray-800 rounded w-48" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
          <div>
            <p className="text-sm font-semibold text-white">{name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{focus}</p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-800 pt-4 space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">{insight}</p>

          {improvements.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Action Steps
              </p>
              <ul className="space-y-2">
                {improvements.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-orange-500 mt-0.5 shrink-0 font-bold">→</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            style={{ backgroundColor: `${color}18` }}
          >
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Key Metric:
            </span>
            <span className="text-xs font-medium" style={{ color }}>
              {metric}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
