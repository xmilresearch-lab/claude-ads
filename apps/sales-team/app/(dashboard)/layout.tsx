import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import BottomNav from '@/components/mobile/BottomNav'
import Link from 'next/link'
import { BarChart2, Clock, BookOpen, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard/analyze', label: 'Analyze', Icon: BarChart2 },
  { href: '/dashboard/history', label: 'History', Icon: Clock },
  { href: '/dashboard/playbooks', label: 'Playbooks', Icon: BookOpen },
  { href: '/dashboard/settings', label: 'Settings', Icon: Settings },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-900 border-r border-gray-800 p-6 shrink-0">
        <div className="mb-8">
          <h1 className="text-lg font-bold text-white">$100M Sales Team</h1>
          <p className="text-xs text-gray-500 mt-1 truncate">{session.user.email}</p>
        </div>

        <nav className="space-y-1 flex-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm"
            >
              <Icon size={16} strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            Tier: <span className="text-gray-300 font-medium">{session.user.tier}</span>
          </p>
        </div>
      </aside>

      {/* Main content — bottom padding on mobile accounts for nav + safe area */}
      <main className="flex-1 flex flex-col min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
