'use client'

import { useState } from 'react'
import { Copy, Check, Users, DollarSign } from 'lucide-react'

interface Props {
  referralLink: string
  referralCode: string
  totalReferrals: number
  paidReferrals: number
  estimatedEarnings: number
}

function CopyLinkButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const el = document.createElement('textarea')
      el.value = text
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
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white transition-colors shrink-0"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function CopyMessageButton({ referralLink }: { referralLink: string }) {
  const [copied, setCopied] = useState(false)

  const message = `I've been using $100M AI Sales Team to analyze my offers through 8 expert frameworks (Hormozi, GaryVee, Cardone + 5 more). Here's my link: ${referralLink}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(message)
    } catch {
      const el = document.createElement('textarea')
      el.value = message
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
      className="text-sm text-orange-400 hover:text-orange-300 transition-colors underline underline-offset-2"
    >
      {copied ? 'Message copied!' : 'Copy shareable message'}
    </button>
  )
}

export default function ReferralSection({
  referralLink,
  referralCode,
  totalReferrals,
  paidReferrals,
  estimatedEarnings,
}: Props) {
  return (
    <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1">Referrals</h2>
      <p className="text-xs text-gray-600 mb-5">
        Earn 30% recurring commission for 12 months on every paid referral.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-gray-500" />
          </div>
          <p className="text-xl font-bold text-white">{totalReferrals}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total referred</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <p className="text-xl font-bold text-white">{paidReferrals}</p>
          <p className="text-xs text-gray-500 mt-0.5">Converted</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <DollarSign className="w-3.5 h-3.5 text-green-500" />
          </div>
          <p className="text-xl font-bold text-white">
            ${estimatedEarnings.toFixed(0)}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Est. earnings/mo</p>
        </div>
      </div>

      {/* Referral link */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Your referral link</p>
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
          <span className="flex-1 text-sm text-gray-300 truncate font-mono">{referralLink}</span>
          <CopyLinkButton text={referralLink} />
        </div>
      </div>

      {/* Shareable message */}
      <CopyMessageButton referralLink={referralLink} />

      {referralCode && (
        <p className="text-xs text-gray-700 mt-3">Code: <span className="font-mono">{referralCode}</span></p>
      )}
    </section>
  )
}
