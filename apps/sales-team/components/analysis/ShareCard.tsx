'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface ShareCardProps {
  shareToken: string
}

const SHARE_TEXT =
  "I just ran my offer through 8 expert frameworks. Here's what Hormozi, GaryVee, and Cardone revealed →"

export default function ShareCard({ shareToken }: ShareCardProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/share/${shareToken}`
      : `/share/${shareToken}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback: select + execCommand
      const el = document.createElement('textarea')
      el.value = shareUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Share Your Analysis
        </p>
        <p className="text-xs text-gray-400 font-mono truncate">{shareUrl}</p>
      </div>

      <button
        onClick={handleCopy}
        className="flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-lg transition-colors w-full justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white min-h-[44px]"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-green-400 shrink-0" />
            <span className="text-green-400">Copied!</span>
          </>
        ) : (
          <>
            <Copy className="w-4 h-4 shrink-0" />
            <span>Copy Link</span>
          </>
        )}
      </button>

      <div className="pt-1 border-t border-gray-800">
        <p className="text-xs text-gray-600 leading-relaxed italic">{SHARE_TEXT}</p>
      </div>
    </div>
  )
}
