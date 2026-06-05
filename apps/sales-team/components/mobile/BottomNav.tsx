'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart2, Clock, BookOpen, MessageSquare, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard/analyze', label: 'Analyze', Icon: BarChart2 },
  { href: '/dashboard/history', label: 'History', Icon: Clock },
  { href: '/dashboard/playbooks', label: 'Playbooks', Icon: BookOpen },
  { href: '/dashboard/assistant', label: 'Coach', Icon: MessageSquare },
  { href: '/dashboard/settings', label: 'Settings', Icon: Settings },
]

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10)
  }
}

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-white border-t border-gray-200 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            onClick={haptic}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              active ? 'text-orange-600' : 'text-gray-400'
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
