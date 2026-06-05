'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/dashboard/analyze', label: 'Analyze' },
  { href: '/dashboard/history', label: 'History' },
  { href: '/dashboard/playbooks', label: 'Playbooks' },
  { href: '/dashboard/settings', label: 'Settings' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex-1 py-3 text-center text-xs font-medium transition-colors ${
            pathname === item.href
              ? 'text-blue-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  )
}
