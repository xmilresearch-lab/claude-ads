import { Resend } from 'resend'
import { render } from '@react-email/components'
import WelcomeEmail from '@/emails/WelcomeEmail'
import FrameworkSpotlightEmail from '@/emails/FrameworkSpotlightEmail'
import CaseStudyEmail from '@/emails/CaseStudyEmail'
import UpgradeNudgeEmail from '@/emails/UpgradeNudgeEmail'
import FinalNudgeEmail from '@/emails/FinalNudgeEmail'

// SERVER-ONLY — never import from client components
// Lazy Resend client — instantiated on first call, not at module load
function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? '')
}
const FROM = process.env.RESEND_FROM_EMAIL ?? 'team@salestea.ai'
const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

export type EmailStep = 0 | 1 | 3 | 5 | 7

interface EmailPayload {
  userId: string
  email: string
  name?: string
  analysisCount?: number
  step: EmailStep
}

// Conditional spread for optional name prop — required by exactOptionalPropertyTypes
function withName(name: string | undefined) {
  return name !== undefined ? { name } : {}
}

export async function sendSequenceEmail(payload: EmailPayload) {
  const { email, name, analysisCount = 0, step } = payload
  const analysisUrl = `${BASE_URL}/dashboard/analyze`
  const upgradeUrl = `${BASE_URL}/pricing`

  let subject: string
  let html: string

  switch (step) {
    case 0:
      subject = "Your $100M Sales Team is ready — here's exactly what to do first"
      html = await render(WelcomeEmail({ ...withName(name), analysisUrl }))
      break
    case 1:
      subject = 'Why your offer is losing deals — and the Hormozi diagnosis that fixes it'
      html = await render(FrameworkSpotlightEmail({ ...withName(name), analysisUrl }))
      break
    case 3:
      subject = 'From 2 sales/month to 18 — the 8-framework plan that made the difference'
      html = await render(CaseStudyEmail({ ...withName(name), analysisUrl }))
      break
    case 5: {
      const remaining = 3 - analysisCount
      subject =
        remaining > 0
          ? `${remaining} free ${remaining === 1 ? 'analysis' : 'analyses'} left — here's what Pro unlocks`
          : "You've used all 3 free analyses — here's what Pro unlocks"
      html = await render(UpgradeNudgeEmail({ ...withName(name), analysisCount, upgradeUrl }))
      break
    }
    case 7:
      subject = 'One thing that will change your conversion rate this week (takes 90 seconds)'
      html = await render(FinalNudgeEmail({ ...withName(name), analysisUrl }))
      break
    default: {
      const exhaustive: never = step
      throw new Error(`Unknown email step: ${exhaustive as string}`)
    }
  }

  const { error } = await getResend().emails.send({ from: FROM, to: email, subject, html })
  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`)
}
