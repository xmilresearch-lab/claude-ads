// SERVER-ONLY — never import from client components
import stripe from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { writeAuditLog } from '@/lib/audit'

const REFERRAL_COUPON_ID = 'referral-30pct-12mo'

async function getOrCreateReferralCoupon(): Promise<string> {
  try {
    await stripe.coupons.retrieve(REFERRAL_COUPON_ID)
    return REFERRAL_COUPON_ID
  } catch {
    await stripe.coupons.create({
      id: REFERRAL_COUPON_ID,
      percent_off: 30,
      duration: 'repeating',
      duration_in_months: 12,
      name: 'Referral reward — 30% off for 12 months',
    })
    return REFERRAL_COUPON_ID
  }
}

export async function processReferralCommission(
  referrerId: string,
  referreeId: string
): Promise<void> {
  const referrer = await prisma.user.findUnique({
    where: { id: referrerId },
    select: { stripeCustomerId: true, subscription: { select: { stripeSubscriptionId: true } } },
  })

  if (!referrer?.subscription?.stripeSubscriptionId) {
    // Referrer is not yet a paid subscriber — nothing to apply yet
    await writeAuditLog({
      userId: referrerId,
      action: 'REFERRAL_COMMISSION_PENDING',
      metadata: { referreeId, reason: 'referrer_not_subscribed' },
    })
    return
  }

  const couponId = await getOrCreateReferralCoupon()

  await stripe.subscriptions.update(referrer.subscription.stripeSubscriptionId, {
    discounts: [{ coupon: couponId }],
  })

  await writeAuditLog({
    userId: referrerId,
    action: 'REFERRAL_COMMISSION_APPLIED',
    metadata: { referreeId, couponId, discount: '30% for 12 months' },
  })
}
