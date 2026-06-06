'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface ShareCardProps {
  shareToken: string
}

const SHARE_TEXT =
  "I just analyzed my offer through 8 expert frameworks (Hormozi, GaryVee, Cardone + 5 more). Here's what they found:"

function LinkedInIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export default function ShareCard({ shareToken }: ShareCardProps) {
  const [copied, setCopied] = useState(false)

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/share/${shareToken}`
      : `/share/${shareToken}`

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
    } catch {
      const el = document.createElement('textarea')
      el.value = shareUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleLinkedIn() {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500')
  }

  function handleTwitter() {
    const text = `${SHARE_TEXT} ${shareUrl}`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer,width=600,height=500')
  }

  const ogImageUrl = `/api/og/${shareToken}`

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* OG image preview */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ogImageUrl}
        alt="Analysis card preview"
        className="w-full object-cover bg-gray-800"
        style={{ aspectRatio: '1200/630' }}
        loading="lazy"
      />

      <div className="p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Share Your Analysis
          </p>
          <p className="text-xs text-gray-500 font-mono truncate">{shareUrl}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* Copy Link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 text-sm font-medium px-4 py-3 rounded-lg transition-colors flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white min-h-[44px]"
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

          {/* LinkedIn */}
          <button
            onClick={handleLinkedIn}
            className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 rounded-lg transition-all flex-1 min-h-[44px] bg-[#0A66C2] hover:bg-[#004182] text-white"
          >
            <LinkedInIcon />
            <span>LinkedIn</span>
          </button>

          {/* Twitter / X */}
          <button
            onClick={handleTwitter}
            className="flex items-center justify-center gap-2 text-sm font-semibold px-4 py-3 rounded-lg transition-all flex-1 min-h-[44px] bg-black hover:bg-zinc-900 text-white border border-zinc-700"
          >
            <XIcon />
            <span>Post on X</span>
          </button>
        </div>
      </div>
    </div>
  )
}
