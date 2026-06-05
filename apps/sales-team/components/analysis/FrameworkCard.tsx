'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FrameworkData {
  name: string
  focus: string
  insight: string
  improvements: string[]
  metric: string
}

interface FrameworkCardProps {
  framework: FrameworkData
  index: number
}

export default function FrameworkCard({ framework, index }: FrameworkCardProps) {
  const [open, setOpen] = useState(index === 0)

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-500 w-5">{index + 1}</span>
          <div>
            <p className="text-sm font-semibold text-white">{framework.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{framework.focus}</p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-800 pt-4 space-y-4">
          <p className="text-sm text-gray-300 leading-relaxed">{framework.insight}</p>

          {framework.improvements.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Action Steps
              </p>
              <ul className="space-y-1.5">
                {framework.improvements.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-blue-400 mt-0.5 shrink-0">→</span>
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Key Metric:
            </span>
            <span className="text-xs text-blue-400 font-medium">{framework.metric}</span>
          </div>
        </div>
      )}
    </div>
  )
}
