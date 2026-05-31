import { AiBubble } from '@/components/shared/AiBubble'
import { BottomNav } from '@/components/layout/BottomNav'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { OnboardingBanner } from '@/components/layout/onboarding-banner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DashboardShell>
        {/* pb-16 md:pb-0 prevents content from hiding behind mobile BottomNav */}
        <div className="pb-16 md:pb-0">{children}</div>
      </DashboardShell>
      <OnboardingBanner />
      <BottomNav />
      <AiBubble />
    </>
  )
}
