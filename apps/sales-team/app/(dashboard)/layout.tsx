import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import BottomNav from '@/components/mobile/BottomNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-64 bg-gray-900 border-r border-gray-800 p-6 shrink-0">
        <div className="mb-8">
          <h1 className="text-lg font-bold text-white">$100M Sales Team</h1>
          <p className="text-xs text-gray-500 mt-1">{session.user.email}</p>
        </div>

        <nav className="space-y-1 flex-1">
          <a
            href="/dashboard/analyze"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm"
          >
            Analyze
          </a>
          <a
            href="/dashboard/history"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm"
          >
            History
          </a>
          <a
            href="/dashboard/playbooks"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm"
          >
            Playbooks
          </a>
          <a
            href="/dashboard/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors text-sm"
          >
            Settings
          </a>
        </nav>

        <div className="pt-4 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            Tier: <span className="text-gray-300">{session.user.tier}</span>
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  )
}
