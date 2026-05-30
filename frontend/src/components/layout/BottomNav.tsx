'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart2,
  GitBranch,
  LayoutGrid,
  Settings,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const NAV_ITEMS = [
  { href: '/automations', label: 'Automations', icon: GitBranch },
  { href: '/content', label: 'Content', icon: FileText },
  { href: '/integrations', label: 'Integrations', icon: LayoutGrid },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 md:hidden z-30 h-16
        bg-bg-elevated border-t border-border backdrop-blur-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-full">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-0.5
                min-h-[44px] min-w-[44px] transition-colors',
                active ? 'text-amber' : 'text-text-muted hover:text-text-secondary',
              )}
            >
              <Icon size={20} strokeWidth={active ? 2 : 1.5} />
              <span
                className={cn(
                  'text-[10px] font-sans tracking-wide uppercase',
                  active ? 'text-amber' : 'text-text-muted',
                )}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
