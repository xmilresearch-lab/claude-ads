import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import BottomNav from '@/components/mobile/BottomNav'
import InstallPrompt from '@/components/pwa/InstallPrompt'
import Link from 'next/link'
import { BarChart2, Clock, BookOpen, MessageSquare, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/dashboard/analyze', label: 'Analyze', Icon: BarChart2 },
  { href: '/dashboard/history', label: 'History', Icon: Clock },
  { href: '/dashboard/playbooks', label: 'Playbooks', Icon: BookOpen },
  { href: '/dashboard/assistant', label: 'Coach', Icon: MessageSquare },
  { href: '/dashboard/settings', label: 'Settings', Icon: Settings },
]

function UserAvatar({ name, image }: { name: string | null | undefined; image: string | null | undefined }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={name ?? 'User'} className="w-7 h-7 rounded-full object-cover" />
  }
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'
  return (
    <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center text-white text-xs font-bold">
      {initials}
    </div>
  )
}

function TierBadge({ tier }: { tier: string }) {
  const colours: Record<string, string> = {
    FREE: 'bg-gray-800 text-gray-400',
    SOLO: 'bg-blue-950 text-blue-400',
    PRO: 'bg-violet-950 text-violet-400',
    AGENCY: 'bg-orange-950 text-orange-400',
    ENTERPRISE: 'bg-amber-950 text-amber-400',
  }
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase ${colours[tier] ?? colours['FREE']}`}>
      {tier}
    </span>
  )
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { user } = session
  const isFree = user.tier === 'FREE'

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-60 bg-gray-900 border-r border-gray-800 p-5 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-7 h-7 bg-orange-600 rounded-md flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">$</span>
          </div>
          <span className="text-white font-semibold text-sm leading-tight">100M Sales Team</span>
        </div>

        {/* Nav */}
        <nav className="space-y-0.5 flex-1">
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors text-sm"
            >
              <Icon size={15} strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Upgrade button — FREE only */}
        {isFree && (
          <Link
            href="/pricing"
            className="block w-full text-center px-4 py-2.5 bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold rounded-lg transition-colors mb-4"
          >
            Unlock unlimited →
          </Link>
        )}

        {/* User footer */}
        <div className="pt-4 border-t border-gray-800 flex items-center gap-2.5">
          <UserAvatar name={user.name} image={user.image} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white font-medium truncate">{user.name ?? user.email}</p>
            <TierBadge tier={user.tier} />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </main>

      <BottomNav />
      <InstallPrompt />
    </div>
  )
}
