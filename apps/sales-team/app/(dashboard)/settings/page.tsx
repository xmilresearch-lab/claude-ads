import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ReferralSection from '@/components/settings/ReferralSection'
import BillingSection from '@/components/settings/BillingSection'

export const metadata = { title: 'Settings — $100M Sales Team' }

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { user } = session

  // Fetch referral stats and subscription in parallel
  const [dbUser, referrals, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: { referralCode: true, email: true, name: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { referredById: user.id },
      select: { tier: true },
    }),
    prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { tier: true, status: true, currentPeriodEnd: true, cancelAtPeriodEnd: true },
    }),
  ])

  const referralCode = dbUser?.referralCode ?? ''
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const referralLink = `${baseUrl}/r/${referralCode}`
  const totalReferrals = referrals.length
  const paidReferrals = referrals.filter((r) => r.tier !== 'FREE').length
  const estimatedEarnings = paidReferrals * 149 * 0.3

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Account, billing, and referrals</p>
      </div>

      {/* Account */}
      <section className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Account</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-sm text-gray-400">Email</span>
            <span className="text-sm text-white">{dbUser?.email ?? user.email}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-sm text-gray-400">Name</span>
            <span className="text-sm text-white">{dbUser?.name ?? user.name ?? '—'}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-800">
            <span className="text-sm text-gray-400">Plan</span>
            <span className="text-sm font-medium text-orange-400">{user.tier}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-gray-400">Analyses used</span>
            <span className="text-sm text-white">{user.analysisCount}</span>
          </div>
        </div>
      </section>

      {/* Billing */}
      <BillingSection
        tier={user.tier}
        subscription={subscription ?? null}
      />

      {/* Referral */}
      <ReferralSection
        referralLink={referralLink}
        referralCode={referralCode}
        totalReferrals={totalReferrals}
        paidReferrals={paidReferrals}
        estimatedEarnings={estimatedEarnings}
      />
    </div>
  )
}
